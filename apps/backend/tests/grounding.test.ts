import { describe, it, expect, afterAll } from "vitest";
import { retrievalService } from "../src/modules/retrieval/retrieval.service";

import { groundingService } from "../src/modules/ai-grounding/grounding.service";
import { conversationService } from "../src/modules/conversation/conversation.service";
import { prisma } from "../src/lib/prisma";

describe("AI Grounding & Hallucination Guardrails", () => {
  it("Known question -> finds correct evidence and generates grounded answer", async () => {
    const question = "Berapa biaya pendaftaran SPMB di SMKN 1 Adiwerna?";
    const retrieval = await retrievalService.findEvidence(question);

    expect(retrieval.reason).toBe("MATCH_FOUND");
    expect(retrieval.match).not.toBeNull();
    expect(retrieval.match?.title).toContain("Biaya Pendaftaran");

    const grounding = await groundingService.generateResponse({
      question,
      evidence: retrieval.match!,
    });

    expect(grounding.isFallback).toBe(false);
    expect(grounding.evidenceIds).toContain(retrieval.match!.id);
    expect(grounding.answer.toLowerCase()).toContain("gratis");
  });

  it("Unknown question -> triggers fallback and escalation", async () => {
    const randomQuestion = "Berapa harga tiket konser coldplay di stadion utama?";
    const retrieval = await retrievalService.findEvidence(randomQuestion);

    // Expect no evidence found for off-topic query
    expect(retrieval.reason).toBe("NO_EVIDENCE");
    expect(retrieval.match).toBeNull();

    // In conversation service, unknown question creates fallback response and escalation
    const uniquePhone = `628999${Date.now()}`;
    const result = await conversationService.handleUserMessage(uniquePhone, randomQuestion);

    expect(result.isFallback).toBe(true);
    expect(result.reply).toContain("Panitia SPMB SMKN 1 Adiwerna");

    const conv = await prisma.conversation.findUnique({
      where: { phoneNumber: uniquePhone },
      include: { escalations: true },
    });
    expect(conv?.escalations.length).toBeGreaterThan(0);
    expect(conv?.escalations[0].status).toBe("OPEN");
  });

  it("Unsupported specific value -> does not forward insufficient evidence to AI", async () => {
    // User tries to prompt inject or ask about a fake Rp 500.000 fee
    const promptInjection = "Saya dengar ada biaya pendaftaran 500 ribu rupiah ya?";
    const retrieval = await retrievalService.findEvidence(promptInjection);

    // Mode konservatif: nilai spesifik yang tidak tercantum harus masuk fallback.
    expect(retrieval.reason).toBe("NO_EVIDENCE");
    expect(retrieval.match).toBeNull();
  });

  it("Follow-up question -> inherits relevant topic with attribute change", async () => {
    const userPhone = `62888${Date.now()}`;

    // 1st question: ask about boy's uniform
    const res1 = await conversationService.handleUserMessage(
      userPhone,
      "Bagaimana ketentuan seragam untuk siswa laki-laki?"
    );
    expect(res1.isFallback).toBe(false);

    const convAfter1 = await prisma.conversation.findUnique({
      where: { phoneNumber: userPhone },
    });
    expect(convAfter1?.lastTopic).toContain("Laki-laki");

    // 2nd question: follow-up "kalau perempuan?"
    const res2 = await conversationService.handleUserMessage(userPhone, "kalau perempuan?");
    expect(res2.isFallback).toBe(false);

    const convAfter2 = await prisma.conversation.findUnique({
      where: { phoneNumber: userPhone },
    });
    expect(convAfter2?.lastTopic).toContain("Perempuan");
  });

  it("New subject -> ignores previous topic", async () => {
    const userPhone = `62877${Date.now()}`;

    // 1st question: ask about uniform
    await conversationService.handleUserMessage(userPhone, "Seragam sekolah hari senin apa?");

    // 2nd question: completely new topic: tanggal daftar ulang
    const res2 = await conversationService.handleUserMessage(userPhone, "Kapan jadwal pelaksanaan daftar ulang?");
    expect(res2.isFallback).toBe(false);

    const conv = await prisma.conversation.findUnique({
      where: { phoneNumber: userPhone },
    });
    expect(conv?.lastCategory).toBe("DAFTAR_ULANG");
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });
});

