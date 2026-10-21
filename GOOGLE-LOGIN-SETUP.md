# Aktifkan login dan daftar Google — UangFlow

Kode preview sudah memakai Supabase OAuth dengan PKCE. Satu tombol Google menangani pengguna baru maupun pengguna lama. Konfigurasi Google Cloud dan Supabase sudah disimpan pada 21 Oktober 2026; flag preview lokal sudah true. Pengguna menyelesaikan login Google nyata dan kembali ke dashboard. Jangan masukkan Client Secret ke chat, frontend, atau Git.

## 1. Google Cloud

Buka [Google Auth Platform](https://console.cloud.google.com/auth/overview), pilih/buat proyek UangFlow, lalu isi Branding (nama aplikasi dan email dukungan). Pada Audience, pilih External untuk pengguna umum; selama Testing, tambahkan akun uji.

Pada Data Access, cukup gunakan `openid`, `userinfo.email`, dan `userinfo.profile`. Pada Clients, buat OAuth Client ID dengan jenis **Web application**. Panduan resmi: [Supabase Google](https://supabase.com/docs/guides/auth/social-login/auth-google).

Authorized JavaScript origins:

```text
https://uangflow.org
http://localhost:5193
http://127.0.0.1:5193
```

Authorized redirect URI Google harus callback Supabase, bukan beranda UangFlow:

```text
https://uxcksfhyipgjuyiztjva.supabase.co/auth/v1/callback
```

Cocokkan URI tersebut dengan callback yang ditampilkan provider Google pada proyek Supabase milikmu. Simpan Client ID dan Client Secret.

## 2. Supabase

Buka proyek UangFlow → Authentication → Sign In / Providers → Google. Masukkan Client ID dan Client Secret langsung di sana, aktifkan provider, lalu simpan.

Pada URL Configuration, pertahankan Site URL `https://uangflow.org` dan tambahkan Redirect URLs berikut untuk preview serta produksi:

```text
http://127.0.0.1:5193/
http://127.0.0.1:5193/#dashboard
http://localhost:5193/
http://localhost:5193/#dashboard
https://uangflow.org/
https://uangflow.org/#dashboard
```

Callback Google dan Redirect URLs aplikasi berbeda. Pengguna kembali ke URL aplikasi setelah Supabase menukar kode OAuth. [Dokumentasi redirect Supabase](https://supabase.com/docs/guides/auth/redirect-urls).

## 3. Aktifkan tombol pada preview

Sesudah dua pengaturan di atas selesai, beri tahu bahwa provider sudah siap. Nilai lokal `SUPABASE_GOOGLE_ENABLED` di `.dev.vars` kemudian dapat diubah menjadi `true` dan server preview direstart. Client Secret tetap hanya berada di Supabase. Mengaktifkan preview tidak memublikasikan website utama.

## 4. Uji sebelum publikasi

Masuk / Daftar → Lanjutkan dengan Google → pilih akun → kembali ke dashboard. Periksa pengguna baru, pengguna lama, keluar, pembatalan, serta pemisahan catatan dua akun. Login email tetap tersedia. Jangan menganggap konfigurasi selesai hanya karena tombol terlihat.

Pengujian otomatis memakai provider simulasi; login Google nyata dengan akun pemilik juga berhasil kembali ke dashboard. Audience Google masih External / Testing; publikasi untuk umum belum dilakukan. Sebelum rilis untuk umum, periksa Audience/publishing status Google dan hapus origin lokal dari client produksi bila memakai client terpisah.
