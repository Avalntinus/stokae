# Progress Implementasi

## F0 Setup

- [x] Scaffold Next.js App Router + TypeScript.
- [x] Tema visual Wareflow dan layout sidebar responsif.
- [x] Dashboard ringkasan inventaris.
- [x] Daftar barang dan pencarian.
- [x] Tambah barang melalui modal.
- [x] Panel Tanya Stok demo.
- [x] Lint dan production build lulus.

## Backend MVP

- [x] Prisma SQLite lokal dengan model user, session, barang, kategori, lokasi, pembelian, stok, movement, import, stock count, dan log AI.
- [x] Login credentials, session cookie httpOnly tujuh hari, logout, dan proteksi halaman.
- [x] API barang, lokasi, pembelian atomik, stok keluar/pindah, dashboard, import, stock count, ekspor CSV, Tanya Stok, dan Scan Nota.
- [x] Seed akun owner, lokasi awal, dan data demo.
- [x] Unit test aturan weighted average, status stok, dan format angka Indonesia.

## Catatan

UI utama sudah tersambung ke API daftar/tambah barang. Modul pembelian, import, stock count, dan AI sudah memiliki endpoint backend; layar detailnya masih perlu disambungkan satu per satu ke endpoint agar seluruh aksi UI memakai data database.
