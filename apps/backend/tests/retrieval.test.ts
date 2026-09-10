import { describe, it, expect } from "vitest";
import { retrievalService } from "../src/modules/retrieval/retrieval.service";
import { KnowledgeBaseEntry, KBStatus } from "@prisma/client";

describe("Retrieval Engine & Attribute Scoring", () => {
  it("normalizes text by stripping punctuation and lowercasing", () => {
    const raw = "Berapa Biaya SPP di SMKN 1 Adiwerna???";
    const normalized = retrievalService.normalizeText(raw);
    expect(normalized).toBe("berapa biaya spp di smkn 1 adiwerna");
  });

  it("detects gender attributes accurately", () => {
    const female = retrievalService.detectAttributes("bagaimana seragam untuk siswi perempuan?");
    expect(female.gender).toBe("perempuan");

    const male = retrievalService.detectAttributes("seragam osis siswa laki-laki");
    expect(male.gender).toBe("laki-laki");
  });

  it("detects department (jurusan) attributes accurately", () => {
    const tjkt = retrievalService.detectAttributes("apa saja syarat masuk jurusan tkj?");
    expect(tjkt.jurusan).toBe("TJKT");

    const to = retrievalService.detectAttributes("kuota untuk jurusan otomotif tkr");
    expect(to.jurusan).toBe("TO");

    const tpfl = retrievalService.detectAttributes("apakah jurusan las butuh tes buta warna?");
    expect(tpfl.jurusan).toBe("TPFL");
  });

  it("detects categories accurately", () => {
    expect(retrievalService.detectAttributes("kapan tanggal pendaftaran dibuka?").category).toBe("JADWAL");
    expect(retrievalService.detectAttributes("berapa biaya pendaftaran?").category).toBe("BIAYA");
    expect(retrievalService.detectAttributes("dokumen apa saja yang perlu disiapkan?").category).toBe("PERSYARATAN");
    expect(retrievalService.detectAttributes("bagaimana cara daftar ulang?").category).toBe("DAFTAR_ULANG");
  });

  it("resolves follow-up context when user asks short follow-up without topic", () => {
    const lastTopic = "Ketentuan Seragam Siswa Laki-laki";
    const lastCategory = "BIAYA";

    const resolved = retrievalService.resolveContext("kalau perempuan?", lastTopic, lastCategory);
    expect(resolved.attributes.gender).toBe("perempuan");
    expect(resolved.queryToUse).toContain("seragam");
    expect(resolved.queryToUse).toContain("putri");
    expect(resolved.queryToUse).not.toContain("putra");
  });

  it("ignores previous context when user asks a new subject", () => {
    const lastTopic = "Ketentuan Seragam Siswa Laki-laki";
    const lastCategory = "BIAYA";

    const resolved = retrievalService.resolveContext("kapan jadwal pengumuman seleksi?", lastTopic, lastCategory);
    expect(resolved.attributes.category).toBe("JADWAL");
    expect(resolved.queryToUse).toBe("kapan jadwal pengumuman seleksi?");
    expect(resolved.queryToUse).not.toContain("Seragam");
  });

  it("prioritizes matching gender attribute and penalizes opposite gender", () => {
    const femaleEntry: KnowledgeBaseEntry = {
      id: "kb-female",
      title: "Ketentuan Seragam Siswi Perempuan",
      category: "BIAYA",
      content: "Seragam siswi perempuan mengenakan kerudung segiempat...",
      keywords: ["seragam", "perempuan", "wanita", "kerudung"],
      status: KBStatus.PUBLISHED,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const maleEntry: KnowledgeBaseEntry = {
      id: "kb-male",
      title: "Ketentuan Seragam Siswa Laki-laki",
      category: "BIAYA",
      content: "Seragam siswa laki-laki mengenakan celana abu-abu...",
      keywords: ["seragam", "laki-laki", "pria", "celana"],
      status: KBStatus.PUBLISHED,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const femaleQuery = "seragam untuk perempuan";
    const femaleTokens = ["seragam", "untuk", "perempuan"];
    const femaleAttrs = { gender: "perempuan" as const, category: "BIAYA" };

    const femaleScore = retrievalService.scoreEntry(femaleEntry, femaleQuery, femaleTokens, femaleAttrs);
    const maleScore = retrievalService.scoreEntry(maleEntry, femaleQuery, femaleTokens, femaleAttrs);

    expect(femaleScore).toBeGreaterThan(maleScore);
    expect(femaleScore).toBeGreaterThanOrEqual(15);
  });
});
