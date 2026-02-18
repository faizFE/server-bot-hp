# 📱 PANDUAN LENGKAP SETUP BOT DI TERMUX

Panduan ini untuk setup WhatsApp Bot dari NOL di HP Android pakai Termux.

---

## 📋 LANGKAH 1: INSTALL TERMUX

1. Download Termux dari **F-Droid** (bukan Play Store!)
   - Link: https://f-droid.org/en/packages/com.termux/
   - Atau: https://github.com/termux/termux-app/releases
   
2. Install Termux
3. Buka aplikasi Termux

---

## 🔧 LANGKAH 2: SETUP DASAR TERMUX

```bash
# 1. Update dan upgrade Termux (WAJIB!)
# Tekan Y atau Enter kalau ada pertanyaan
pkg update && pkg upgrade -y

# 2. Install Git
pkg install git -y

# 3. Install Node.js dan npm
pkg install nodejs -y

# 4. Cek versi (pastikan terinstall)
node --version
npm --version
git --version
```

**Output yang diharapkan:**
- node: v18.x.x atau v20.x.x
- npm: 9.x.x atau 10.x.x
- git: 2.x.x

---

## 📥 LANGKAH 3: CLONE BOT DARI GITHUB

```bash
# 1. Clone repository bot
git clone https://github.com/faizFE/server-bot-hp.git

# 2. Masuk ke folder bot
cd server-bot-hp

# 3. Lihat isi folder (optional, buat mastiin)
ls -la
```

**Folder yang ada:**
- index.js
- package.json
- README.md
- .gitignore

---

## 📦 LANGKAH 4: INSTALL DEPENDENCIES

```bash
# Install semua library yang dibutuhkan
# Ini akan download ~50-100MB, sabar ya!
npm install
```

**Tunggu sampai selesai!** Biasanya 2-5 menit tergantung internet.

---

## 🚀 LANGKAH 5: JALANKAN BOT

```bash
# Cara 1: Jalankan langsung (testing)
npm start
```

**Akan muncul QR CODE!** Lanjut ke langkah 6.

---

## 📱 LANGKAH 6: SCAN QR CODE

1. **QR Code muncul di layar Termux**
2. Buka **WhatsApp** di HP kamu
3. Tap **Menu (⋮)** → **Linked Devices** / **Perangkat Tertaut**
4. Tap **Link a Device** / **Tautkan Perangkat**
5. **Scan QR Code** yang ada di Termux

**Tunggu beberapa detik...**

Kalau berhasil, akan muncul:
```
✅ BOT TERHUBUNG!
✅ Bot siap!
```

---

## ✅ LANGKAH 7: TES BOT

Dari HP lain atau nomor lain, kirim pesan ke nomor bot:

```
.menu
```

Kalau bot balas dengan list menu, **BERHASIL!** 🎉

---

## 🔋 LANGKAH 8: JALANKAN BOT 24/7 (BACKGROUND)

### **A. Install PM2 (Recommended)**

```bash
# 1. Stop bot dulu (Ctrl + C)

# 2. Install PM2 globally
npm install -g pm2

# 3. Jalankan bot dengan PM2
pm2 start index.js --name "wa-bot"

# 4. Save supaya auto-start
pm2 save

# 5. Setup startup
pm2 startup
```

### **B. Install Termux Wake Lock**

```bash
# 1. Install Termux:API dari F-Droid
# Link: https://f-droid.org/en/packages/com.termux.api/

# 2. Install package termux-api
pkg install termux-api -y

# 3. Aktifkan wake lock
termux-wake-lock

# 4. Jalankan bot (atau pakai PM2 sekalian)
pm2 start index.js --name "wa-bot"
pm2 save
```

---

## ⚙️ LANGKAH 9: SETTING HP SAMSUNG A73

### **A. Battery Optimization OFF**
```
Settings → Apps → Termux
→ Battery → Unrestricted
→ Allow background activity: ON
```

### **B. Never Sleeping Apps**
```
Settings → Battery and device care → Battery
→ Background usage limits
→ Never sleeping apps → Tambah "Termux"
```

### **C. Lock di Recent Apps**
```
1. Buka Recent Apps (tombol kotak)
2. Tap icon Termux di atas
3. Tap icon "Lock" (gembok)
```

### **D. Remove dari Sleeping Apps**
```
Settings → Battery and device care → Battery
→ Background usage limits
→ Sleeping apps / Deep sleeping apps
→ Pastikan Termux TIDAK ada di list
```

