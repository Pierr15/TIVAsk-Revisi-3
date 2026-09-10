# Revisi P1: jawaban bot, autentikasi, dan balasan panitia

Revisi ini memperbaiki enam temuan P1 dari baseline `46c3f2d`. Skema Prisma dan data seed tidak berubah; tidak diperlukan migrasi baru untuk menerapkan revisi ini.

## Perubahan perilaku

1. **Pilihan eskalasi dan draf.** Polling memperbarui daftar tanpa memindahkan pilihan ke pengguna lain. Draf dipisahkan berdasarkan ID eskalasi dan hanya draf yang berhasil dikirim yang dihapus. Admin memilih penerima sendiri; pilihan yang hilang dari daftar tidak dialihkan ke orang lain. Draf berada di memori halaman dan belum bertahan setelah reload browser.
2. **JWT.** Backend menolak mulai jika `JWT_SECRET` kosong, kurang dari 32 byte, atau memakai nilai bawaan yang pernah dipublikasikan. Login/verifikasi memakai konfigurasi yang sama, membatasi algoritma ke HS256, dan memvalidasi bentuk payload.
3. **Kegagalan pengiriman.** Gateway yang gagal mengirim menghasilkan HTTP 503; eskalasi tetap OPEN dan pesan ADMIN tidak dicatat sebagai terkirim. Setelah gateway menerima pengiriman, pesan dan status RESOLVED dicatat dalam satu transaksi database. Eskalasi yang sudah selesai ditolak dengan HTTP 409.
4. **Pertanyaan lanjutan.** Gender/jurusan terbaru menggantikan atribut sebelumnya, termasuk arah perempuan ke laki-laki dan TJKT ke TO. Kata `beasiswa` tidak lagi dianggap penanda laki-laki. Setelah fallback, konteks lama dibersihkan agar tidak muncul kembali pada pertanyaan berikutnya.
5. **Kecukupan bukti.** Kandidat PUBLISHED harus mencakup istilah topik pada judul/isi, bukan hanya keyword atau bonus jurusan. Pertanyaan tanpa bukti, misalnya kursus Jepang atau asrama yang tidak tercantum, masuk fallback/eskalasi. Kandidat yang setara juga dianggap ambigu ketika kategorinya sama.
6. **Pengirim LID.** Pesan privat `@lid` dipetakan ke PN melalui `getContactLidAndPhone` dari whatsapp-web.js 1.34.7. Angka LID tidak disimpan/dikirim sebagai nomor telepon. Jika pemetaan gagal, bot mencoba memberi balasan teknis melalui chat asal. Grup, broadcast, dan pesan sendiri tetap diabaikan.

## Konfigurasi setelah mengambil perubahan

Buat rahasia sendiri di terminal lokal:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Masukkan hasilnya ke `JWT_SECRET` di `apps/backend/.env`. Jangan memakai nilai dari tes atau placeholder contoh dan jangan memasukkan `.env` ke GitHub. `.env.example` sengaja tidak memiliki rahasia siap pakai. Restart backend dan login ulang setelah mengganti rahasia.

Dependensi tidak bertambah. Untuk checkout baru, jalankan dari folder utama proyek:

```powershell
npm.cmd ci
npm.cmd run prisma:generate --workspace=backend
npm.cmd run build --workspace=@tivask/shared
npm.cmd run build:backend
npm.cmd run build:frontend
```

Paket bersama perlu dibangun terlebih dahulu karena skrip build baseline belum mengatur urutan workspace secara otomatis. Pengaturan DATABASE_URL, akun admin, dan database yang sudah ada tetap digunakan; perintah di atas tidak menjalankan seed atau migrasi.

## Pengujian P1 yang terisolasi

```powershell
npm.cmd run test:p1
npm.cmd run test:p1:ui
```

- `test:p1` memilih tes retrieval dan file `p1-*.test.ts` melalui filter Vitest yang kompatibel dengan Windows. Database, gateway WhatsApp, dan pemanggilan AI pada tes layanan/API menggunakan mock. Fixture retrieval membaca literal data seed tanpa mengeksekusi fungsi seeder.
- `test:p1:ui` membutuhkan build frontend di atas dan Google Chrome terpasang. Tes menjalankan frontend pada port 3100 dan menangkap semua request API dengan respons tiruan; backend tidak dijalankan. Port 3100 harus kosong.
- Tes browser memeriksa polling, draf per penerima, kegagalan pengiriman, tujuan balasan, dan hilangnya eskalasi dari daftar.
- `npm run test:backend` adalah suite yang lebih luas. Tes integrasi bawaan tetap membutuhkan PostgreSQL uji dan admin seed; jangan gunakan database produksi. Tes API kini membuat/membersihkan eskalasi fixture sendiri dan memalsukan pengiriman gateway, sehingga tidak membalas eskalasi pengguna yang sudah ada.

## Batas validasi dan operasi

- Pengujian mock tidak menggantikan uji PostgreSQL, respons Gemini langsung, atau pengiriman/penerimaan di perangkat WhatsApp. Ketiganya perlu diverifikasi pada lingkungan uji pemilik repositori.
- `whatsAppSent: true` berarti pemanggilan gateway berhasil, bukan bukti pesan telah dibaca atau diterima perangkat tujuan.
- Transaksi PostgreSQL dan pengiriman WhatsApp tidak atomik bersama. Jika pencatatan gagal setelah gateway menerima pesan, backend meminta admin memeriksa chat sebelum mencoba ulang. Revisi ini tidak menambahkan outbox atau idempotensi lintas proses; pengiriman serentak oleh beberapa admin dan crash saat pengiriman masih memerlukan penanganan lanjutan.
- Pemeriksaan bukti bersifat konservatif dan berbasis kosakata, bukan pembuktian semantik semua kalimat. Sinonim yang belum dipetakan serta angka/tahun yang tidak tercantum dapat menghasilkan fallback. Istilah teknis berbeda, seperti CNC dan mesin, tidak diperlakukan sebagai sinonim hanya karena berada pada jurusan yang sama.
- Tes lama tentang angka biaya yang tidak tercantum kini mengharapkan NO_EVIDENCE; bot tidak otomatis mengambil biaya pendaftaran untuk membenarkan atau menyangkal setiap angka baru.
- Eskalasi historis yang terlanjur RESOLVED karena bug sebelumnya tidak dibuka kembali otomatis. Tidak ada perubahan data produksi atau aktivasi layanan eksternal dalam revisi ini.

Laporan `BUILD_REPORT.md` di bawah catatan revisinya merekam implementasi awal, bukan hasil pengujian terbaru dari perubahan P1.
