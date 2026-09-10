import { prisma } from "../../lib/prisma";
import { KnowledgeBaseEntry } from "@prisma/client";

export interface ExtractedAttributes {
  gender?: "laki-laki" | "perempuan";
  jurusan?: "TJKT" | "TO" | "TPFL" | "TK" | "TM" | "TE" | "DPIB";
  category?: string;
  isFollowUp?: boolean;
}

export interface RetrievalResult {
  match: KnowledgeBaseEntry | null;
  score: number;
  reason: "MATCH_FOUND" | "NO_EVIDENCE" | "AMBIGUOUS" | "WRONG_CATEGORY";
  resolvedTopic?: string;
  resolvedCategory?: string;
}

export class RetrievalService {
  normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  detectAttributes(text: string): ExtractedAttributes {
    const norm = this.normalizeText(text);
    const words = norm.split(" ");
    const attrs: ExtractedAttributes = {};

    // 1. Gender detection
    const femaleWords = ["perempuan", "wanita", "cewek", "putri", "siswi", "jilbab", "kerudung", "rok"];
    const maleWords = ["laki", "pria", "cowok", "putra", "celana"];

    if (femaleWords.some((w) => words.includes(w))) {
      attrs.gender = "perempuan";
    } else if (maleWords.some((w) => words.includes(w))) {
      attrs.gender = "laki-laki";
    }

    // 2. Jurusan detection
    if (/\b(tjkt|tkj|komputer|jaringan|it|telekomunikasi)\b/.test(norm)) {
      attrs.jurusan = "TJKT";
    } else if (/\b(to|tkr|tab|otomotif|mobil|alat berat)\b/.test(norm)) {
      attrs.jurusan = "TO";
    } else if (/\b(tpfl|las|pengelasan|fabrikasi)\b/.test(norm)) {
      attrs.jurusan = "TPFL";
    } else if (/\b(tk|listrik|ketenagalistrikan)\b/.test(norm)) {
      attrs.jurusan = "TK";
    } else if (/\b(tm|mesin|bubut|cnc|frais)\b/.test(norm)) {
      attrs.jurusan = "TM";
    } else if (/\b(te|elektronika|elektro|robot|iot)\b/.test(norm)) {
      attrs.jurusan = "TE";
    } else if (/\b(dpib|arsitek|bangunan|sipil|autocad|gambar)\b/.test(norm)) {
      attrs.jurusan = "DPIB";
    }

    // 3. Category detection
    if (/\b(biaya|spp|bayar|uang|tarif|seragam|gratis)\b/.test(norm)) {
      attrs.category = "BIAYA";
    } else if (/\b(jadwal|kapan|tanggal|waktu|tahapan|alur|dibuka|tutup|pengumuman)\b/.test(norm)) {
      attrs.category = "JADWAL";
    } else if (/\b(jalur|kuota|afirmasi|prestasi|domisili)\b/.test(norm)) {
      attrs.category = "JALUR";
    } else if (/\b(syarat|persyaratan|berkas|dokumen|ijazah|skl|rapor|raport|akta|kk)\b/.test(norm)) {
      attrs.category = "PERSYARATAN";
    } else if (/\b(daftar ulang|registrasi ulang|stopmap)\b/.test(norm)) {
      attrs.category = "DAFTAR_ULANG";
    } else if (/\b(buta warna|tes|mata)\b/.test(norm)) {
      attrs.category = "FAQ";
    } else if (/\b(profil|alamat|lokasi|sejarah|telepon|email|kontak|hubungi)\b/.test(norm)) {
      attrs.category = "PROFIL";
    }

    // 4. Follow-up detection (e.g., "kalau perempuan?", "kalo to?", "bagaimana yang cewek?")
    if (/^(kalau|kalo|bagaimana|gimana|lalu|klo)\b/.test(norm) && words.length <= 5) {
      attrs.isFollowUp = true;
    }

    return attrs;
  }

