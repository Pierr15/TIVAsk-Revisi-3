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
    const maleWords = ["laki", "laki-laki", "pria", "cowok", "putra", "siswa", "celana"];

    if (femaleWords.some((w) => norm.includes(w))) {
      attrs.gender = "perempuan";
    } else if (maleWords.some((w) => norm.includes(w))) {
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

  resolveContext(
    currentQuery: string,
    lastTopic?: string | null,
    lastCategory?: string | null
  ): { queryToUse: string; attributes: ExtractedAttributes } {
    const currentAttrs = this.detectAttributes(currentQuery);

    // If it's a follow-up without specifying a new topic
    if (currentAttrs.isFollowUp && lastTopic && !currentAttrs.category) {
      let combinedQuery = `${lastTopic} ${currentQuery}`;
      if (currentAttrs.gender) {
        combinedQuery = `${lastTopic} ${currentAttrs.gender}`;
      } else if (currentAttrs.jurusan) {
        combinedQuery = `${lastTopic} ${currentAttrs.jurusan}`;
      }
      const combinedAttrs = this.detectAttributes(combinedQuery);
      return {
        queryToUse: combinedQuery,
        attributes: {
          ...combinedAttrs,
          category: lastCategory || combinedAttrs.category,
        },
      };
    }

    // If query has its own distinct topic or category, ignore last context
    return {
      queryToUse: currentQuery,
      attributes: currentAttrs,
    };
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

    // Ambiguity check: if 1st and 2nd scores are high and very close from different categories
    if (second && second.score >= MIN_THRESHOLD && top.score - second.score < 2) {
      if (top.entry.category !== second.entry.category) {
        return {
          match: null,
          score: top.score,
          reason: "AMBIGUOUS",
        };
      }
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
