const pino = require("pino")
const qrcode = require("qrcode-terminal")
const Jimp = require("jimp")
const fs = require("fs")

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

// Global variables to persist across reconnections
let currentSocket = null
let isStarting = false
const processedMessages = new Set()
const MESSAGE_CACHE_SIZE = 200

async function startBot() {
  // Prevent multiple simultaneous start attempts
  if (isStarting) {
    console.log("⏳ Bot sudah dalam proses start, skip...")
    return
  }
  
  isStarting = true
  try {
    console.log("🔄 Memulai bot...")
    console.log("🌐 BOT SERVER HP - Versi ringan")

    // Cleanup old socket if exists
    if (currentSocket) {
      console.log("🧹 Cleaning up old socket...")
      try {
        currentSocket.ev.removeAllListeners()
        currentSocket.end()
      } catch (e) {
        console.log("⚠️ Error cleaning socket:", e.message)
      }
      currentSocket = null
    }

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
      retryRequestDelayMs: 3000,
      getMessage: async (key) => {
        // Return dummy message to prevent decrypt errors
        return { 
          conversation: "Pesan tidak tersedia" 
        }
      },
      shouldIgnoreJid: (jid) => false,
      syncFullHistory: false
    })
    console.log("✅ Socket created")
    
    // Store current socket globally
    currentSocket = sock

    // Track connection state
    let isConnected = false

    // Handle creds update with error catching
    sock.ev.on("creds.update", async () => {
      try {
        await saveCreds()
      } catch (err) {
        console.error("⚠️ Error saving creds:", err.message)
      }
    })
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
        isStarting = false // Bot sudah selesai starting
      }

      if (connection === "close") {
        isConnected = false
        isStarting = false // Reset flag agar bisa restart
        
        const statusCode = lastDisconnect?.error?.output?.statusCode
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut
        
        console.log("❌ Koneksi terputus:", statusCode)
        
        // Clear socket reference
        if (currentSocket === sock) {
          currentSocket = null
        }
        
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

    // Global error handler for socket
    sock.ev.on("error", (err) => {
      const errorMsg = err.message?.toLowerCase() || ''
      
      if (errorMsg.includes('decrypt') || 
          errorMsg.includes('failed to decrypt') ||
          errorMsg.includes('bad mac') ||
          errorMsg.includes('session')) {
        console.error("⚠️ Socket decrypt error (akan di-skip):", err.message)
        // Don't crash, just log and continue
      } else {
        console.error("❌ Socket error:", err.message)
      }
    })

    // ✅ LISTENER MESSAGES
    sock.ev.on("messages.upsert", async ({ messages }) => {
    try {
      const msg = messages[0]
      if (!msg.message) return
      
      // Skip old messages (older than 5 minutes)
      const messageAge = Date.now() - (msg.messageTimestamp * 1000)
      if (messageAge > 5 * 60 * 1000) {
        console.log("⏭️  Skip: Pesan lama (> 5 menit)")
        return
      }
      
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
      
      // Check if bot is connected before processing
      if (!isConnected) {
        console.log("⏭️  Skip: Bot tidak terhubung")
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
├─ *UTILITY*
│ • .open
│   Buka foto/video view once
│   (Reply pesan view once)
│
└─ *CREATIVE*
  • .brat <teks>
    Bikin gambar aesthetic brat
    (contoh: .brat summer)

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

    // ===== BRAT =====
    if (text.toLowerCase().startsWith(".brat")) {
      if (!isConnected) {
        return sock.sendMessage(from, {
          text: "❌ Bot sedang tidak terhubung. Tunggu sebentar..."
        }).catch(() => console.log("⚠️ Tidak bisa kirim pesan, bot disconnect"))
      }
      
      try {
        // Get text after .brat
        const bratText = text.slice(5).trim()
        
        if (!bratText) {
          return sock.sendMessage(from, {
            text: "❌ Kasih teks dong!\n\nContoh:\n.brat summer\n.brat club classics\n.brat 365"
          })
        }
        
        await sock.sendMessage(from, { text: "🎨 Bikin gambar brat..." })
        
        console.log("🎨 Creating brat image with text:", bratText)
        
        // Brat aesthetic colors
        const bratGreen = 0x8ACE00FF // #8ACE00 - iconic brat lime green
        
        // Create image 800x800
        const image = new Jimp(800, 800, bratGreen)
        
        // Load font - use built-in font
        const font = await Jimp.loadFont(Jimp.FONT_SANS_128_BLACK)
        
        // Add text in center (lowercase for brat aesthetic)
        const finalText = bratText.toLowerCase()
        
        // Calculate text position to center it
        const textWidth = Jimp.measureText(font, finalText)
        const textHeight = Jimp.measureTextHeight(font, finalText, 700)
        
        const x = (800 - textWidth) / 2
        const y = (800 - textHeight) / 2
        
        // Print text on image
        image.print(
          font,
          x,
          y,
          {
            text: finalText,
            alignmentX: Jimp.HORIZONTAL_ALIGN_CENTER,
            alignmentY: Jimp.VERTICAL_ALIGN_MIDDLE
          },
          700,
          700
        )
        
        // Save to buffer
        const buffer = await image.getBufferAsync(Jimp.MIME_PNG)
        
        console.log("✅ Brat image created:", buffer.length, "bytes")
        
        if (!isConnected) {
          console.log("❌ Bot disconnect setelah buat gambar")
          return
        }
        
        // Send image
        await sock.sendMessage(from, {
          image: buffer,
          caption: `🟢 *brat* by ${bratText}`
        })
        
        console.log("✅ Brat image sent!")
        
      } catch (err) {
        console.error("❌ ERROR BRAT:", err.message)
        console.error("Stack:", err.stack)
        
        if (isConnected) {
          sock.sendMessage(from, {
            text: `❌ Gagal bikin gambar brat: ${err.message}`
          }).catch(e => {
            console.log("⚠️ Gagal kirim error message:", e.message)
          })
        }
      }
    }
    } catch (err) {
      // Handle session errors (Bad MAC, decrypt errors, etc) without crashing
      const errorMsg = err.message?.toLowerCase() || ''
      
      if (errorMsg.includes('bad mac') || 
          errorMsg.includes('decrypt') || 
          errorMsg.includes('failed to decrypt') ||
          errorMsg.includes('etimedout') ||
          errorMsg.includes('session')) {
        console.error("⚠️ Session/Network error - Skip pesan:", err.message)
        // Don't process this message, just continue
      } else {
        console.error("❌ ERROR messages.upsert:", err.message)
      }
    }
    })
    console.log("✅ Messages listener registered")
    console.log("✅ Bot siap!")
    
    isStarting = false // Mark as finished starting
  
  } catch (error) {
    isStarting = false // Reset flag on error
    
    console.error("❌ ERROR FATAL:", error)
    console.error("Stack trace:", error.stack)
    
    // Handle specific errors
    if (error.message?.includes('Cannot find module') || error.message?.includes('ENOENT')) {
      console.log("❌ File/module tidak ditemukan. Pastikan semua dependencies terinstall.")
      console.log("Jalankan: npm install")
      return
    }
    
    if (error.message?.includes('ECONNREFUSED') || error.message?.includes('ETIMEDOUT')) {
      console.log("⚠️ Masalah koneksi internet. Cek koneksi kamu.")
    }
    
    console.log("🔄 Retry dalam 10 detik...")
    setTimeout(() => startBot(), 10000)
  }
}

