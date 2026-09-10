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

  private containsPhrase(haystack: string, needle: string): boolean {
    const normalizedHaystack = this.normalizeText(haystack);

    const normalizedNeedle = this.normalizeText(needle);

    if (!normalizedNeedle) {
      return false;
    }

    return ` ${normalizedHaystack} `.includes(` ${normalizedNeedle} `);
  }

  private evidenceMatchesToken(evidenceText: string, token: string): boolean {
    const synonyms: Record<string, string[]> = {
      kuota: ["kuota", "daya tampung"],

      syarat: ["syarat", "persyaratan"],
    };

    const candidates = synonyms[token] || [token];

    return candidates.some((candidate) =>
      this.containsPhrase(evidenceText, candidate),
    );
  }

  private getMeaningfulTokens(text: string): string[] {
    const stopWords = new Set([
      "apa",
      "apakah",
      "yang",
      "untuk",
      "dan",
      "atau",
      "di",
      "ke",
      "dari",
      "ini",
      "itu",
      "berapa",
      "kapan",
      "bagaimana",
      "gimana",
      "mohon",
      "tolong",
      "saya",
      "aku",
      "kami",
      "bisa",
      "boleh",
      "ya",
      "tentang",
      "mengenai",
      "hari",
      "kalau",
      "kalo",
      "klo",
      "lalu",
      "masuk",
      "sekolah",
      "pelaksanaan",
    ]);

    return [
      ...new Set(
        this.normalizeText(text)
          .split(" ")
          .map((token) => {
            if (token.endsWith("nya") && token.length > 5) {
              token = token.slice(0, -3);
            }

            const aliases: Record<string, string> = {
              tkj: "tjkt",
              tkr: "to",
              tab: "to",
            };

            return aliases[token] || token;
          })
          .filter((token) => token.length > 2 && !stopWords.has(token)),
      ),
    ];
  }

  private getEvidenceCoverage(
    entry: KnowledgeBaseEntry,
    query: string,
  ): number {
    const queryTokens = this.getMeaningfulTokens(query);

    if (queryTokens.length === 0) {
      return 1;
    }

    // Hanya TITLE + CONTENT yang boleh
    // dianggap sebagai evidence.
    //
    // KEYWORDS hanya digunakan untuk retrieval/ranking.
    const evidenceText = [entry.title, entry.content].join(" ");

    const matchedTokens = queryTokens.filter((token) =>
      this.evidenceMatchesToken(evidenceText, token),
    );

    return matchedTokens.length / queryTokens.length;
  }

  private hasUnsupportedQueryNumbers(
    entry: KnowledgeBaseEntry,
    query: string,
  ): boolean {
    const queryNumbers = query.match(/\d+(?:[.,]\d+)*/g) || [];

    if (queryNumbers.length === 0) {
      return false;
    }

    const evidenceText = `${entry.title} ${entry.content}`;

    const normalizeNumber = (value: string) => value.replace(/[.,]/g, "");

    const evidenceNumbers = new Set(
      (evidenceText.match(/\d+(?:[.,]\d+)*/g) || []).map(normalizeNumber),
    );

    return queryNumbers.some(
      (number) => !evidenceNumbers.has(normalizeNumber(number)),
    );
  }

  detectAttributes(text: string): ExtractedAttributes {
    const norm = this.normalizeText(text);
    const words = norm.split(" ");
    const attrs: ExtractedAttributes = {};

    // 1. Gender detection
    const femaleWords = [
      "perempuan",
      "wanita",
      "cewek",
      "putri",
      "siswi",
      "jilbab",
      "kerudung",
      "rok",
    ];
    const maleWords = ["laki", "pria", "cowok", "putra", "celana"];

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
    } else if (
      /\b(jadwal|kapan|tanggal|waktu|tahapan|alur|dibuka|tutup|pengumuman)\b/.test(
        norm,
      )
    ) {
      attrs.category = "JADWAL";
    } else if (/\b(jalur|kuota|afirmasi|prestasi|domisili)\b/.test(norm)) {
      attrs.category = "JALUR";
    } else if (
      /\b(syarat|persyaratan|berkas|dokumen|ijazah|skl|rapor|raport|akta|kk)\b/.test(
        norm,
      )
    ) {
      attrs.category = "PERSYARATAN";
    } else if (/\b(daftar ulang|registrasi ulang|stopmap)\b/.test(norm)) {
      attrs.category = "DAFTAR_ULANG";
    } else if (/\b(buta warna|tes|mata)\b/.test(norm)) {
      attrs.category = "FAQ";
    } else if (
      /\b(profil|alamat|lokasi|sejarah|telepon|email|kontak|hubungi)\b/.test(
        norm,
      )
    ) {
      attrs.category = "PROFIL";
    }

    // 4. Follow-up detection
    const hasFollowUpPrefix = /^(kalau|kalo|klo|lalu|bagaimana|gimana)\b/.test(
      norm,
    );

    const hasAnaphora =
      words.some((word) => word.endsWith("nya")) ||
      /\b(tersebut|itu)\b/.test(norm);

    if (words.length <= 6 && (hasFollowUpPrefix || hasAnaphora)) {
      attrs.isFollowUp = true;
    }

    return attrs;
  }

  resolveContext(
    currentQuery: string,
    lastTopic?: string | null,
    lastCategory?: string | null,
  ): {
    queryToUse: string;
    attributes: ExtractedAttributes;
  } {
    const currentAttrs = this.detectAttributes(currentQuery);

    if (currentAttrs.isFollowUp && lastTopic) {
      let baseTopic = lastTopic;

      // Kalau user mengganti gender, jangan bawa
      // gender lama dari topik sebelumnya.
      if (currentAttrs.gender) {
        baseTopic = this.normalizeText(
          baseTopic
            .replace(
              /\b(siswa|siswi|laki[\s-]*laki|pria|wanita|perempuan|cowok|cewek|putra|putri)\b/gi,
              " ",
            )
            .replace(/\s+/g, " ")
            .trim(),
        );

        const canonicalGender =
          currentAttrs.gender === "perempuan"
            ? "perempuan putri"
            : "laki laki putra";

        const combinedQuery = `${baseTopic} ${canonicalGender}`.trim();

        const combinedAttrs = this.detectAttributes(combinedQuery);

        return {
          queryToUse: combinedQuery,
          attributes: {
            ...combinedAttrs,
            category:
              currentAttrs.category || lastCategory || combinedAttrs.category,
          },
        };
      }

      // Kalau user pindah jurusan dalam sebuah follow-up,
      // jangan gabungkan nama jurusan lama dan baru.
      if (currentAttrs.jurusan && lastCategory === "JURUSAN") {
        baseTopic = "Jurusan";
      }

      const combinedQuery = `${baseTopic} ${currentQuery}`.trim();

      const combinedAttrs = this.detectAttributes(combinedQuery);

      return {
        queryToUse: combinedQuery,

        attributes: {
          ...combinedAttrs,

          category:
            currentAttrs.category || lastCategory || combinedAttrs.category,
        },
      };
    }

    // Pertanyaan baru tidak mewarisi topik lama.
    return {
      queryToUse: currentQuery,
      attributes: currentAttrs,
    };
  }

  scoreEntry(
    entry: KnowledgeBaseEntry,
    normalizedQuery: string,
    queryTokens: string[],
    attributes: ExtractedAttributes,
  ): number {
    let score = 0;

    const normTitle = this.normalizeText(entry.title);
    const normContent = this.normalizeText(entry.content);

    // 1. Exact keyword / phrase matching
    for (const keyword of entry.keywords) {
      const normalizedKeyword = this.normalizeText(keyword);

      if (
        normalizedKeyword &&
        this.containsPhrase(normalizedQuery, normalizedKeyword)
      ) {
        score += 6;
      }
    }

    // 2. Title token matching
    for (const token of queryTokens) {
      if (token.length > 2 && this.containsPhrase(normTitle, token)) {
        score += 4;
      }
    }

    // 3. Content token matching
    for (const token of queryTokens) {
      if (token.length > 3 && this.containsPhrase(normContent, token)) {
        score += 1;
      }
    }

    // 4. Category alignment
    if (attributes.category && entry.category === attributes.category) {
      score += 5;
    }

    // 5. Gender awareness
    const titleIsFemale =
      this.containsPhrase(normTitle, "perempuan") ||
      this.containsPhrase(normTitle, "siswi") ||
      this.containsPhrase(normTitle, "wanita");

    const titleIsMale =
      this.containsPhrase(normTitle, "laki laki") ||
      this.containsPhrase(normTitle, "pria") ||
      this.containsPhrase(normTitle, "putra");

    if (attributes.gender === "perempuan") {
      if (titleIsFemale) {
        score += 15;
      }

      if (titleIsMale) {
        score -= 25;
      }
    }

    if (attributes.gender === "laki-laki") {
      if (titleIsMale) {
        score += 15;
      }

      if (titleIsFemale) {
        score -= 25;
      }
    }

    // 6. Jurusan awareness
    if (attributes.jurusan) {
      const department = attributes.jurusan.toLowerCase();

      if (this.containsPhrase(normTitle, department)) {
        score += 15;
      } else if (entry.category === "JURUSAN") {
        score -= 20;
      }
    }

    return score;
  }

  async findEvidence(
    rawQuery: string,
    lastTopic?: string | null,
    lastCategory?: string | null,
  ): Promise<RetrievalResult> {
    const { queryToUse, attributes } = this.resolveContext(
      rawQuery,
      lastTopic,
      lastCategory,
    );

    const normalizedQuery = this.normalizeText(queryToUse);
    const queryTokens = this.getMeaningfulTokens(queryToUse);

    // Only PUBLISHED entries per PRD/TRD rule
    const publishedEntries = await prisma.knowledgeBaseEntry.findMany({
      where: { status: "PUBLISHED" },
    });

    if (publishedEntries.length === 0) {
      return {
        match: null,
        score: 0,
        reason: "NO_EVIDENCE",
      };
    }

    const scored = publishedEntries
      .map((entry) => {
        const hasUnsupportedNumbers = this.hasUnsupportedQueryNumbers(
          entry,
          rawQuery,
        );

        return {
          entry,

          score: this.scoreEntry(
            entry,
            normalizedQuery,
            queryTokens,
            attributes,
          ),

          coverage: hasUnsupportedNumbers
            ? 0
            : this.getEvidenceCoverage(entry, rawQuery),
        };
      })

      .sort((a, b) => {
        if (b.score !== a.score) {
          return b.score - a.score;
        }

        return b.coverage - a.coverage;
      });

    const top = scored[0];
    const second = scored[1];

    const MIN_THRESHOLD = 8;
    const MIN_COVERAGE = 1;

    if (!top || top.score < MIN_THRESHOLD || top.coverage < MIN_COVERAGE) {
      return {
        match: null,
        score: top?.score || 0,
        reason: "NO_EVIDENCE",
      };
    }

    if (
      second &&
      second.score >= MIN_THRESHOLD &&
      second.coverage >= MIN_COVERAGE &&
      top.score - second.score < 3 &&
      Math.abs(top.coverage - second.coverage) < 0.2
    ) {
      return {
        match: null,
        score: top.score,
        reason: "AMBIGUOUS",
      };
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