  private canonicalize(text: string): string {
    return this.normalizeText(text)
      .replace(/\b(smkn|smk negeri) 1 adiwerna\b/g, "sekolah")
      .replace(/\bteknik jaringan komputer dan telekomunikasi\b/g, "tjkt")
      .replace(/\bteknik pengelasan dan fabrikasi logam\b/g, "tpfl")
      .replace(/\bdesain pemodelan dan informasi bangunan\b/g, "dpib")
      .replace(/\bteknik otomotif\b/g, "to")
      .replace(/\bteknik ketenagalistrikan\b/g, "tk")
      .replace(/\bteknik mesin\b/g, "tm")
      .replace(/\bteknik elektronika\b/g, "te")
      // Only equivalent names are aliases. Subjects such as CNC, mobil, and
      // listrik must remain separate terms when checking evidence coverage.
      .replace(/\btkj\b/g, "tjkt")
      .replace(/\b(laki laki|laki|pria|cowok|putra)\b/g, "putra")
      .replace(/\b(perempuan|wanita|cewek|putri|siswi)\b/g, "putri")
      .replace(/\b(daftar ulang|registrasi ulang)\b/g, "daftarulang")
      .replace(/\bdaya tampung\b/g, "kuota")
      .replace(/\b(mendaftar|daftar)\b/g, "pendaftaran")
      .replace(/\b(persyaratan|berkas)\b/g, "syarat")
      .replace(/\braport\b/g, "rapor")
      .replace(/\b(membayar|bayar|tarif|harga)\b/g, "biaya");
  }

  resolveContext(
    currentQuery: string,
    lastTopic?: string | null,
    lastCategory?: string | null
  ): { queryToUse: string; attributes: ExtractedAttributes } {
    const currentAttrs = this.detectAttributes(currentQuery);
    if (currentAttrs.isFollowUp && lastTopic && !currentAttrs.category) {
      const previous = this.detectAttributes(lastTopic);
      const attributes: ExtractedAttributes = {
        ...previous,
        ...currentAttrs,
        category: lastCategory || previous.category,
      };
      const oldAttributes = new Set(["putra", "putri", "siswa", "tjkt", "to", "tpfl", "tk", "tm", "te", "dpib"]);
      const topic = this.canonicalize(lastTopic).split(" ").filter((word) => !oldAttributes.has(word)).join(" ");
      const gender = attributes.gender === "laki-laki" ? "putra" : attributes.gender === "perempuan" ? "putri" : "";
      return {
        // Pertanyaan baru tetap disertakan agar topik tambahan tidak hilang.
        queryToUse: [topic, this.canonicalize(currentQuery), gender, attributes.jurusan || ""].join(" ").trim(),
        attributes,
      };
    }
    return { queryToUse: currentQuery, attributes: currentAttrs };
  }

  private hasTopicEvidence(entry: KnowledgeBaseEntry, query: string): boolean {
    // Kata penghubung dibuang; subjek spesifik seperti beasiswa/kursus/Jepang tetap diperiksa.
    const ignored = new Set([
      "apa", "apakah", "berapa", "berapakah", "bagaimana", "gimana", "kapan", "dimana", "mana", "siapa", "mengapa", "kenapa",
      "saya", "kami", "kamu", "anda", "aku", "mau", "ingin", "dengar", "katanya", "tolong", "mohon", "dong", "ya", "yah", "kah",
      "ada", "adalah", "itu", "ini", "yang", "untuk", "dan", "atau", "di", "ke", "dari", "dengan", "tentang", "terkait",
      "kalau", "kalo", "klo", "lalu", "saja", "saat", "pada", "oleh", "nya", "seputar", "mengenai",
      "perlu", "harus", "bisa", "dapat", "boleh", "butuh", "disiapkan", "mempersiapkan", "masuk", "pelaksanaan",
      "sekolah", "smkn", "smk", "negeri", "adiwerna", "adb", "spmb", "ppdb", "siswa", "siswi", "murid", "calon",
      "ketentuan", "panduan", "informasi", "resmi", "jurusan", "teknik", "hari"
    ]);
    const terms = [...new Set(this.canonicalize(query).split(" "))]
      .filter((word) => (word.length > 1 || /^\d$/.test(word)) && !ignored.has(word));
    if (!terms.length) return false;
    // Keywords hanya membantu peringkat; bukti harus terdapat di judul/isi.
    const evidence = entry.title + " " + entry.content;
    const evidenceWords = new Set([
      ...this.canonicalize(evidence).split(" "),
      ...this.normalizeText(evidence).split(" "),
    ]);
    return terms.every((term) => evidenceWords.has(term));
  }

