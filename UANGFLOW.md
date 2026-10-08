# UangFlow

Aplikasi full-stack berbahasa Indonesia: pencatatan pengeluaran, impor CSV yang dapat dikoreksi, anggaran, tagihan, tabungan, dan pendamping anggaran berbasis perhitungan.

## Jalankan lokal

Gunakan Node.js 24 dan dependensi dari package-lock.json. Jalankan `npm run install:ci`, `npm run build`, lalu terapkan migrasi SQL di `drizzle/` ke database preview sesuai panduan README starter. Jalankan `npm run dev` dan buka alamat yang ditampilkan. Sign-in pada loopback adalah simulasi pengembangan dari starter; sign-in produksi ditangani Sites melalui ChatGPT.

Pengujian: `node --test tests/*.test.js` dan `npx tsc --noEmit`.

Pengujian browser opsional: `node tests/browser.mjs` memakai Playwright (`@playwright/test`) dan Microsoft Edge yang sudah terpasang. Bila Playwright berada di direktori lain, set `UANGFLOW_PLAYWRIGHT_PATH` ke URL modul lokalnya. Ini bukan dependensi produksi.

## Penyimpanan dan privasi

Produksi memakai database Cloudflare D1 dengan binding `DB`. Login email/password dan Google memakai Supabase Auth ketika dikonfigurasi; ChatGPT tetap tersedia melalui Sites. API memverifikasi token Supabase langsung ke layanan Auth, mengharuskan email terverifikasi, memeriksa asal permintaan tulis, memvalidasi data, dan menolak versi lama agar perubahan perangkat lain tidak tertimpa. ID pengguna Supabase diberi awalan `supabase:`. Identitas dan nama yang dikirim klien tidak menjadi bukti kepemilikan data.

Akun ChatGPT lama tetap mengakses data sebelumnya. Akun email/Google tidak otomatis mengambil alih catatan ChatGPT meskipun alamat email sama. Ekspor catatan dari akun lama bila ingin memindahkannya; tidak ada migrasi otomatis.

Demo hanya berada di memori browser dan tidak dikirim ke API. Salinan lengkap dapat diunduh sebagai JSON; transaksi dapat diekspor sebagai CSV. Jangan memakai perangkat bersama tanpa keluar dari akun. Tidak ada integrasi AI atau bank, dan tidak ada PIN, OTP, maupun kata sandi bank yang diminta.

## Aturan angka

Rupiah bulat, maksimum Rp1 miliar per nominal, maksimum 10.000 transaksi, 100 tagihan dan 100 target. Dana awal dihitung pada tanggal awal; catatan sebelumnya tidak mengubah dana tersedia. Transfer biasa tidak mengubah dana gabungan. Transfer untuk tabungan mengurangi dana yang dapat dibelanjakan tanpa menambah pengeluaran. Tabungan awal sudah berada di luar dana awal. Pengembalian selesai mengurangi pengeluaran bersih dan mengembalikan dana; pengembalian terhubung dibatasi nominal pengeluaran asli.

## Aktifkan email/password dan Google

1. Buat proyek Supabase milik pemilik UangFlow. Aktifkan provider Email dan konfirmasi email. Atur minimal password 12 karakter. Konfigurasikan SMTP agar email verifikasi dan pemulihan dapat dikirim ke pengguna publik; layanan email bawaan Supabase dibatasi untuk pengujian.
2. Di Auth → URL Configuration, atur Site URL `https://uangflow.org/` dan izinkan redirect `https://uangflow.org/` serta `https://uangflow.org/?auth=recovery`. Jika memakai domain hosting bawaan, tambahkan alamat tersebut secara eksplisit juga. Hindari wildcard produksi.
3. Di Google Cloud, buat OAuth client Web application. Authorized JavaScript origin: `https://uangflow.org`. Authorized redirect URI: URL callback yang diberikan halaman provider Google Supabase, biasanya `https://<project-ref>.supabase.co/auth/v1/callback`. Masukkan Client ID dan Client Secret langsung ke Supabase. Atur audience/production agar bukan hanya akun test yang boleh masuk.
4. Simpan runtime variables Sites: `SUPABASE_URL` (URL proyek HTTPS), `SUPABASE_PUBLISHABLE_KEY` (kunci `sb_publishable_...` yang memang boleh dipublikasikan), dan `SUPABASE_GOOGLE_ENABLED=true` hanya setelah provider Google siap. Jangan gunakan service-role/secret key. Jangan simpan Google Client Secret di browser atau repository.
5. Deploy ulang versi yang sudah disimpan untuk menerapkan konfigurasi. Uji daftar, konfirmasi email, masuk, keluar, pemulihan password, Google, serta akses dua akun yang terpisah. Pengujian otomatis memakai respons Auth simulasi, bukan kredensial pengguna asli.

Tanpa konfigurasi, form menjelaskan email/Google belum aktif dan ChatGPT masih bekerja. Password dikirim langsung dari browser ke Supabase; UangFlow tidak menyimpan password di D1. SDK menangani sesi dan PKCE. API tidak mempercayai isi JWT yang hanya dibaca di browser.

Claude.ai tidak menyediakan login yang diizinkan untuk aplikasi pihak ketiga UangFlow, sehingga tidak ada tombol login Claude palsu. Lihat https://code.claude.com/docs/en/legal-and-compliance#authentication-and-credential-use.

## Domain .org

`https://uangflow.org/` telah disambungkan ke Sites dengan HTTPS dan akses publik. Domain dikelola di Spaceship; aplikasi dan D1 berada di hosting Sites. Pengaturan DNS bukan tempat mengunggah kode. Pengaturan domain tidak otomatis mengubah audience situs.

## Batas versi ini

QRIS otomatis memerlukan aplikasi Android terpisah atau integrasi resmi penyedia pembayaran. Pendamping menggunakan perhitungan deterministik, bukan layanan AI. Tidak ada saran investasi, eksekusi pembayaran, atau pemindahan uang. Estimasi hanya sebaik kelengkapan catatan pengguna.
