const pino = require("pino")
const qrcode = require("qrcode-terminal")

const { 
  default: makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
  downloadMediaMessage
} = require("@whiskeysockets/baileys")

// ====== BOT SERVER HP ======
// Versi ringan tanpa sharp dan canvas
// Support: .menu, .ping, .open

async function startBot() {
  try {
    console.log("🔄 Memulai bot...")
    console.log("🌐 BOT SERVER HP - Versi ringan")

    const { state, saveCreds } = await useMultiFileAuthState("session")
    const { version } = await fetchLatestBaileysVersion()
    console.log("✅ Baileys version loaded")

    const sock = makeWASocket({
      version,
      auth: state,
      logger: pino({ level: "silent" }),
      printQRInTerminal: false,
      syncFullHistory: false,
      markOnlineOnConnect: true,
      defaultQueryTimeoutMs: 60000,
      keepAliveIntervalMs: 30000,
      retryRequestDelayMs: 3000
    })
    console.log("✅ Socket created")

    // Track connection state
    let isConnected = false
    
    // Track processed messages to prevent duplicates
    const processedMessages = new Set()
    const MESSAGE_CACHE_SIZE = 100

    sock.ev.on("creds.update", saveCreds)
    console.log("✅ Creds listener registered")

    sock.ev.on("connection.update", (update) => {
      console.log("📡 Connection update:", JSON.stringify(update))
      const { connection, lastDisconnect, qr } = update

      if (qr) {
        console.log("📱 Scan QR code di bawah ini:")
        qrcode.generate(qr, { small: true })
      }

      if (connection === "open") {
        console.log("✅ BOT TERHUBUNG!")
        isConnected = true
      }

      if (connection === "close") {
        isConnected = false
        const statusCode = lastDisconnect?.error?.output?.statusCode
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut
        
        console.log("❌ Koneksi terputus:", statusCode)
        
        // 440 = conflict (multiple devices), tunggu lebih lama
        if (statusCode === 440) {
          console.log("\n⚠️  CONFLICT ERROR 440 - Ada device lain yang menggunakan session ini!")
          console.log("\n📱 CARA MENGATASI:")
          console.log("1. Buka WhatsApp di HP kamu")
          console.log("2. Masuk ke: Menu (⋮) → Linked Devices / Perangkat Tertaut")
          console.log("3. LOGOUT/HAPUS SEMUA device yang terhubung (Web, Desktop, dll)")
          console.log("4. Setelah bersih, jalankan bot ini lagi\n")
          console.log("⏳ Bot akan coba lagi dalam 15 detik...\n")
          setTimeout(() => startBot(), 15000)
        } else if (shouldReconnect) {
          console.log("🔄 Reconnecting dalam 5 detik...")
          setTimeout(() => startBot(), 5000)
        } else {
          console.log("❌ Session logout. Hapus folder 'session' dan scan ulang QR")
        }
      }
    })
    console.log("✅ Connection listener registered")

    // ✅ LISTENER MESSAGES
    sock.ev.on("messages.upsert", async ({ messages }) => {
    try {
      const msg = messages[0]
      if (!msg.message) return
      
      // Generate unique message ID
      const messageId = msg.key.id
      
      // Check if already processed (prevent duplicates)
      if (processedMessages.has(messageId)) {
        console.log("⏭️  Skip: Already processed", messageId)
        return
      }
      
      // Add to processed cache
      processedMessages.add(messageId)
      
      // Limit cache size
      if (processedMessages.size > MESSAGE_CACHE_SIZE) {
        const firstItem = processedMessages.values().next().value
        processedMessages.delete(firstItem)
      }

      const from = msg.key.remoteJid
      
      // ✅ FILTER: Hanya respond ke private chat (skip grup)
      if (from.endsWith("@g.us")) {
        console.log("⏭️  Skip: Pesan dari grup")
        return
      }
      
      console.log("📩 FROM:", from, "| ID:", messageId)

      const text =
        msg.message?.conversation ||
        msg.message?.extendedTextMessage?.text ||
        msg.message?.imageMessage?.caption ||
        msg.message?.videoMessage?.caption ||
        ""

      if (!text) return

    // ===== MENU =====
    if (text.toLowerCase() === ".menu") {
      try {
        const menuText = `╔══════════════════╗
║  🤖 FAIZ BOT HP  ║
╚══════════════════╝

📝 *DAFTAR PERINTAH:*

┌─ *INFO*
│ • .ping
│   Cek status bot
│
└─ *UTILITY*
  • .open
    Buka foto/video view once
    (Reply pesan view once)

━━━━━━━━━━━━━━━━━
🏃 Bot Server HP
⚡ Versi Stable & Simple
━━━━━━━━━━━━━━━━━`

        await sock.sendMessage(from, { text: menuText })
      } catch (err) {
        console.error("❌ ERROR MENU:", err.message)
        await sock.sendMessage(from, {
          text: "❌ Error loading menu"
        })
      }
    }

    // ===== PING =====
    if (text.toLowerCase() === ".ping") {
      try {
        // Check connection first
        if (!isConnected) {
          console.log("⚠️ Bot not connected, skipping ping")
          return
        }
        
        await sock.sendMessage(from, { 
          text: "✅ Halo aku FaizBot! Ada yang bisa saya bantu?" 
        })
      } catch (err) {
        console.error("❌ ERROR PING:", err.message)
        // Don't send error message to user to avoid loop
      }
    }

    // ===== OPEN (View Once Revealer) =====
    if (text.toLowerCase() === ".open") {
      // Check connection first
      if (!isConnected) {
        return sock.sendMessage(from, {
          text: "❌ Bot sedang tidak terhubung. Tunggu sebentar..."
        }).catch(() => console.log("⚠️ Tidak bisa kirim pesan, bot disconnect"))
      }
      
      try {
        // Check if replying to a message
        const quotedMsg = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage
        
        if (!quotedMsg) {
          return sock.sendMessage(from, {
            text: "❌ Reply foto/video view once dengan .open"
          })
        }

        // DEBUG: Log struktur message yang di-reply
        console.log("🔍 DEBUG quotedMsg keys:", Object.keys(quotedMsg))
        console.log("🔍 DEBUG full quotedMsg:", JSON.stringify(quotedMsg, null, 2))

        // Check if quoted message is view once
        const viewOnceMessage = quotedMsg.viewOnceMessageV2 || quotedMsg.viewOnceMessage
        
        if (!viewOnceMessage) {
          console.log("⚠️ Tidak ada viewOnceMessage di quotedMsg")
          console.log("🔍 Mencoba cek imageMessage/videoMessage langsung...")
          
          // Check if it's a direct image/video message (view once that was already opened)
          const directImage = quotedMsg.imageMessage
          const directVideo = quotedMsg.videoMessage
          
          if (!directImage && !directVideo) {
            return sock.sendMessage(from, {
              text: "❌ Pesan yang di-reply bukan view once atau foto/video"
            })
          }
          
          // Use direct image/video message
          console.log("🔓 Found direct image/video, attempting to open...")
          
          if (!isConnected) {
            console.log("❌ Bot disconnect saat proses")
            return
          }
          
          await sock.sendMessage(from, { text: "🔓 Membuka media..." }).catch(e => {
            console.log("⚠️ Gagal kirim status:", e.message)
          })
          
          const quotedKey = msg.message.extendedTextMessage.contextInfo
          
          const mediaMsg = {
            key: {
              remoteJid: from,
              id: quotedKey.stanzaId,
              participant: quotedKey.participant
            },
            message: quotedMsg
          }
          
          console.log("📥 Downloading media...")
          const buffer = await downloadMediaMessage(mediaMsg, 'buffer', {})
          console.log(`✅ Downloaded ${buffer.length} bytes`)
          
          if (!isConnected) {
            console.log("❌ Bot disconnect setelah download")
            return
          }
          
          if (directImage) {
            await sock.sendMessage(from, {
              image: buffer,
              caption: "🔓 Foto berhasil dibuka!"
            }).catch(e => {
              console.log("❌ Gagal kirim foto:", e.message)
              throw e
            })
          } else {
            await sock.sendMessage(from, {
              video: buffer,
              caption: "🔓 Video berhasil dibuka!"
            }).catch(e => {
              console.log("❌ Gagal kirim video:", e.message)
              throw e
            })
          }
          
          console.log("✅ Media revealed!")
          return
        }

        console.log("🔓 Opening view once message...")
        
        if (!isConnected) {
          console.log("❌ Bot disconnect saat proses")
          return
        }
        
        await sock.sendMessage(from, { text: "🔓 Membuka view once..." }).catch(e => {
          console.log("⚠️ Gagal kirim status:", e.message)
        })

        // Extract actual message
        const actualMessage = viewOnceMessage.message
        const isImage = actualMessage?.imageMessage
        const isVideo = actualMessage?.videoMessage

        if (!isImage && !isVideo) {
          return sock.sendMessage(from, {
            text: "❌ Format tidak didukung"
          }).catch(() => {})
        }

        console.log(`📸 Downloading ${isImage ? 'image' : 'video'}...`)

        // Get quoted message key
        const quotedKey = msg.message.extendedTextMessage.contextInfo

        // Download media
        const mediaMsg = {
          key: {
            remoteJid: from,
            id: quotedKey.stanzaId,
            participant: quotedKey.participant
          },
          message: actualMessage
        }

        console.log("📥 Downloading media...")
        const buffer = await downloadMediaMessage(mediaMsg, 'buffer', {})
        console.log(`✅ Downloaded ${buffer.length} bytes`)

        if (!isConnected) {
          console.log("❌ Bot disconnect setelah download")
          return
        }

        // Send back as normal message
        if (isImage) {
          await sock.sendMessage(from, {
            image: buffer,
            caption: "🔓 Foto view once berhasil dibuka!"
          }).catch(e => {
            console.log("❌ Gagal kirim foto:", e.message)
            throw e
          })
        } else {
          await sock.sendMessage(from, {
            video: buffer,
            caption: "🔓 Video view once berhasil dibuka!"
          }).catch(e => {
            console.log("❌ Gagal kirim video:", e.message)
            throw e
          })
        }

        console.log("✅ View once revealed!")

      } catch (err) {
        console.error("❌ ERROR OPEN:", err.message)
        console.error("Stack:", err.stack)
        
        // Only try to send error message if connected
        if (isConnected) {
          sock.sendMessage(from, {
            text: `❌ Gagal membuka view once: ${err.message}`
          }).catch(e => {
            console.log("⚠️ Gagal kirim error message:", e.message)
          })
        } else {
          console.log("⚠️ Bot tidak terhubung, tidak bisa kirim pesan error")
        }
      }
    }
    } catch (err) {
      // Handle session errors (Bad MAC, etc) without crashing
      if (err.message?.includes('Bad MAC') || err.message?.includes('decrypt')) {
        console.error("⚠️ Session error (Bad MAC) - Pesan dari session lama, skip")
      } else {
        console.error("❌ ERROR messages.upsert:", err.message)
      }
    }
    })
    console.log("✅ Messages listener registered")
    console.log("✅ Bot siap!")
  
  } catch (error) {
    console.error("❌ ERROR FATAL:", error)
    console.error("Stack trace:", error.stack)
    console.log("🔄 Retry dalam 5 detik...")
    setTimeout(() => startBot(), 5000)
  }
}

// WAJIB ADA
process.on('uncaughtException', (err) => {
  console.error('💥 Uncaught Exception:', err)
  console.error('Stack:', err.stack)
  console.log("🔄 Mencoba restart...")
  setTimeout(() => startBot(), 5000)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Unhandled Rejection:', reason)
  console.log("🔄 Bot akan tetap berjalan...")
})

startBot()