  scoreEntry(
    entry: KnowledgeBaseEntry,
    normalizedQuery: string,
    queryTokens: string[],
    attributes: ExtractedAttributes
  ): number {
    let score = 0;
    const normTitle = this.normalizeText(entry.title);
    const normContent = this.normalizeText(entry.content);

    // 1. Keyword exact matching
    for (const kw of entry.keywords) {
      const normKw = this.normalizeText(kw);
      if (normalizedQuery.includes(normKw)) {
        score += 6;
      }
    }

    // 2. Title token matching
    for (const token of queryTokens) {
      if (token.length > 2 && normTitle.includes(token)) {
        score += 4;
      }
    }

    // 3. Content token matching (mild weight)
    for (const token of queryTokens) {
      if (token.length > 3 && normContent.includes(token)) {
        score += 1;
      }
    }

    // 4. Category alignment
    if (attributes.category && entry.category === attributes.category) {
      score += 5;
    }

    // 5. Gender attribute-awareness
    if (attributes.gender === "perempuan") {
      if (normTitle.includes("perempuan") || normTitle.includes("siswi")) {
        score += 15;
      }
      if (normTitle.includes("laki-laki") || normTitle.includes("siswa")) {
        score -= 25; // Strict penalty for opposite gender
      }
    } else if (attributes.gender === "laki-laki") {
      if (normTitle.includes("laki-laki") || normTitle.includes("siswa")) {
        score += 15;
      }
      if (normTitle.includes("perempuan") || normTitle.includes("siswi")) {
        score -= 25; // Strict penalty for opposite gender
      }
    }

    // 6. Jurusan attribute-awareness
    if (attributes.jurusan) {
      if (normTitle.includes(attributes.jurusan.toLowerCase())) {
        score += 15;
      } else if (entry.category === "JURUSAN") {
        score -= 20; // Penalty for wrong department
      }
    }

    return score;
  }

  async findEvidence(
    rawQuery: string,
    lastTopic?: string | null,
    lastCategory?: string | null
  ): Promise<RetrievalResult> {
    const { queryToUse, attributes } = this.resolveContext(rawQuery, lastTopic, lastCategory);
    const normalizedQuery = this.normalizeText(queryToUse);
    const queryTokens = normalizedQuery.split(" ").filter((t) => t.length > 1);

    // Only PUBLISHED entries per PRD/TRD rule
    const publishedEntries = await prisma.knowledgeBaseEntry.findMany({
      where: { status: "PUBLISHED" },
    });

    if (publishedEntries.length === 0) {
      return { match: null, score: 0, reason: "NO_EVIDENCE" };
    }

    const scored = publishedEntries
      .filter((entry) => this.hasTopicEvidence(entry, queryToUse))
      .filter((entry) => {
        const entryAttrs = this.detectAttributes(entry.title);
        if (attributes.gender && entryAttrs.gender && attributes.gender !== entryAttrs.gender) return false;
        if (attributes.jurusan && entry.category === "JURUSAN" && entryAttrs.jurusan !== attributes.jurusan) return false;
        return true;
      })
      .map((entry) => ({
        entry,
        score: this.scoreEntry(entry, normalizedQuery, queryTokens, attributes),
      }))
      .sort((a, b) => b.score - a.score);

    const top = scored[0];
    const second = scored[1];

    // Minimum score threshold to consider relevant
    const MIN_THRESHOLD = 8;

    if (!top || top.score < MIN_THRESHOLD) {
      return { match: null, score: top?.score || 0, reason: "NO_EVIDENCE" };
    }

    // Equally supported candidates are ambiguous, including the same category.
    if (second && second.score >= MIN_THRESHOLD && top.score - second.score < 2) {
      return { match: null, score: top.score, reason: "AMBIGUOUS" };
    }

    return {
      match: top.entry,
      score: top.score,
      reason: "MATCH_FOUND",
      resolvedTopic: top.entry.title,
      resolvedCategory: top.entry.category,
    };
  }
}

export const retrievalService = new RetrievalService();
