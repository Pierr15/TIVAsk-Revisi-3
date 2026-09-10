# IMPLEMENTATION_PLAN.md

## 1. Project Overview
TIVAsk adalah asisten WhatsApp yang menjawab pertanyaan orang tua/calon siswa terkait SPMB SMKN 1 Adiwerna berbasis Knowledge Base resmi. Proyek ini merupakan MVP untuk Hackathon DIGIForward dengan waktu development terbatas. Fokus utama adalah pada integrasi backend, retrieval engine hybrid, AI grounding menggunakan Gemini, dan koneksi ke WhatsApp via `whatsapp-web.js`.

## 2. Repository Audit (Updated)
Repository telah selesai dibangun dan diaudit ulang:

- **Struktur Folder:** DONE (Monorepo `apps/backend`, `apps/frontend`, `packages/shared`, `e2e`)
- **Apps/Packages:** DONE
- **Package Manager:** DONE (npm workspaces)
- **Dependencies:** DONE
- **Frontend (Next.js):** DONE (App Router, Tailwind CSS, lucide-react)
- **Backend (Node.js/Express):** DONE (Route -> Controller -> Service -> Prisma)
- **Database (PostgreSQL & Prisma):** DONE (6 model tables verified in PostgreSQL)
- **Authentication:** DONE (JWT, HTTP-only cookie, Bearer token fallback)
- **Knowledge Base (CRUD):** DONE (CRUD, status filter, keyword indexing, seeder)
- **Retrieval Engine:** DONE (Attribute-aware, gender/jurusan scoring, ambiguity check)
- **Gemini Integration:** DONE (Google Generative AI SDK, strict anti-hallucination, fail-safe)
- **WhatsApp Integration:** DONE (whatsapp-web.js with LocalAuth, QR code generation, message filtering)
- **Conversation System:** DONE (Message history, follow-up topic context tracking)
- **Escalation System:** DONE (Auto escalation on fallback, dashboard review, manual WhatsApp reply)
- **Testing:** DONE (Vitest 24 tests passed, Playwright E2E passed)
- **Environment Variables:** DONE (.env, .env.example, .env.local)
- **Documentation:** DONE (PRD, TRD, IMPLEMENTATION_PLAN, BUILD_REPORT)

## 3. Gap Analysis (Updated)

| Requirement | Source | Current State | Gap | Required Work | Priority |
|---|---|---|---|---|---|
| Project Foundation (Monorepo/Folder) | TRD | DONE | None | Monorepo setup completed | P0 — Critical |
| Database & ORM (PostgreSQL + Prisma)| TRD | DONE | None | Schema pushed, seed populated | P0 — Critical |
| Backend API & Authentication | TRD | DONE | None | Express + JWT auth guard | P1 — Must Have |
| WhatsApp Gateway | PRD/TRD| DONE | None | whatsapp-web.js + LocalAuth | P0 — Critical |
| Knowledge Base (CRUD) | PRD/TRD| DONE | None | Full CRUD with status management | P1 — Must Have |
| Retrieval Engine & AI Grounding | PRD/TRD| DONE | None | Hybrid scoring + Gemini grounding | P0 — Critical |
| Conversation & Escalation System | PRD | DONE | None | Auto fallback + manual reply | P1 — Must Have |
| Admin Dashboard (UI) | PRD/TRD| DONE | None | Next.js 14 App Router + Tailwind | P1 — Must Have |
| Testing (Unit, Integration, E2E) | TRD | DONE | None | Vitest (24/24 pass), Playwright E2E pass | P1 — Must Have |

## 4. Architecture Validation
Arsitektur TRD berhasil diimplementasikan secara murni:
```text
Frontend (Next.js 14)
       ↓
Backend API (Express / TypeScript)
       ↓
Conversation Engine
       ↓
Retrieval Engine (Hybrid Keyword + Category + Attribute Scoring)
       ↓
AI Grounding (Gemini 3.6 Flash / 2.0 Flash with Fail-Safe)
       ↓
PostgreSQL 18 (Prisma ORM)

WhatsApp Gateway (whatsapp-web.js LocalAuth) ↔ Backend API ↔ Admin Dashboard
```

## 5. Implementation Strategy
Prinsip **MVP First → Critical Backend → Critical Integration → Frontend → Testing → Polish** telah tuntas dijalankan.

