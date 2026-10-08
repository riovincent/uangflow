# UangFlow

Aplikasi full-stack berbahasa Indonesia: pencatatan pengeluaran, impor CSV yang dapat dikoreksi, anggaran, tagihan, tabungan, dan pendamping anggaran berbasis perhitungan.

## Jalankan lokal

Gunakan Node.js 24 dan dependensi dari package-lock.json. Jalankan `npm run install:ci`, `npm run build`, lalu terapkan migrasi SQL di `drizzle/` ke database preview sesuai panduan README starter. Jalankan `npm run dev` dan buka alamat yang ditampilkan. Sign-in pada loopback adalah simulasi pengembangan dari starter; sign-in produksi ditangani Sites melalui ChatGPT.

Pengujian: `node --test tests/*.test.js` dan `npx tsc --noEmit`.

Pengujian browser opsional: `node tests/browser.mjs` memakai Playwright (`@playwright/test`) dan Microsoft Edge yang sudah terpasang. Bila Playwright berada di direktori lain, set `UANGFLOW_PLAYWRIGHT_PATH` ke URL modul lokalnya. Ini bukan dependensi produksi.

## Penyimpanan dan privasi

Produksi memakai database Cloudflare D1 dengan binding `DB`. Setiap catatan memiliki ID pengguna dari autentikasi Sites. API mengabaikan identitas yang dikirim klien, memeriksa asal permintaan tulis, memvalidasi data, dan menolak versi lama agar perubahan perangkat lain tidak tertimpa. Sign-in dan akses situs ditangani Sites. Situs pertama diterbitkan privat untuk pemilik.

Demo hanya berada di memori browser dan tidak dikirim ke API. Salinan lengkap dapat diunduh sebagai JSON; transaksi dapat diekspor sebagai CSV. Jangan memakai perangkat bersama tanpa keluar dari akun. Tidak ada integrasi AI atau bank, dan tidak ada PIN, OTP, maupun kata sandi bank yang diminta.

## Aturan angka

Rupiah bulat, maksimum Rp1 miliar per nominal, maksimum 10.000 transaksi, 100 tagihan dan 100 target. Dana awal dihitung pada tanggal awal; catatan sebelumnya tidak mengubah dana tersedia. Transfer biasa tidak mengubah dana gabungan. Transfer untuk tabungan mengurangi dana yang dapat dibelanjakan tanpa menambah pengeluaran. Tabungan awal sudah berada di luar dana awal. Pengembalian selesai mengurangi pengeluaran bersih dan mengembalikan dana; pengembalian terhubung dibatasi nominal pengeluaran asli.

## Domain .org

Domain belum dibeli atau disambungkan. Pilih dan daftarkan nama .org, lalu gunakan pengaturan domain kustom Sites. Salin catatan DNS persis seperti yang diberikan penyedia; tunggu verifikasi domain dan HTTPS. Jangan menganggap uangflow.org tersedia. Pengaturan domain tidak otomatis mengubah situs privat menjadi publik.

## Batas versi ini

QRIS otomatis memerlukan aplikasi Android terpisah atau integrasi resmi penyedia pembayaran. Pendamping menggunakan perhitungan deterministik, bukan layanan AI. Tidak ada saran investasi, eksekusi pembayaran, atau pemindahan uang. Estimasi hanya sebaik kelengkapan catatan pengguna.
