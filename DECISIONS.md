# Keputusan Teknis

## 2026-11-16

- Nama produk digunakan sebagai **Wareflow**, mengikuti persetujuan pengguna.
- Implementasi dimulai dari F0 dengan Next.js App Router, TypeScript strict, Prisma, MySQL, dan session cookie sederhana sesuai opsi PRD yang paling ringan untuk MVP.
- Untuk mode lokal tanpa layanan database terpasang, development memakai SQLite melalui Prisma. Model tetap mengikuti struktur domain PRD dan dapat dipindahkan ke MySQL dengan mengganti provider serta `DATABASE_URL`.

## 2026-11-19

- Pengiriman OTP memakai **Brevo** sebagai provider prioritas. Brevo mengizinkan pengiriman ke penerima mana pun setelah alamat pengirim tunggal diverifikasi, tanpa perlu memiliki domain sendiri. Ini menyelesaikan batasan `onboarding@resend.dev` yang hanya bisa mengirim ke email pemilik akun Resend.
- Resend tetap didukung melalui `RESEND_API_KEY` untuk deployment yang sudah punya domain terverifikasi.
- Kegagalan pengiriman email tidak lagi diabaikan: OTP dianggap gagal bila provider mengembalikan error, dan kode OTP yang gagal terkirim dihapus agar pengguna bisa mencoba lagi.
- Ditambahkan jeda minimum antar permintaan OTP (`OTP_RESEND_COOLDOWN_SECONDS`, default 60 detik di production) untuk mengurangi spam dan konsumsi kuota provider.
