# PRD-TIVAsk-Revised.md

**Project:** TIVAsk (TI Virtual Assistant School Knowledge)
**Program:** Hackathon DIGIForward | **Tim:** Adaptiva — SMK Negeri 1 Adiwerna
**Versi:** 1.1 (Simplified) | **Tanggal:** 10 September 2026

---

## 1. Executive Summary

TIVAsk adalah asisten WhatsApp yang menjawab pertanyaan orang tua/calon siswa terkait SPMB SMKN 1 Adiwerna, hanya berdasarkan Knowledge Base resmi sekolah. Jika informasi tidak tersedia/tidak jelas, bot melakukan eskalasi ke admin manusia melalui Admin Dashboard.

## 2. Problem Statement

Saat musim SPMB, panitia menerima banyak pertanyaan berulang via WhatsApp secara manual → respons lambat, jawaban tidak konsisten, beban kerja panitia tinggi.

## 3. Vision & Objectives

Menjadi asisten SPMB pertama yang dihubungi orang tua — cepat, akurat, berbasis sumber resmi, dengan eskalasi manusia sebagai jaring pengaman.

| Objective | Ukuran Keberhasilan |
|---|---|
| Kurangi beban tanya-jawab manual | Pertanyaan umum terjawab otomatis oleh bot |
| Jaga akurasi informasi | Tidak ada jawaban bertentangan dengan KB resmi |
| Jalur eskalasi jelas | Pertanyaan tak terjawab tercatat & bisa direspons admin |
| Mudah dikelola | Admin update KB tanpa bantuan developer |

## 4. Target Users

| Persona | Kebutuhan |
|---|---|
| Orang tua/calon siswa | Jawaban cepat & jelas via WhatsApp, tanpa app baru |
| Admin/Panitia SPMB | Dashboard sederhana, tanpa training panjang |

## 5. Product Scope

### Must Have (MVP)
- Chatbot WhatsApp: terima & balas pesan, menu awal, jawaban berbasis KB.
- Grounding AI: jawab hanya dari KB, fallback jika bukti tidak cukup.
- Fallback/eskalasi: percakapan tak terjawab otomatis masuk daftar eskalasi; admin bisa balas manual.
- Knowledge Base: admin CRUD entri (title, kategori, isi, status).
- Admin Dashboard: login, ringkasan, daftar percakapan, daftar & balas eskalasi.
- Follow-up context: bot paham pertanyaan lanjutan dalam topik sama (mis. ganti gender/jurusan).

### Should Have
- Filter/pencarian pada daftar percakapan & eskalasi.
- Indikator status koneksi WhatsApp di dashboard.

### Could Have
- Statistik dasar (jumlah percakapan/eskalasi harian).

### Post-MVP (di luar hackathon ini)
- Multi-admin/RBAC, multi-channel, analytics mendalam, source-tracking granular, broadcast massal.

> **Technical Decision:** Role admin dibuat single-role (tanpa RBAC) karena tim hanya punya satu akun panitia dan waktu terbatas.

## 6. User Journey (ringkas)

**Orang tua:** kirim pesan → bot cari jawaban di KB → cukup bukti? Ya → jawab. Tidak → fallback + buat eskalasi.

**Admin:** login → lihat ringkasan → kelola KB → buka eskalasi → balas manual → tandai resolved.

## 7. Functional Requirements (ringkas)

| ID | Requirement |
|---|---|
| FR-WA | Terima pesan teks pribadi (bukan grup/self), balas < 10 detik, pesan non-teks dibalas pesan standar |
| FR-KB | Admin CRUD entri KB; status Draft/Published/Archived; hanya Published dipakai bot |
| FR-AI | Jawab hanya dari evidence KB Published; fallback jika bukti tak cukup; tangani follow-up tanpa mencampur topik lama; tidak mengarang angka |
| FR-ESC | Fallback otomatis buat eskalasi; admin lihat, balas, dan resolve eskalasi dari dashboard |
| FR-DASH | Login/logout admin; ringkasan jumlah percakapan & eskalasi; riwayat chat per nomor |

## 8. Non-Functional Requirements

- **Security:** password di-hash, semua endpoint (kecuali login) butuh autentikasi, token punya masa berlaku.
- **Performance:** target respons bot < 10 detik pada kondisi normal.
- **UX:** bahasa bot ramah & mudah dipahami; pesan fallback jelas menyatakan akan diteruskan ke admin; dashboard mudah dipakai admin non-teknis.

## 9. Constraints

- Waktu development sangat terbatas (hackathon 11–12 September 2026).
- Backend & PostgreSQL berjalan lokal saat demo (bukan cloud).
- WhatsApp pakai nomor cadangan (risiko ban diterima sebagai keputusan proyek).
- Knowledge Base awal sudah disiapkan sekolah.

## 10. Acceptance Criteria & Definition of Done

Setiap fitur Must Have diberi status **PASS/FAIL/BLOCKED** berdasarkan FR terkait (lihat bagian 7). Detail test case ada di TRD.

Fitur dianggap **Done** jika: Implemented + Terhubung end-to-end + Tervalidasi + Teruji + Menangani error + Lolos critical E2E terkait.

## 11. Success & Demo Criteria

**Success:** bot benar untuk semua known question, fallback (bukan mengarang) untuk unknown question; KB baru langsung terpakai; eskalasi sampai ke admin tanpa kehilangan konteks.

**Demo:** (1) bot jawab benar 3 topik berbeda, (2) satu skenario follow-up dijawab benar, (3) satu pertanyaan di luar KB → fallback + muncul di dashboard, (4) admin balas eskalasi dan sampai ke WhatsApp, (5) admin tambah KB baru → langsung terpakai bot.

## 12. Risks & Mitigations

| Risiko | Mitigasi |
|---|---|
| WhatsApp session terputus saat demo | Indikator status di dashboard + uji stabilitas H-1 |
| Retrieval salah ambil konteks | Strategi retrieval hybrid keyword+category (lihat TRD) + test case grounding |
| Waktu development terbatas | MVP First, fitur kompleks ditandai Post-MVP |
| Demo bergantung 1 device/jaringan lokal | Uji end-to-end di lokasi & perangkat yang sama dengan demo |

---

*Detail implementasi teknis ada di `TRD-TIVAsk-Revised.md`.*