---

## 📊 PERINTAH BERGUNA

### **Kontrol Bot dengan PM2:**
```bash
pm2 status           # Cek status bot
pm2 logs wa-bot      # Lihat log bot
pm2 restart wa-bot   # Restart bot
pm2 stop wa-bot      # Stop bot
pm2 delete wa-bot    # Hapus bot dari PM2
pm2 list             # Lihat semua proses
```

### **Update Bot (kalau ada update baru):**
```bash
cd server-bot-hp
pm2 stop wa-bot        # Stop bot dulu
git pull origin main   # Download update
npm install            # Install dependency baru (kalau ada)
pm2 restart wa-bot     # Start lagi
```

### **Hapus Session (kalau mau logout/reset):**
```bash
cd server-bot-hp
pm2 stop wa-bot
rm -rf session
pm2 start wa-bot       # Scan QR lagi
```

---

## 🎮 PERINTAH BOT YANG TERSEDIA

Kirim pesan ke bot:

```
.menu          → Tampilkan menu
.ping          → Cek status bot
.brat <teks>   → Buat sticker text brat
.bratvid <teks> → Buat sticker animasi
.open          → Buka view once (reply ke pesan)
```

**Contoh:**
```
.brat hello world
.bratvid aku sayang kamu
```

---

## ❌ TROUBLESHOOTING

### **1. Bot Disconnect / Error 440**
```bash
# Di WhatsApp:
Menu → Linked Devices → Logout/Hapus SEMUA device
# Lalu di Termux:
rm -rf session
pm2 restart wa-bot
# Scan QR lagi
```

### **2. MAC Error / bad Mac (PENTING!)**
Error ini muncul saat bot coba kirim pesan tapi koneksi bermasalah.

**Solusi:**
```bash
# A. Cek status bot
pm2 logs wa-bot

# B. Restart bot
pm2 restart wa-bot

# C. Kalau masih error, hapus session dan scan QR lagi
cd server-bot-hp
pm2 stop wa-bot
rm -rf session
pm2 start wa-bot
# Scan QR code yang muncul

# D. Pastikan koneksi internet stabil
ping google.com
```

**Penyebab:**
- Session WhatsApp corrupt
- Bot disconnect tapi masih terima pesan
- Koneksi internet tidak stabil
- WhatsApp logout dari Linked Devices

**Pencegahan:**
- Jangan logout WhatsApp dari Linked Devices
- Pastikan internet stabil
- Jangan hapus folder `session`
- Lock Termux di Recent Apps

### **3. npm install error**
```bash
# Clear cache dan install ulang
npm cache clean --force
rm -rf node_modules
npm install
```

### **3. Permission denied**
```bash
# Kasih akses storage
termux-setup-storage
```

### **4. Bot mati saat layar mati**
- Cek semua setting di Langkah 9 sudah diaktifkan
- Pastikan wake lock aktif: `termux-wake-lock`
- Pastikan PM2 jalan: `pm2 status`

### **5. Termux force closed**
```bash
# Buka Termux lagi
cd server-bot-hp
pm2 resurrect   # Restore proses yang mati
# Atau:
pm2 start index.js --name "wa-bot"
```

---

## 🔄 STARTUP ROUTINE (Kalau HP restart)

```bash
# 1. Buka Termux
# 2. Aktifkan wake lock
termux-wake-lock

# 3. Cek PM2
pm2 status

# 4. Kalau bot mati, start lagi
pm2 start wa-bot

# SELESAI! Bot jalan lagi
```

---

## 📝 CATATAN PENTING

✅ **Bot butuh internet** untuk jalan (WiFi atau data)
✅ **Battery harus cukup** - Bot konsumsi ~2-5% battery per jam
✅ **Jangan force close Termux** dari Recent Apps
✅ **Session folder jangan dihapus** (berisi login WhatsApp)
✅ **Update bot berkala** dengan `git pull`

---

## 🆘 BANTUAN

Kalau ada masalah:
1. Cek log: `pm2 logs wa-bot`
2. Restart bot: `pm2 restart wa-bot`
3. Cek koneksi internet
4. Cek WhatsApp masih login di Linked Devices

Repository: https://github.com/faizFE/server-bot-hp

---

**Selamat menggunakan bot! 🎉**

Made with ❤️ by Faiz