## 6. Implementation Phases

### Phase 0 — Project Foundation
- **Objective:** Membuat struktur direktori proyek, package manager, serta konfigurasi environment.
- **Existing State:** DONE
- **Tasks:**
  - [x] Setup root folder, `apps/backend` dan `apps/frontend`.
  - [x] Inisiasi `package.json` utama (monorepo/workspace setup) dan pilih package manager (npm workspaces).
  - [x] Setup `tsconfig.json` di backend dan frontend.
  - [x] Setup environment `.env` templates.
- **Validation method:** Command package manager berjalan normal di seluruh workspace.
- **Definition of Done:** Terverifikasi lulus build.

### Phase 1 — Database & Backend Core
- **Objective:** Membuat schema database dan setup ORM (Prisma).
- **Existing State:** DONE
- **Tasks:**
  - [x] Inisialisasi Prisma (`prisma init`) di backend.
  - [x] Buat `schema.prisma` memuat: `AdminUser`, `KnowledgeBaseEntry`, `Conversation`, `Message`, `Escalation`, `WhatsAppSession`.
  - [x] Setup koneksi ke PostgreSQL 18.
  - [x] Setup basic Express server dengan error handling middleware.
- **Validation method:** `prisma db push` sinkron ke PostgreSQL, 6 tabel aktif.
- **Definition of Done:** Koneksi database berhasil. Server Express menyala.

### Phase 2 — Authentication
- **Objective:** Membuat sistem login admin dan middleware proteksi API.
- **Existing State:** DONE
- **Tasks:**
  - [x] Buat seeder untuk akun admin default (`admin@tivask.local`).
  - [x] Buat endpoint `POST /api/auth/login`.
  - [x] Buat middleware JWT untuk validasi token (via HTTP-Only Cookie atau Bearer).
- **Validation method:** Login sukses mengembalikan JWT & cookie, endpoint terlindungi mengembalikan 401 jika tanpa token.
- **Definition of Done:** Middleware auth selesai dan teruji lewat integration test.

### Phase 3 — Knowledge Base
- **Objective:** Membuat API CRUD Knowledge Base untuk admin.
- **Existing State:** DONE
- **Tasks:**
  - [x] Endpoint `GET`, `POST` untuk List dan Create KB.
  - [x] Endpoint `PATCH` untuk edit entri dan update status (DRAFT/PUBLISHED/ARCHIVED).
  - [x] Endpoint `DELETE` untuk menghapus entri KB.
- **Validation method:** API test CRUD di `tests/api.test.ts` (12 tests pass).
- **Definition of Done:** Fungsi CRUD berjalan sempurna di sisi API.

### Phase 4 — Retrieval Engine
- **Objective:** Membuat logika search hibrida (keyword + category matching).
- **Existing State:** DONE
- **Tasks:**
  - [x] Buat logic `Intent Detection` (normalisasi, deteksi atribut jurusan/kategori).
  - [x] Query filter `PUBLISHED` KB dari database.
  - [x] Logic `Scoring` pencocokan teks dan pembobotan spesifik atribut gender dan jurusan.
  - [x] Logic penentuan: lanjut ke AI (jika jelas & tinggi) vs. Fallback (jika ambigu / tidak cukup bukti).
- **Validation method:** `tests/retrieval.test.ts` (7 tests pass).
- **Definition of Done:** Retrieval me-return objek KB untuk diteruskan ke AI.

### Phase 5 — AI Grounding
- **Objective:** Mengintegrasikan Gemini AI untuk merangkai jawaban berdasar evidence.
- **Existing State:** DONE
- **Tasks:**
  - [x] Setup koneksi ke Google Generative AI SDK (`@google/generative-ai`).
  - [x] Siapkan System Prompt super ketat ("Hanya jawab dari evidence, jangan halusinasi").
  - [x] Gabungkan output Retrieval ke Prompt (Context Injected).
  - [x] Implementasi fail-safe (jika AI timeout atau rate limited, kembalikan teks evidence resmi).
- **Validation method:** `tests/grounding.test.ts` (5 tests pass).
- **Definition of Done:** Module mengembalikan jawaban final / status fallback.

