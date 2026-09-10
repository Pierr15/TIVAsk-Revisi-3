import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  findEvidence: vi.fn(), generateResponse: vi.fn(),
  prisma: {
    conversation: { findUnique: vi.fn(), update: vi.fn() },
    message: { create: vi.fn() },
    escalation: { findFirst: vi.fn(), create: vi.fn() },
  },
}));
vi.mock("../src/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("../src/modules/retrieval/retrieval.service", () => ({ retrievalService: { findEvidence: mocks.findEvidence } }));
vi.mock("../src/modules/ai-grounding/grounding.service", () => ({
  groundingService: { generateResponse: mocks.generateResponse, getFallbackMessage: () => "Pertanyaan diteruskan ke Panitia SPMB." },
}));
import { conversationService } from "../src/modules/conversation/conversation.service";
beforeEach(() => {
  vi.clearAllMocks();
  mocks.prisma.conversation.findUnique.mockResolvedValue({ id: "c", lastTopic: "Seragam Perempuan", lastCategory: "BIAYA", messages: [] });
  mocks.findEvidence.mockResolvedValue({ match: null, reason: "NO_EVIDENCE", score: 0 });
  mocks.prisma.escalation.findFirst.mockResolvedValue(null);
});
describe("P1: bukti tidak cukup masuk eskalasi", () => {
  it("mengirim fallback, membuat eskalasi, dan menghapus konteks lama tanpa memanggil AI", async () => {
    const result = await conversationService.handleUserMessage("628000000000", "Beasiswa Jepang?");
    expect(result.isFallback).toBe(true);
    expect(mocks.generateResponse).not.toHaveBeenCalled();
    expect(mocks.prisma.escalation.create).toHaveBeenCalledWith({ data: { conversationId: "c", status: "OPEN" } });
    expect(mocks.prisma.conversation.update).toHaveBeenCalledWith({ where: { id: "c" }, data: { lastTopic: null, lastCategory: null } });
  });
  it("memakai eskalasi terbuka yang sudah ada", async () => {
    mocks.prisma.escalation.findFirst.mockResolvedValue({ id: "existing" });
    await conversationService.handleUserMessage("628000000000", "Beasiswa Jepang?");
    expect(mocks.prisma.escalation.create).not.toHaveBeenCalled();
  });
});
