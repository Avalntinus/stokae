# Keputusan Teknis

## 2026-11-16

- Nama produk digunakan sebagai **StokAE** (Stok Abednego Elektronik), mengikuti persetujuan pengguna.
- Implementasi dimulai dari F0 dengan Next.js App Router, TypeScript strict, Prisma, MySQL, dan session cookie sederhana sesuai opsi PRD yang paling ringan untuk MVP.
- Untuk mode lokal tanpa layanan database terpasang, development memakai SQLite melalui Prisma. Model tetap mengikuti struktur domain PRD dan dapat dipindahkan ke MySQL dengan mengganti provider serta `DATABASE_URL`.