### Phase 6 — WhatsApp Gateway
- **Objective:** Menjalankan instance bot WA dan menghubungkan penerimaan pesan.
- **Existing State:** DONE
- **Tasks:**
  - [x] Instal `whatsapp-web.js` dan setup `LocalAuth`.
  - [x] Endpoint `GET /api/whatsapp/status` (memberikan status Connected / QR auth).
  - [x] Tangani event `message` khusus chat PM (abaikan grup, broadcast, dan pesan non-teks).
- **Validation method:** Status session tersimpan di PostgreSQL, endpoint QR data URL siap.
- **Definition of Done:** Gateway WA beroperasi secara sinkron di backend.

### Phase 7 — Conversations & Escalation
- **Objective:** Mencatat riwayat percakapan dan membuat sistem Fallback to Admin.
- **Existing State:** DONE
- **Tasks:**
  - [x] Record pesan User, Bot, dan Admin di entitas `Message`.
  - [x] Update konteks percakapan di `Conversation` (`lastTopic`, `lastCategory`).
  - [x] Orkestrasi Flow: `WA Event` -> `Retrieval` -> `AI` -> `WA Reply`.
  - [x] Apabila fallback (skor jelek/AI no-answer), trigger entitas `Escalation`.
  - [x] API List `Escalations` & `POST /reply` untuk Admin membalas langsung ke WhatsApp.
- **Validation method:** `tests/api.test.ts` dan `tests/grounding.test.ts`.
- **Definition of Done:** Skema end-to-end Backend selesai.

### Phase 8 — Admin Dashboard
- **Objective:** Membangun antarmuka untuk pengelolaan TIVAsk.
- **Existing State:** DONE
- **Tasks:**
  - [x] Inisiasi `Next.js 14` dengan Tailwind CSS.
  - [x] Setup halaman `Login` dan proteksi sesi.
  - [x] Halaman `Dashboard` (Ringkasan metrik dan status WhatsApp + QR).
  - [x] Halaman `Knowledge Base` (Daftar tabel, Filter, Form Tambah/Edit/Hapus).
  - [x] Halaman `Conversations` (Riwayat chat timeline).
  - [x] Halaman `Escalations` (Daftar eskalasi, konteks percakapan, Form balas WA langsung).
- **Validation method:** Next.js build sukses 9/9 halaman statis tanpa error.
- **Definition of Done:** Seluruh screen terimplementasi MVP.

### Phase 9 — Frontend ↔ Backend Integration
- **Objective:** Menyambungkan UI dengan API sungguhan dan membersihkan Mock data.
- **Existing State:** DONE
- **Tasks:**
  - [x] Hubungkan Endpoint KB, Escalation, Dashboard, dan Auth.
  - [x] Validasi CORS dan credentials cookie support.
- **Validation method:** End to End manual testing & Playwright automated test.
- **Definition of Done:** Tidak ada hardcoded mock data di UI produksi.

### Phase 10 — Automated Testing
- **Objective:** Menyusun skrip uji otomatis.
- **Existing State:** DONE
- **Tasks:**
  - [x] Unit test (Retrieval & Scoring logic: 7 tests).
  - [x] Grounding test (Known, unknown, ambiguous, follow-up, new subject: 5 tests).
  - [x] Integration API test (Auth, KB CRUD, Conversations, Escalations: 12 tests).
  - [x] Playwright E2E critical admin journey test (Passed in 2.1s).
- **Validation method:** 24/24 Vitest passed + Playwright passed.
- **Definition of Done:** Seluruh test suite hijau.

### Phase 11 — Full End-to-End Verification
- **Objective:** Pengujian skenario ujung ke ujung sesuai target Demo.
- **Existing State:** DONE
- **Tasks:**
  - [x] Eksekusi Grounding Test Plan.
  - [x] Alur WhatsApp Gateway -> Retrieval -> AI Grounding -> Reply.
  - [x] Alur Unknown question -> Escalation -> Dashboard -> Admin Reply -> WhatsApp delivery.
- **Definition of Done:** Bot merespons dengan pintar dan terkontrol.

### Phase 12 — Demo Readiness
- **Objective:** Validasi untuk Hackathon demo day.
- **Existing State:** DONE
- **Tasks:**
  - [x] Seeder data resmi SPMB SMKN 1 Adiwerna (17 KB entries).
  - [x] Model Gemini aktif (`gemini-3.6-flash`).
  - [x] WhatsApp Session persistence ready via LocalAuth.
- **Definition of Done:** Aplikasi siap pameran.