// WAJIB ADA
process.on('uncaughtException', (err) => {
  const errorMsg = err.message?.toLowerCase() || ''
  console.error('💥 Uncaught Exception:', err.message)
  
  // Handle specific errors that should not cause restart
  if (errorMsg.includes('bad mac') || 
      errorMsg.includes('decrypt') || 
      errorMsg.includes('failed to decrypt') ||
      errorMsg.includes('session')) {
    console.log("⚠️ Session error detected, bot akan continue...")
    return // Don't restart for session errors
  }
  
  if (!isStarting) {
    console.log("🔄 Mencoba restart...")
    setTimeout(() => startBot(), 10000)
  }
})

process.on('unhandledRejection', (reason, promise) => {
  const errorMsg = (reason?.message || String(reason)).toLowerCase()
  console.error('💥 Unhandled Rejection:', reason?.message || String(reason))
  
  // Handle specific errors that should not cause restart
  if (errorMsg.includes('bad mac') || 
      errorMsg.includes('decrypt') || 
      errorMsg.includes('failed to decrypt') ||
      errorMsg.includes('etimedout') ||
      errorMsg.includes('session')) {
    console.log("⚠️ Session/Network error, bot tetap berjalan...")
    return // Don't restart
  }
  
  console.log("🔄 Bot akan tetap berjalan...")
})

startBot()
