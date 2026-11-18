# Rencana F0 Setup

1. Membuat aplikasi Next.js App Router dengan TypeScript strict dan Tailwind CSS.
2. Menambahkan konfigurasi lint/format, environment example, serta aturan agen dari PRD.
3. Menyiapkan Prisma untuk MySQL, schema inti, migrasi, dan seed akun owner serta lokasi awal.
4. Menyiapkan autentikasi credentials berbasis cookie/session yang aman.
5. Membuat layout aplikasi, halaman login, dashboard awal, dan route health check.
6. Menjalankan lint, type-check/build, serta validasi migrasi/seed bila database lokal tersedia.

## Definition of Done F0

- `npm run dev` dapat dijalankan.
- Login owner tersedia dan halaman terlindungi.
- Prisma schema/migrasi/seed tersedia.
- Lokasi awal dan akun owner dapat dibuat dari environment.
- `.env.example`, `README.md`, dan dokumentasi keputusan tersedia.
