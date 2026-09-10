import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import type { KnowledgeBaseEntry } from "@prisma/client";

const db = vi.hoisted(() => ({ knowledgeBaseEntry: { findMany: vi.fn() } }));
vi.mock("../src/lib/prisma", () => ({ prisma: db }));
import { retrievalService } from "../src/modules/retrieval/retrieval.service";

// Baca literal data seed saja; jangan menjalankan seeder atau mengakses database.
const seedText = readFileSync(new URL("../prisma/seed.ts", import.meta.url), "utf8").replace(/\r\n/g, "\n");
const literal = seedText.split("const initialKBEntries = ")[1].split(";\n\nasync function main")[0].trim().replace(/;$/, "");
const entries: KnowledgeBaseEntry[] = runInNewContext("(" + literal.replace(/KBStatus\.PUBLISHED/g, '"PUBLISHED"') + ")")
  .map((entry: object, i: number) => ({ ...entry, id: String(i), createdAt: new Date(), updatedAt: new Date() }));

beforeEach(() => db.knowledgeBaseEntry.findMany.mockResolvedValue(entries));
describe("P1: pergantian atribut dan kecukupan bukti", () => {
  it.each([
    ["kalau laki-laki?", "Ketentuan Seragam Siswi Perempuan", "BIAYA", "Laki-laki"],
    ["kalau perempuan?", "Ketentuan Seragam Siswa Laki-laki", "BIAYA", "Perempuan"],
    ["kalau TO?", "Jurusan TJKT (Teknik Jaringan Komputer dan Telekomunikasi)", "JURUSAN", "Jurusan TO"],
    ["kalau TJKT?", "Jurusan TO (Teknik Otomotif)", "JURUSAN", "Jurusan TJKT"],
  ])("%s setelah %s memilih atribut terbaru", async (query, topic, category, title) => {
    const result = await retrievalService.findEvidence(query, topic, category);
    expect(result.reason).toBe("MATCH_FOUND");
    expect(result.match?.title).toContain(title);
  });
  it.each([
    "Berapa biaya kursus bahasa Jepang?",
    "Apakah TJKT ada beasiswa Jepang?",
    "Apakah TJKT menyediakan asrama?",
    "Berapa biaya pendaftaran tahun 2099?",
    "Saya dengar ada biaya pendaftaran 500 ribu rupiah ya?",
    "Biaya pendaftaran 9 rupiah?",
  ])("menolak bukti yang tidak mencakup pertanyaan: %s", async query => {
    const result = await retrievalService.findEvidence(query);
    expect(result.reason).toBe("NO_EVIDENCE");
    expect(result.match).toBeNull();
  });
  it.each([
    ["Berapa biaya pendaftaran SPMB di SMKN 1 Adiwerna?", "Biaya Pendaftaran"],
    ["Bagaimana ketentuan seragam untuk siswa laki-laki?", "Laki-laki"],
    ["Kapan jadwal pelaksanaan daftar ulang?", "Daftar Ulang"],
    ["Apa syarat masuk jurusan TKJ?", "TJKT"],
    ["Berapa kuota TJKT?", "TJKT"],
    ["Apa mitra industri jurusan TJKT?", "TJKT"],
  ])("tetap menjawab pertanyaan yang didukung: %s", async (query, title) => {
    const result = await retrievalService.findEvidence(query);
    expect(result.reason).toBe("MATCH_FOUND");
    expect(result.match?.title).toContain(title);
  });
  it("kata siswa/beasiswa tidak dianggap atribut laki-laki", () => {
    expect(retrievalService.detectAttributes("beasiswa siswa TJKT").gender).toBeUndefined();
  });
  it("keyword saja tidak menjadi bukti dan entri resmi baru bisa dipakai", async () => {
    const entry = { ...entries[0], id: "new", title: "Beasiswa TJKT", category: "JURUSAN", keywords: ["beasiswa", "tjkt", "jepang"] };
    db.knowledgeBaseEntry.findMany.mockResolvedValue([entry]);
    expect((await retrievalService.findEvidence("Beasiswa Jepang TJKT?")).match).toBeNull();
    db.knowledgeBaseEntry.findMany.mockResolvedValue([{ ...entry, content: "Beasiswa Jepang TJKT tersedia berdasarkan panduan ini." }]);
    expect((await retrievalService.findEvidence("Beasiswa Jepang TJKT?")).match?.id).toBe("new");
    expect(db.knowledgeBaseEntry.findMany).toHaveBeenCalledWith({ where: { status: "PUBLISHED" } });
  });
  it("pertanyaan lanjutan dengan topik tambahan tidak membuang topik itu", async () => {
    const result = await retrievalService.findEvidence("kalau beasiswa Jepang?", "Jurusan TJKT (Teknik Jaringan Komputer dan Telekomunikasi)", "JURUSAN");
    expect(result.match).toBeNull();
  });
  it("konsep teknis tidak dianggap sama hanya karena jurusannya sama", async () => {
    db.knowledgeBaseEntry.findMany.mockResolvedValue([{
      ...entries[0], title: "Jurusan TM", category: "JURUSAN",
      content: "Jurusan TM mempelajari mesin industri.", keywords: ["cnc", "tm"],
    }]);
    expect((await retrievalService.findEvidence("Apakah TM mempelajari CNC?")).match).toBeNull();
  });
  it("seragam tanpa gender tidak memilih salah satu panduan yang setara", async () => {
    expect((await retrievalService.findEvidence("Seragam sekolah hari senin apa?")).reason).toBe("AMBIGUOUS");
  });
});
