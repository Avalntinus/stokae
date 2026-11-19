# Wareflow

Web dashboard untuk mengelola stok dan operasional inventaris.

## Menjalankan aplikasi

```bash
npm install
npm run db:generate
npm run db:seed
npm run dev
```

Buka `http://localhost:3000`.

Login lokal:

- Email: `owner@wareflow.local`
- Kata sandi: `wareflow-demo`

## Konfigurasi email OTP

OTP bisa dikirim lewat **Brevo** (disarankan jika belum punya domain) atau **Resend**.

### Brevo (tanpa domain sendiri)

1. Masuk ke <https://app.brevo.com> → **Senders, Domains & Dedicated IPs** → **Senders**.
2. Tambahkan alamat email pengirim (mis. Gmail Anda), lalu klik tautan verifikasi yang dikirim Brevo.
3. Buka **SMTP & API** → **API Keys** → buat API key baru.
4. Isi environment berikut (lokal di `.env`, produksi di dashboard Vercel):

```env
BREVO_API_KEY="xkeysib-..."
EMAIL_FROM="Wareflow <alamat-yang-diverifikasi@gmail.com>"
```

Setelah alamat pengirim diverifikasi, Brevo dapat mengirim OTP ke **penerima mana pun**, bukan hanya ke email pemilik akun. Kuota gratis Brevo saat ini sekitar 300 email/hari.

### Resend

Resend hanya bisa mengirim ke email pemilik akun bila memakai `onboarding@resend.dev`. Untuk pengguna lain, domain pengirim harus dimiliki dan diverifikasi DNS-nya, lalu set:

```env
RESEND_API_KEY="re_..."
EMAIL_FROM="Wareflow <no-reply@domain-sendiri.com>"
```

Jika `BREVO_API_KEY` dan `RESEND_API_KEY` sama-sama diisi, Brevo yang dipakai. Tanpa provider email, kode OTP hanya ditulis ke log server saat development; di production pengiriman akan gagal dengan pesan error (bukan diam-diam).

## Fitur saat ini

- Dashboard ringkasan stok dan nilai persediaan.
- Login owner dan session cookie.
- Daftar/tambah barang yang tersimpan di database lokal.
- API pembelian atomik, stok keluar/pindah, lokasi, import Excel/CSV, stock count, dan ekspor.
- API Tanya Stok dan Scan Nota dengan fallback manual ketika Gemini belum dikonfigurasi.
- Tampilan responsif Liquid Glass untuk desktop dan ponsel.
