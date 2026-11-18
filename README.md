# StokAE

Web dashboard untuk mengelola stok Toko Abednego Elektronik.

## Menjalankan aplikasi

```bash
npm install
npm run db:generate
npm run db:seed
npm run dev
```

Buka `http://localhost:3000`.

Login lokal:

- Email: `owner@stokae.local`
- Kata sandi: `stokae-demo`

## Fitur saat ini

- Dashboard ringkasan stok dan nilai persediaan.
- Login owner dan session cookie.
- Daftar/tambah barang yang tersimpan di database lokal.
- API pembelian atomik, stok keluar/pindah, lokasi, import Excel/CSV, stock count, dan ekspor.
- API Tanya Stok dan Scan Nota dengan fallback manual ketika Gemini belum dikonfigurasi.
- Tampilan responsif Liquid Glass untuk desktop dan ponsel.
