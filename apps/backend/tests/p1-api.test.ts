import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { randomBytes } from "node:crypto";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import request from "supertest";
import type { Express } from "express";

const mocks = vi.hoisted(() => ({
  sendMessage: vi.fn(),
  prisma: {
    adminUser: { findUnique: vi.fn() },
    knowledgeBaseEntry: { findMany: vi.fn() },
    escalation: { findUnique: vi.fn() },
    $transaction: vi.fn(),
  },
  tx: { message: { create: vi.fn() }, escalation: { update: vi.fn() } },
}));
vi.mock("../src/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("../src/modules/whatsapp-gateway/whatsapp.service", () => ({
  whatsAppService: { sendMessage: mocks.sendMessage, getStatus: () => ({ status: "disconnected", qrCode: null }) },
}));

let app: Express;
let secret: string;
let validToken: string;
beforeAll(async () => {
  secret = randomBytes(32).toString("hex");
  vi.stubEnv("JWT_SECRET", secret);
  app = (await import("../src/app")).app;
  const passwordHash = await bcrypt.hash("test-password", 4);
  mocks.prisma.adminUser.findUnique.mockResolvedValue({ id: "admin-test", email: "test@example.invalid", passwordHash });
  validToken = jwt.sign({ id: "admin-test", email: "test@example.invalid" }, secret);
});
beforeEach(() => {
  mocks.prisma.knowledgeBaseEntry.findMany.mockResolvedValue([]);
  mocks.prisma.escalation.findUnique.mockResolvedValue({ id: "e", status: "OPEN", conversationId: "c", conversation: { phoneNumber: "628000000000" } });
  mocks.prisma.$transaction.mockClear().mockImplementation(fn => fn(mocks.tx));
  mocks.tx.message.create.mockClear().mockResolvedValue({ id: "m", sender: "ADMIN" });
  mocks.tx.escalation.update.mockClear().mockResolvedValue({ id: "e", status: "RESOLVED" });
  mocks.sendMessage.mockReset();
});
afterAll(() => { vi.unstubAllEnvs(); });

describe("P1: kontrak HTTP tanpa database atau WhatsApp nyata", () => {
  it("login tetap mengeluarkan cookie HttpOnly dan token HS256", async () => {
    const res = await request(app).post("/api/auth/login").send({ email: "test@example.invalid", password: "test-password" });
    expect(res.status).toBe(200);
    expect(String(res.headers["set-cookie"])).toContain("HttpOnly");
    expect(jwt.verify(res.body.token, secret, { algorithms: ["HS256"] })).toMatchObject({ id: "admin-test" });
  });
  it("endpoint admin menolak token kunci bawaan", async () => {
    const forged = jwt.sign({ id: "fake", email: "fake@example.invalid" }, "default-secret");
    expect((await request(app).get("/api/knowledge-base").set("Authorization", "Bearer " + forged)).status).toBe(401);
    expect((await request(app).get("/api/knowledge-base").set("Authorization", "Bearer " + validToken)).status).toBe(200);
  });
  it("kegagalan gateway diteruskan sebagai 503 tanpa menutup eskalasi", async () => {
    mocks.sendMessage.mockResolvedValue(false);
    const res = await request(app).post("/api/escalations/e/reply").set("Authorization", "Bearer " + validToken).send({ message: "Balasan uji" });
    expect(res.status).toBe(503);
    expect(res.body.error).toContain("tetap terbuka");
    expect(mocks.prisma.$transaction).not.toHaveBeenCalled();
  });
  it("pengiriman berhasil menghasilkan 200, pesan, dan status RESOLVED", async () => {
    mocks.sendMessage.mockResolvedValue(true);
    const res = await request(app).post("/api/escalations/e/reply").set("Authorization", "Bearer " + validToken).send({ message: "Balasan uji" });
    expect(res.status).toBe(200);
    expect(res.body.whatsAppSent).toBe(true);
    expect(res.body.escalation.status).toBe("RESOLVED");
    expect(res.body.sentMessage.sender).toBe("ADMIN");
  });
  it("payload balasan bukan string ditolak tanpa mengirim", async () => {
    const res = await request(app).post("/api/escalations/e/reply").set("Authorization", "Bearer " + validToken).send({ message: ["invalid"] });
    expect(res.status).toBe(400);
    expect(mocks.sendMessage).not.toHaveBeenCalled();
  });
});
