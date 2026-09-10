import "dotenv/config";
import bcrypt from "bcryptjs";
import { PrismaClient, KBStatus } from "@prisma/client";

const prisma = new PrismaClient();

const initialKBEntries = [
  {
    title: "Profil SMKN 1 Adiwerna",
    category: "PROFIL",
    content: "Nama: SMK Negeri 1 Adiwerna (nama populer: STM ADB / SMKN 1 Adiwerna). Berdiri tahun 1978. Alamat: Jl. Raya II PO BOX 24, Adiwerna, Kabupaten Tegal, Jawa Tengah 52194. SMKN 1 Adiwerna merupakan sekolah kejuruan bidang teknologi rekayasa dan teknologi informasi, Sekolah Pusat Keunggulan, dan Asean Eco School (2019). Terdapat 7 kompetensi keahlian: DPIB, TJKT, TE, TO, TM, TK, TPFL. Kontak resmi: mail@smkn1adw.sch.id, website: smkn1adw.sch.id, Instagram: @smknegeri1adiwerna.",
    keywords: ["profil", "alamat", "sejarah", "lokasi", "kontak", "email", "telepon", "smkn 1 adiwerna", "adb"],
    status: KBStatus.PUBLISHED,
  },
  {
    title: "Biaya Pendaftaran, Daftar Ulang, dan SPP",
    category: "BIAYA",
    content: "Biaya pendaftaran SPMB: GRATIS (tidak dipungut biaya apa pun).\nBiaya proses daftar ulang: GRATIS (seluruh proses daftar ulang tidak dipungut biaya).\nSPP Bulanan: Rp0 (SMKN 1 Adiwerna TIDAK MEMUNGUT SPP / Sumbangan Pembinaan Pendidikan bulanan sama sekali).",
    keywords: ["biaya", "pendaftaran", "daftar ulang", "spp", "gratis", "bayar", "uang", "tarif"],
    status: KBStatus.PUBLISHED,
  },
  {
    title: "Ketentuan Seragam Siswa Laki-laki",
    category: "BIAYA",
    content: "Ketentuan seragam untuk siswa laki-laki di SMKN 1 Adiwerna:\n- Senin & Selasa: Seragam OSIS lengkap dengan dasi dan sabuk ADB, celana abu-abu/putih sesuai jadwal, sepatu PDH/pantofel hitam, dan kaos kaki panjang full putih.\n- Rabu & Kamis: Seragam identitas/eksekutif lengkap dengan sabuk ADB, sepatu PDH/pantofel, kaos kaki panjang full putih.\n- Jumat: Seragam Pramuka lengkap dengan sabuk ADB, hasduk panjang melebihi perut berkacu segi delapan, dan kaos kaki panjang full hitam tanpa bordir.",
    keywords: ["seragam", "laki-laki", "pria", "cowok", "celana", "baju", "pdh", "pantofel", "sepatu", "kaos kaki"],
    status: KBStatus.PUBLISHED,
  },
  {
    title: "Ketentuan Seragam Siswi Perempuan",
    category: "BIAYA",
    content: "Ketentuan seragam untuk siswi perempuan di SMKN 1 Adiwerna:\n- Senin & Selasa: Seragam OSIS lengkap, kerudung segiempat berwarna putih dengan ciput putih, sepatu PDH/pantofel, dan kaos kaki panjang full putih.\n- Rabu & Kamis: Seragam identitas/eksekutif lengkap, kerudung berwarna hijau dengan ciput hitam, sepatu PDH/pantofel, dan kaos kaki panjang full putih.\n- Jumat: Seragam Pramuka lengkap, kerudung coklat dengan ciput hitam, hasduk panjang melebihi perut berada di luar kerudung, dan kaos kaki panjang full hitam.",
    keywords: ["seragam", "perempuan", "wanita", "cewek", "jilbab", "kerudung", "rok", "ciput", "pdh", "kaos kaki"],
    status: KBStatus.PUBLISHED,
  },
  {
    title: "Jadwal dan Alur SPMB 2026",
    category: "JADWAL",
    content: "Linimasa SPMB SMKN 1 Adiwerna Tahun Ajaran 2026/2027:\n1. 18 Mei 2026: Pengumuman SPMB 2026\n2. 3-12 Juni 2026: Pengajuan Akun online di spmb.jatengprov.go.id\n3. 4-13 Juni 2026: Verifikasi Dokumen luring & Aktivasi Akun\n4. 14 Juni 2026: Sinkronisasi Data Calon Murid dalam Sistem SPMB\n5. 15-18 Juni 2026: Pendaftaran dan Pemilihan Sekolah & Jurusan\n6. 19-20 Juni 2026: Evaluasi dan Masa Tenang\n7. 21 Juni 2026: Pengumuman Hasil Seleksi (maksimal 23.59 WIB)\n8. 22-25 Juni 2026: Daftar Ulang Utama\n9. 26-28 Juni 2026: Pengumuman Peserta Cadangan\n10. 29-30 Juni 2026: Daftar Ulang Cadangan\n11. 10-13 Juli 2026: Awal Tahun Ajaran 2026/2027.",
    keywords: ["jadwal", "kapan", "tanggal", "alur", "tahapan", "spmb", "waktu", "pendaftaran dibuka", "pengumuman"],
    status: KBStatus.PUBLISHED,
  },
  {
    title: "Jalur dan Kuota SPMB",
    category: "JALUR",
    content: "Terdapat 3 jalur seleksi SPMB di SMKN 1 Adiwerna:\n1. Jalur Prestasi: kuota paling sedikit 75% (penilaian nilai rapor semester 1-5, TKA, dan kejuaraan).\n2. Jalur Afirmasi: kuota paling sedikit 15% (anak disabilitas maks 2%, keluarga ekonomi tidak mampu DTSEN desil 1-4, anak panti maks 3%, anak tidak sekolah/ATS maks 2%).\n3. Jalur Domisili Terdekat: kuota paling banyak 10% (jarak tempat tinggal terdekat ke sekolah berdasar KK yang diterbitkan minimal 1 tahun sebelum pendaftaran).",
    keywords: ["jalur", "kuota", "persentase", "prestasi", "afirmasi", "zonasi", "domisili", "penerimaan"],
    status: KBStatus.PUBLISHED,
  },
  {
    title: "Persyaratan Dokumen SPMB",
    category: "PERSYARATAN",
    content: "Dokumen yang harus disiapkan untuk mendaftar SPMB SMKN 1 Adiwerna:\n1. Buku Rapor SMP/Sederajat semester 1 s.d 5\n2. Surat Keterangan Nilai Rapor semester 1-5\n3. Sertifikat Hasil TKA (Tes Kemampuan Akademik)\n4. Surat Keterangan Lulus (SKL) / Ijazah SMP\n5. Akta Kelahiran (usia maksimal 21 tahun per 1 Juli)\n6. Kartu Keluarga (KK minimal diterbitkan 1 tahun sebelum 14 Juni 2026)\n7. Surat Pernyataan Sehat\n8. Surat Pernyataan Tidak Buta Warna (wajib untuk 6 jurusan teknik)\n9. Surat Pernyataan Kebenaran Dokumen / Pakta Integritas\n10. Piagam Prestasi & SK Organisasi (jika memiliki).",
    keywords: ["syarat", "persyaratan", "dokumen", "berkas", "rapor", "kk", "akta", "tka", "skl", "ijazah"],
    status: KBStatus.PUBLISHED,
  },
  {
    title: "Ketentuan dan Syarat Tes Buta Warna",
    category: "FAQ",
    content: "Jurusan yang MEWAJIBKAN Surat Pernyataan Tidak Buta Warna di SMKN 1 Adiwerna:\n1. Desain Pemodelan dan Informasi Bangunan (DPIB) - WAJIB\n2. Teknik Mesin (TM) - WAJIB\n3. Teknik Otomotif (TO) - WAJIB\n4. Teknik Elektronika (TE) - WAJIB\n5. Teknik Ketenagalistrikan (TK) - WAJIB\n6. Teknik Jaringan Komputer dan Telekomunikasi (TJKT) - WAJIB\n\nJurusan yang TIDAK MEWAJIBKAN tes buta warna:\n7. Teknik Pengelasan dan Fabrikasi Logam (TPFL) - TIDAK WAJIB.\nScreening mandiri dapat diakses via: antrian.smknladw.sch.id.",
    keywords: ["buta warna", "tes buta warna", "syarat buta warna", "kesehatan", "mata", "parsial"],
    status: KBStatus.PUBLISHED,
  },
  {
    title: "Jurusan TJKT (Teknik Jaringan Komputer dan Telekomunikasi)",
    category: "JURUSAN",
    content: "Jurusan TJKT mempelajari perakitan PC/laptop, instalasi sistem operasi, jaringan LAN/WAN/Fiber Optic, administrasi server, dan keamanan siber (cyber security).\nDaya tampung: 144 murid.\nPersyaratan: WAJIB tidak buta warna.\nMitra industri: PT GO-OPTIX Indonesia, PT Telkom Indonesia, PT Delameta Bilano, PT Telkomsel, Citranet.\nWarna stopmap saat daftar ulang: MERAH.",
    keywords: ["tjkt", "tkj", "komputer", "jaringan", "it", "telekomunikasi", "kuota tjkt", "jurusan tjkt"],
    status: KBStatus.PUBLISHED,
  },
  {
    title: "Jurusan TO (Teknik Otomotif)",
    category: "JURUSAN",
    content: "Jurusan Teknik Otomotif memiliki 2 konsentrasi: Teknik Kendaraan Ringan (TKR/mobil) dan Teknik Alat Berat (TAB/excavator, forklift).\nDaya tampung: 144 murid.\nPersyaratan: WAJIB tidak buta warna.\nMitra industri: PT Nasmoco Pratama, PT Daihatsu Astra, PT Nissan Motor, BPM Autowork.\nWarna stopmap saat daftar ulang: BIRU.",
    keywords: ["to", "tkr", "otomotif", "alat berat", "mobil", "motor", "kuota to", "jurusan to"],
    status: KBStatus.PUBLISHED,
  },
  {
    title: "Jurusan TPFL (Teknik Pengelasan dan Fabrikasi Logam)",
    category: "JURUSAN",
    content: "Jurusan TPFL mempelajari berbagai teknik pengelasan (SMAW, GMAW, GTAW), pemotongan logam, dan fabrikasi konstruksi baja.\nDaya tampung: 72 murid.\nPersyaratan buta warna: TIDAK WAJIB (bebas dari syarat buta warna).\nWarna stopmap saat daftar ulang: MERAH.",
    keywords: ["tpfl", "las", "pengelasan", "fabrikasi", "kuota tpfl", "jurusan las"],
    status: KBStatus.PUBLISHED,
  },
  {
    title: "Jurusan TK (Teknik Ketenagalistrikan)",
    category: "JURUSAN",
    content: "Jurusan TK mempelajari instalasi penerangan, instalasi tenaga listrik, motor listrik, dan otomasi industri berbasis PLC.\nDaya tampung: 108 murid.\nPersyaratan: WAJIB tidak buta warna.\nWarna stopmap saat daftar ulang: KUNING.",
    keywords: ["tk", "listrik", "ketenagalistrikan", "kuota tk", "jurusan listrik"],
    status: KBStatus.PUBLISHED,
  },
  {
    title: "Jurusan TM (Teknik Mesin)",
    category: "JURUSAN",
    content: "Jurusan Teknik Mesin mempelajari pembubutan, frais/milling, perancangan mekanik CAD/CAM, dan mesin CNC presisi.\nDaya tampung: 108 murid.\nPersyaratan: WAJIB tidak buta warna.\nWarna stopmap saat daftar ulang: BIRU.",
    keywords: ["tm", "mesin", "bubut", "cnc", "frais", "kuota tm", "jurusan mesin"],
    status: KBStatus.PUBLISHED,
  },
  {
    title: "Jurusan TE (Teknik Elektronika)",
    category: "JURUSAN",
    content: "Jurusan Teknik Elektronika mempelajari mikrokontroler, IoT, perakitan sirkuit PCB, sistem kendali elektronika industri, dan robotika dasar.\nDaya tampung: 144 murid.\nPersyaratan: WAJIB tidak buta warna.\nWarna stopmap saat daftar ulang: MERAH.",
    keywords: ["te", "elektronika", "robotik", "iot", "kuota te", "jurusan elektronika"],
    status: KBStatus.PUBLISHED,
  },
  {
    title: "Jurusan DPIB (Desain Pemodelan dan Informasi Bangunan)",
    category: "JURUSAN",
    content: "Jurusan DPIB (arsitektur/teknik sipil) mempelajari gambar 2D/3D bangunan, AutoCad, Revit BIM, estimasi biaya konstruksi (RAB), dan ukur tanah (theodolite).\nDaya tampung: 144 murid.\nPersyaratan: WAJIB tidak buta warna.\nWarna stopmap saat daftar ulang: HIJAU.",
    keywords: ["dpib", "arsitek", "bangunan", "gambar", "autocad", "desain bangunan", "kuota dpib"],
    status: KBStatus.PUBLISHED,
  },
  {
    title: "Prosedur dan Jadwal Daftar Ulang",
    category: "DAFTAR_ULANG",
    content: "Daftar ulang calon murid yang diterima dilaksanakan 22-25 Juni 2026 di SMKN 1 Adiwerna (08.00-15.00 WIB).\nJadwal per jurusan:\n- Senin, 22 Juni 2026: TPFL, TK, TM\n- Selasa, 23 Juni 2026: DPIB, TE\n- Rabu, 24 Juni 2026: TO, TJKT\nSeluruh proses daftar ulang GRATIS (Rp0). CMB wajib membawa stopmap sesuai warna jurusan dan dokumen asli beserta fotokopi.",
    keywords: ["daftar ulang", "jadwal daftar ulang", "stopmap", "warna map", "registrasi", "ulang"],
    status: KBStatus.PUBLISHED,
  },
  {
    title: "Kontak Panitia dan Kendala Teknis SPMB",
    category: "KONTAK",
    content: "Jika mengalami kendala NISN tidak ditemukan atau kendala pendaftaran akun:\n- Layanan helpdesk langsung: Kampus SMKN 1 Adiwerna, Jl. Raya II Pesarean, Adiwerna, Tegal.\n- Jam layanan: Senin-Jumat pukul 08.00 s.d 15.00 WIB.\n- Email bantuan: mail@smkn1adw.sch.id\n- Portal antrian verifikasi: antrian.smknladw.sch.id\n- Portal resmi SPMB: spmb.jatengprov.go.id",
    keywords: ["kontak", "panitia", "bantuan", "helpdesk", "cs", "telepon", "lokasi", "kendala"],
    status: KBStatus.PUBLISHED,
  },
];

async function main() {
  console.log("🌱 Starting seed...");

  // 1. Seed Admin User
  const email = process.env.ADMIN_EMAIL ?? "admin@tivask.local";
  const password = process.env.ADMIN_PASSWORD ?? "password123";
  const passwordHash = await bcrypt.hash(password, 10);

  const admin = await prisma.adminUser.upsert({
    where: { email },
    update: { passwordHash },
    create: { email, passwordHash },
  });
  console.log(`👤 Admin ready: ${admin.email}`);

  // 2. Seed WhatsApp Session singleton
  await prisma.whatsAppSession.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      status: "disconnected",
    },
  });
  console.log("📱 WhatsApp session singleton ready.");

  // 3. Seed Knowledge Base Entries
  let kbCount = 0;
  for (const entry of initialKBEntries) {
    const existing = await prisma.knowledgeBaseEntry.findFirst({
      where: { title: entry.title },
    });

    if (!existing) {
      await prisma.knowledgeBaseEntry.create({
        data: entry,
      });
      kbCount++;
    }
  }
  console.log(`📚 Seeded ${kbCount} Knowledge Base entries.`);
  console.log("✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
