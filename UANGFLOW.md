# UangFlow

Aplikasi full-stack berbahasa Indonesia: pencatatan pengeluaran, impor CSV yang dapat dikoreksi, anggaran, tagihan, tabungan, dan pendamping anggaran berbasis perhitungan.

Login berhasil membuka dashboard dan semua menu, termasuk untuk akun baru yang belum mengatur dana awal. Pengaturan dana awal ditawarkan lewat banner tanpa mengunci navigasi. Pendaftaran membuka pilihan login; jika konfirmasi email aktif, pengguna harus mengonfirmasi email sebelum masuk. Pencatatan notifikasi pemasukan dan pembayaran DANA di Android tersedia sebagai versi uji melalui aplikasi pendamping; integrasi resmi QRIS/bank dan layanan AI belum tersedia.

## DANA Android

Masuk → Pengaturan → unduh APK → buat kunci perangkat → hubungkan aplikasi pendamping → izinkan akses notifikasi. APK 0.2.1 menangkap pemasukan dan pengeluaran, termasuk kata terkirim untuk ditinjau. Tombol Periksa notifikasi DANA memeriksa pesan yang masih aktif sejak perangkat dihubungkan, memakai filter dan identitas yang sama. Status membedakan izin aktif, listener tersambung, dan alasan pesan dilewati; tidak mengirim isi diagnostik atau menarik riwayat sebelum pairing. Pembayaran yang jelas berhasil dan memiliki satu nominal IDR dicatat sebagai pengeluaran; penerimaan uang yang jelas dengan satu nominal dicatat sebagai pemasukan. Transfer, top up, refund, dan pesan ambigu perlu ditinjau pada menu Transaksi dengan jenis dipilih secara eksplisit. Transfer uang milik sendiri tidak boleh dihitung sebagai pemasukan baru. Pembaruan APK perlu dipasang di atas aplikasi lama. Kunci hanya bisa mengirim notifikasi, dapat dicabut, dan dipisahkan berdasarkan akun. Antrean offline dan idempotensi mencegah pengiriman ulang menambah catatan ganda. Pembaruan memakai revisi untuk melindungi perubahan di website.

Panduan pemasangan dan privasi: `public/dana-android.html`. Sumber/build APK, batasan dan kalibrasi perangkat: `android/README.md`. Belum diuji dengan notifikasi DANA asli pada HP pengguna. Pengujian server/parser: `tests/dana.test.js`; alur browser lokal: `tests/dana-browser.mjs`.

## Persiapan DANA Enterprise sandbox

`public/dana-sandbox.html` berisi tiga alamat registrasi untuk Endpoint URLs Initialization. `GET /v1.0/debit/notify` dan `GET /v1.0/debit/emoney/transfer-bank/notify.htm` menunjukkan status persiapan; POST sengaja mengembalikan 503 dan kode kegagalan SNAP, tanpa membaca payload, menyimpan pesan, atau mengubah keuangan. `GET /api/dana/sandbox/return` membuang seluruh parameter callback dan mengarahkan ke halaman yang jelas menyebut akun belum terhubung. Belum ada pertukaran authCode atau binding; jangan memulai otorisasi akun melalui endpoint ini. Tidak ada private key, token, atau kredensial sandbox dalam source. Tes penolakan webhook dan pembuangan parameter: `tests/dana-sandbox.test.js`.

Ini hanya tahap pendaftaran URL sandbox, bukan integrasi Transaction History yang berfungsi. Setelah kredensial tersedia, implementasikan verifikasi signature dan penyimpanan tahan retry sebelum menerima webhook; untuk riwayat perlu binding dengan state sekali pakai yang terikat ke pengguna, token server yang terlindungi, pagination, deduplikasi dan pemetaan transaksi yang disetujui. Callback tests belum dapat lulus selama endpoint belum dikonfigurasi. Sandbox tidak mengambil transaksi akun asli; akses produksi dan cakupan transfer/riwayat lintas merchant perlu dikonfirmasi ke DANA.

## Jalankan lokal

Gunakan Node.js 24 dan dependensi dari package-lock.json. Jalankan `npm run install:ci`, `npm run build`, lalu terapkan migrasi SQL di `drizzle/` ke database preview sesuai panduan README starter. Jalankan `npm run dev` dan buka alamat yang ditampilkan. Login email dan Google memakai konfigurasi Supabase di `.dev.vars` lokal atau runtime variables Sites pada produksi. Simulasi identitas Sites pada loopback hanya dipertahankan untuk pengujian fixture lama.

Pengujian: `node --test tests/*.test.js` dan `npx tsc --noEmit`.

Pengujian browser opsional: `node tests/browser.mjs` memakai Playwright (`@playwright/test`) dan Microsoft Edge yang sudah terpasang. Bila Playwright berada di direktori lain, set `UANGFLOW_PLAYWRIGHT_PATH` ke URL modul lokalnya. Ini bukan dependensi produksi.

## Penyimpanan dan privasi

Produksi memakai database Cloudflare D1 dengan binding `DB`. Login email/password dan Google memakai Supabase Auth ketika dikonfigurasi; identitas Sites lama tetap dikenali backend tanpa tombol login ChatGPT pada antarmuka. API memverifikasi token Supabase langsung ke layanan Auth, mengharuskan email terverifikasi, memeriksa asal permintaan tulis, memvalidasi data, dan menolak versi lama agar perubahan perangkat lain tidak tertimpa. ID pengguna Supabase diberi awalan `supabase:`. Identitas dan nama yang dikirim klien tidak menjadi bukti kepemilikan data.

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

Tanpa konfigurasi, form menjelaskan layanan login belum aktif. Password dikirim langsung dari browser ke Supabase; UangFlow tidak menyimpan password di D1. SDK menangani sesi dan PKCE. API tidak mempercayai isi JWT yang hanya dibaca di browser.

Pengaturan profil, foto privat, identitas Google, dan hapus akun UangFlow dijelaskan di `PROFILE-SETUP.md`. Menghapus akun UangFlow tidak menghapus akun Google atau Gmail.

## Domain .org

`https://uangflow.org/` telah disambungkan ke Sites dengan HTTPS dan akses publik. Domain dikelola di Spaceship; aplikasi dan D1 berada di hosting Sites. Pengaturan DNS bukan tempat mengunggah kode. Pengaturan domain tidak otomatis mengubah audience situs.

## Batas versi ini

QRIS otomatis memerlukan aplikasi Android terpisah atau integrasi resmi penyedia pembayaran. Pendamping menggunakan perhitungan deterministik, bukan layanan AI. Tidak ada saran investasi, eksekusi pembayaran, atau pemindahan uang. Estimasi hanya sebaik kelengkapan catatan pengguna.
