import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({
  events: new Map<string, (...args: any[]) => any>(), mapping: vi.fn(), send: vi.fn(),
  prisma: { whatsAppSession: { findUnique: vi.fn().mockResolvedValue(null), upsert: vi.fn() } },
}));
vi.mock("../src/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("whatsapp-web.js", () => ({
  LocalAuth: class {},
  Client: class {
    on(event: string, handler: (...args: any[]) => any) { mocks.events.set(event, handler); }
    async initialize() {}
    getContactLidAndPhone(ids: string[]) { return mocks.mapping(ids); }
    sendMessage(to: string, text: string) { return mocks.send(to, text); }
  },
}));
import { WhatsAppService } from "../src/modules/whatsapp-gateway/whatsapp.service";
let service: WhatsAppService;
const handler = vi.fn(async (_from: string, _body: string, _message: unknown) => {});
beforeEach(async () => {
  vi.clearAllMocks();
  service = new WhatsAppService();
  handler.mockClear();
  service.setMessageCallback(handler);
  await service.initializeClient();
});
const message = (from: string) => ({ from, fromMe: false, type: "chat", body: "test", reply: vi.fn() });
describe("P1: pesan privat PN dan LID", () => {
  it("PN dan LID yang cocok memakai nomor percakapan yang sama", async () => {
    mocks.mapping.mockResolvedValue([{ lid: "123456@lid", pn: "628000000000@c.us" }]);
    await mocks.events.get("message")!(message("628000000000@c.us"));
    await mocks.events.get("message")!(message("123456@lid"));
    expect(handler.mock.calls.map(call => call[0])).toEqual(["628000000000", "628000000000"]);
  });
  it("mapping gagal tidak menyimpan angka LID sebagai nomor telepon", async () => {
    mocks.mapping.mockResolvedValue([{ lid: "123456@lid", pn: undefined }]);
    const msg = message("123456@lid");
    await mocks.events.get("message")!(msg);
    expect(handler).not.toHaveBeenCalled();
    expect(msg.reply).toHaveBeenCalledWith(expect.stringContaining("kesalahan teknis"));
  });
  it("tetap mengabaikan grup, broadcast, dan pesan sendiri", async () => {
    for (const from of ["123@g.us", "status@broadcast", "bad@lid"]) await mocks.events.get("message")!(message(from));
    await mocks.events.get("message")!({ ...message("628000000000@c.us"), fromMe: true });
    expect(handler).not.toHaveBeenCalled();
  });
  it("pengiriman keluar tidak mengubah angka LID menjadi PN", async () => {
    await mocks.events.get("ready")!();
    expect(await service.sendMessage("123456@lid", "test")).toBe(false);
    expect(mocks.send).not.toHaveBeenCalled();
    mocks.send.mockResolvedValue({ id: "fake" });
    expect(await service.sendMessage("628000000000", "test")).toBe(true);
    expect(mocks.send).toHaveBeenCalledWith("628000000000@c.us", "test");
  });
});
