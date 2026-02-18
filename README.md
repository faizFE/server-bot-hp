# 🤖 WhatsApp Bot - Server HP Version

Versi ringan WhatsApp Bot yang dirancang khusus untuk berjalan di server HP/mobile.

## ✨ Fitur yang Tersedia

### 📝 Command List:
- `.menu` - Tampilkan daftar perintah
- `.ping` - Cek status bot
- `.open` - Buka foto/video view once (reply ke pesan view once)

## ❌ Fitur yang Dihapus

Fitur berikut dihapus karena tidak kompatibel dengan server HP:
- `.brat` - Membuat sticker text (butuh canvas & sharp)
- `.bratvid` - Membuat sticker animasi (butuh canvas, sharp & ffmpeg)
- `.stc` - Convert gambar ke sticker (butuh sharp)

## 📦 Dependencies

Hanya menggunakan library ringan:
- `@whiskeysockets/baileys` - Library WhatsApp
- `pino` - Logger
- `qrcode-terminal` - Generate QR code

**TIDAK** menggunakan:
- ❌ sharp (image processing berat)
- ❌ canvas (rendering berat)
- ❌ ffmpeg (video processing berat)

## 🚀 Cara Install

```bash
# Install dependencies
npm install

# Jalankan bot
npm start
```

## 📱 Catatan Server HP

Bot ini dioptimalkan untuk:
- Resource terbatas
- Penggunaan RAM rendah
- Tanpa native dependencies yang kompleks
- Fokus pada fitur utility dasar

## ⚙️ Konfigurasi

Bot akan:
- Auto reconnect saat disconnect
- Skip pesan dari grup (hanya private chat)
- Simpan session di folder `session/`

## 🔧 Troubleshooting

### Error 440 (Conflict)
1. Buka WhatsApp di HP
2. Masuk ke: Menu (⋮) → Linked Devices
3. Logout/hapus semua device yang terhubung
4. Jalankan bot lagi

### Session Error
Hapus folder `session/` dan scan QR code ulang.

---
💡 **Versi ini cocok untuk server HP dengan spesifikasi terbatas!**
