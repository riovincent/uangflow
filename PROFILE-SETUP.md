# Profil UangFlow — konfigurasi

Aktivasi disetujui pengguna dan selesai pada 21 Oktober 2026. Manual linking terverifikasi aktif setelah reload. Skrip berhasil dijalankan; pemeriksaan metadata memastikan bucket privat, empat kebijakan pemilik, anon tanpa EXECUTE, authenticated dengan EXECUTE dan pemeriksaan login baru. Tidak ada fungsi penghapusan akun yang dipanggil.

Kode preview memakai Supabase untuk username, perubahan email terverifikasi dan identitas Google. Username adalah nama tampilan, bukan handle unik. Mengubah email UangFlow tidak mengubah alamat Gmail di Google.

## Aktivasi selesai — 21 Oktober 2026

1. Proyek uxcksfhyipgjuyiztjva → Authentication → Sign In / Providers → Allow manual linking. Pertahankan email confirmation dan perlindungan nonce.
2. Tinjau lalu jalankan `supabase/account-settings.sql` sekali di SQL Editor. Skrip membuat bucket `avatars` privat, kebijakan pemilik untuk satu file `<uid>/profile.webp`, dan RPC `uangflow_delete_own_account`. Skrip tidak memanggil RPC penghapusan dan tidak menghapus akun ketika dipasang.
3. Verifikasi bucket tetap privat, empat policies terbatas ke auth.uid(), RPC tidak dapat dipanggil anon/PUBLIC, dan tidak ada argumen user_id dari klien.

Tidak ada service-role key yang ditempatkan di frontend atau proyek lokal. Foto diperkecil ke WebP 256 px; metadata JWT hanya menyimpan path. URL foto dibuat dengan masa berlaku satu jam setelah path pemilik diperiksa.

## Penghapusan

Pengguna harus mengetik email dan HAPUS, dan RPC mensyaratkan autentikasi ulang dalam lima menit. UID diturunkan dari JWT yang diverifikasi Supabase. Foto dihapus melalui Storage API; akun Auth dihapus melalui RPC; endpoint server menghapus records, dana_devices dan dana_events milik UID yang dikembalikan RPC.

Auth dan D1 tidak memiliki transaksi lintas layanan. Jika Auth sudah terhapus dan pembersihan D1 gagal, dialog menampilkan status yang sebenarnya dan memungkinkan retry dengan JWT yang belum kedaluwarsa; jangan tutup halaman sampai selesai. RPC mengizinkan retry idempoten untuk UID yang sudah dihapus. Jika pengguna meninggalkan retry hingga JWT kedaluwarsa, pemilik proyek perlu menyelesaikan pembersihan D1. Catatan pada deployment/backend lain tidak terhapus oleh preview ini. Penghapusan Auth pada proyek Supabase bersama berlaku juga pada situs utama. Akun Google pengguna sendiri tidak dihapus.

## Pengujian

- tests/profile-browser.mjs: nama ter-escape, email pending, validasi/foto, link/unlink dan pencegahan identitas terakhir dilepas, dialog mobile, konfirmasi hapus dan retry (mock).
- tests/account-delete.test.js: origin, sesi, batas body, UID pemilik, remote failure, atomic D1 cleanup dan retry.
- tests/api.test.js: username, host/path avatar privat, signature origin dan isolasi akun.
- tests/auth-browser.mjs: menu akun/ganti akun dan alur login.

Belum dijalankan pada layanan nyata: unggah foto baru, perubahan username/email, taut/lepas Google, atau penghapusan akun. Akun pemilik tidak diubah dalam verifikasi visual.
