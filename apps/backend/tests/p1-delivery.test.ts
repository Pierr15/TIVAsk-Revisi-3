import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  sendMessage: vi.fn(),
  prisma: { escalation: { findUnique: vi.fn() }, $transaction: vi.fn() },
  tx: { message: { create: vi.fn() }, escalation: { update: vi.fn() } },
}));
vi.mock("../src/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("../src/modules/whatsapp-gateway/whatsapp.service", () => ({ whatsAppService: { sendMessage: mocks.sendMessage } }));
import { escalationService } from "../src/modules/escalation/escalation.service";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.prisma.escalation.findUnique.mockResolvedValue({ id: "e", status: "OPEN", conversationId: "c", conversation: { phoneNumber: "628000000000" } });
  mocks.prisma.$transaction.mockImplementation(fn => fn(mocks.tx));
  mocks.tx.message.create.mockResolvedValue({ id: "m" });
  mocks.tx.escalation.update.mockResolvedValue({ id: "e", status: "RESOLVED" });
});
describe("P1: status eskalasi mengikuti pengiriman", () => {
  it("kegagalan pengiriman tidak menyimpan pesan ADMIN atau menutup eskalasi", async () => {
    mocks.sendMessage.mockResolvedValue(false);
    await expect(escalationService.reply("e", "a", "test")).rejects.toMatchObject({ statusCode: 503 });
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
    expect(mocks.tx.message.create).not.toHaveBeenCalled();
    expect(mocks.tx.escalation.update).not.toHaveBeenCalled();
  });
  it("mencatat pesan dan menyelesaikan eskalasi setelah gateway menerima", async () => {
    const order: string[] = [];
    mocks.sendMessage.mockImplementation(async () => { order.push("send"); return true; });
    mocks.prisma.$transaction.mockImplementation(async fn => { order.push("transaction"); return fn(mocks.tx); });
    const result = await escalationService.reply("e", "a", "test");
    expect(order).toEqual(["send", "transaction"]);
    expect(result.whatsAppSent).toBe(true);
    expect(result.escalation.status).toBe("RESOLVED");
  });
  it("kegagalan database setelah pengiriman meminta pemeriksaan manual", async () => {
    mocks.sendMessage.mockResolvedValue(true);
    mocks.prisma.$transaction.mockRejectedValue(new Error("simulated database failure"));
    await expect(escalationService.reply("e", "a", "test")).rejects.toThrow("Periksa chat WhatsApp");
    expect(mocks.sendMessage).toHaveBeenCalledTimes(1);
  });
  it("tidak mengirim ulang eskalasi yang sudah selesai", async () => {
    mocks.prisma.escalation.findUnique.mockResolvedValue({ status: "RESOLVED" });
    await expect(escalationService.reply("e", "a", "test")).rejects.toMatchObject({ statusCode: 409 });
    expect(mocks.sendMessage).not.toHaveBeenCalled();
  });
});
