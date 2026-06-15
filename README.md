# Ican Work OS

Ican Work OS dengan sync cloud otomatis antar MacBook dan HP.

Yang disimpan di GitHub:

- UI/UX dan logic aplikasi Work OS
- Backend Cloudflare Worker untuk login Google dan sync
- Konfigurasi deploy Cloudflare
- Migrasi struktur database D1
- Dokumentasi setup

Yang tidak disimpan di GitHub:

- Isi data pribadi Work OS
- Isi data Habit Ican
- Backup JSON dan dump database
- Token atau secret Cloudflare/Google

## Cara Kerja Sync

1. User login dengan akun Google.
2. Cloudflare Worker memverifikasi login.
3. Data disimpan di Cloudflare D1 per akun Google.
4. MacBook dan HP yang login dengan akun Google yang sama membaca data yang sama.

Google dipakai untuk login, bukan sebagai tempat database.

## Deploy

Deploy production dilakukan dari GitHub Actions ke Cloudflare Worker `ican-work-os`.

GitHub Secrets yang dibutuhkan:

- `CLOUDFLARE_API_TOKEN`
- `SESSION_SECRET`

Cloudflare D1 yang dipakai:

- Database name: `ican-sync-cloud-test-db`
- Database id: `0b8f568a-efbc-4df2-aadb-150c2bf0a0a1`

Database ini berisi data/history sync terbaru, jadi jangan dihapus saat cleanup app test.

## URL

- Work OS: https://ican-work-os.icandun.workers.dev/
- Habit API origin yang diizinkan: https://habit-ican.pages.dev
