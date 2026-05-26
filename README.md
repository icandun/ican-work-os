# Ican's Work OS

Aplikasi produktivitas pribadi: Triage tugas, Execution Log dengan timer, Report (Excel/PDF), Kalender produktivitas, dan sync meeting ke Google Calendar.

> 🛡️ **Privasi**: Semua data tersimpan di browser Anda (localStorage). Tidak ada server, tidak ada database. Hanya Anda yang bisa lihat.

---

## 🚀 Cara Deploy ke Cloudflare Pages via GitHub

Panduan ini untuk **awam tanpa background koding**. Ikuti satu per satu.

### Bagian 1 — Siapkan GitHub (sekali aja, ±5 menit)

1. **Bikin akun GitHub** di https://github.com → klik **Sign up**. Pakai email pribadi.
2. **Verifikasi email** (cek inbox).
3. Selesai. Anda sudah punya akun coder ✓

### Bagian 2 — Upload kode ke GitHub (±5 menit)

1. Di GitHub, klik tombol **`+`** di kanan atas → **New repository**
2. Isi:
   - **Repository name:** `ican-work-os` (boleh nama lain, tanpa spasi)
   - **Description:** boleh dikosongi
   - Pilih **Public** (biar Cloudflare Pages gratis bisa baca)
   - **JANGAN** centang "Add a README file" (karena kita sudah punya)
   - Klik **Create repository**

3. Di halaman repo kosong, klik link **"uploading an existing file"** di bagian tengah halaman.

3. Di halaman repo yang baru dibuat (masih kosong), lihat bagian tengah halaman.
   Ada teks kecil berwarna biru yang bisa diklik:
   > *"…or upload an existing file"*

   Klik tulisan itu.

4. Anda masuk ke **halaman upload**. Di tengah ada kotak besar bertuliskan:
   > *"Drag files here to add them to your repository"*

   **Inilah area drag-and-drop-nya.**

   **Langkah upload:**
   - Download dulu **zip file project** ini (ada tombol download yang sudah tersedia)
   - **Extract / unzip** file tersebut di komputer Anda
     - Windows: klik kanan → **Extract All**
     - Mac: klik dua kali file zip
   - Buka folder hasil extract
   - **Pilih semua file** ini (klik satu per satu sambil tahan Ctrl di Windows / Cmd di Mac):
     - `index.html`, `styles.css`
     - `app.jsx`, `data.jsx`, `lib.jsx`, `ui.jsx`
     - `dashboard.jsx`, `triage.jsx`, `execution.jsx`
     - `report.jsx`, `calendar.jsx`, `config.jsx`
     - `README.md`, `.gitignore`
   - **Seret (drag)** semua file yang dipilih ke kotak besar di GitHub, lalu lepas
   - Atau klik **"choose your files"** untuk pakai file picker biasa

   > ⚠️ **JANGAN upload** folder bernama `uploads` — berisi file Excel pribadi Anda.
   >
   > 💡 `.gitignore` mungkin tidak kelihatan (file tersembunyi). Tidak apa-apa kalau terlewat — tidak wajib.

5. Tunggu semua file selesai diproses (ada list file muncul di bawah kotak upload).
6. Scroll ke bawah → isi kotak **"Commit changes"** dengan tulisan: `Initial upload`
7. Klik tombol hijau **Commit changes** → selesai!

Selamat — kode Anda sudah di GitHub! 🎉

Selamat — kode Anda sudah di GitHub! 🎉

### Bagian 3 — Deploy ke Cloudflare Pages (±5 menit)

1. **Bikin akun Cloudflare** di https://dash.cloudflare.com/sign-up
2. Verifikasi email.
3. Di dashboard Cloudflare, di menu kiri klik **Workers & Pages** (atau **Compute (Workers)**).
4. Klik tab **Pages** → tombol **Create application** → pilih **Connect to Git**.
5. Klik **Connect GitHub** → izinkan Cloudflare baca repo Anda → pilih repo `ican-work-os`.
6. Isi setup:
   - **Project name:** `ican-work-os` (atau bebas — ini jadi subdomain)
   - **Production branch:** `main`
   - **Framework preset:** **None**
   - **Build command:** *(kosongkan)*
   - **Build output directory:** `/` *(tanda slash saja — artinya root)*
7. Klik **Save and Deploy**.
8. Tunggu ±30 detik — Cloudflare akan build & deploy.
9. Selesai! Cloudflare kasih URL seperti: `https://ican-work-os.pages.dev`

**Buka URL itu di browser HP atau laptop** — aplikasi Anda sudah online 🎉

---

## 🔄 Cara Update Aplikasi (kalau ada perubahan)

Cara paling gampang (lewat web GitHub):

1. Buka repo Anda di github.com
2. Klik file yang mau diubah → klik ikon **pensil ✏️ di kanan atas**
3. Edit isinya → scroll bawah → ketik commit message → **Commit changes**
4. Cloudflare otomatis re-deploy dalam ±30 detik. Refresh URL pages.dev Anda.

Cara upload file baru: Klik **Add file** → **Upload files**.

---

## 🌐 (Opsional) Pakai Domain Sendiri

Kalau punya domain (`namaanda.com`):

1. Di Cloudflare Pages → project Anda → tab **Custom domains**
2. **Set up a custom domain** → masukkan `app.namaanda.com` atau apapun
3. Cloudflare kasih instruksi DNS — copy-paste ke pengelola domain Anda
4. Tunggu propagasi (±10 menit) → URL custom Anda aktif

---

## 📂 Struktur File

```
index.html         # Halaman utama
styles.css         # Tampilan
app.jsx            # Logic utama + routing
data.jsx           # Data awal & helper tanggal
lib.jsx            # Helper export Excel/PDF, Google Calendar
ui.jsx             # Komponen UI dasar (Button, Modal, Badge, dll)
dashboard.jsx      # Layar Dashboard
triage.jsx         # Layar Triage (Kanban)
execution.jsx      # Layar Execution Log
report.jsx         # Layar Report (Harian/Bulanan/30 Hari)
calendar.jsx       # Layar Kalender
config.jsx         # Layar Config (Perusahaan/Sub-Kategori/Tema)
```

## 💾 Backup Data

Karena data di localStorage browser, kalau Anda:
- Reset browser / pindah HP / pindah laptop → **data hilang**

**Solusi:** Download Excel rutin dari tab **Report** (Bulanan / 30 Hari) untuk arsip pribadi.

---

## ❓ FAQ

**Q: Berapa biaya hosting di Cloudflare?**
A: **Gratis** untuk pemakaian pribadi. Cloudflare Pages free tier: unlimited bandwidth, 500 build/bulan. Cukup banget.

**Q: Data saya aman?**
A: Data hanya ada di browser Anda. Cloudflare cuma host file HTML/JS/CSS, tidak punya akses ke data Anda.

**Q: Bisa pakai HP buat update kode?**
A: Bisa! Edit langsung di GitHub via browser HP, sama persis.

**Q: Aplikasinya tetap jalan kalau offline?**
A: Setelah load pertama, sebagian besar fitur jalan offline (kecuali sync Google Calendar dan export PDF/Excel saat pertama — butuh download library). Refresh online dulu setelah update.
