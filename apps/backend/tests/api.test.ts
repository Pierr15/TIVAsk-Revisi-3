import { describe, it, expect, beforeAll, afterAll, vi, type MockInstance } from "vitest";
import { randomUUID } from "node:crypto";
import request from "supertest";
import { app } from "../src/app";
import { prisma } from "../src/lib/prisma";
import { whatsAppService } from "../src/modules/whatsapp-gateway/whatsapp.service";


describe("Backend REST API Integration Tests", () => {
  let authToken = "";
  let createdKBId = "";
  let escalationId = "";
  let conversationId = "";
  let sendMock: MockInstance<[string, string], Promise<boolean>>;

  beforeAll(async () => {
    // Dedicated database fixture; never reply to an existing user's escalation.
    sendMock = vi.spyOn(whatsAppService, "sendMessage").mockResolvedValue(false);
    const conversation = await prisma.conversation.create({
      data: { phoneNumber: "test-p1-api-" + randomUUID() },
    });
    conversationId = conversation.id;
    const escalation = await prisma.escalation.create({ data: { conversationId } });
    escalationId = escalation.id;
  });

  it("GET /api/health -> returns 200 ok", async () => {
    const res = await request(app).get("/api/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("POST /api/auth/login with invalid credentials -> returns 401", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@tivask.local", password: "wrong-password" });

    expect(res.status).toBe(401);
  });

  it("POST /api/auth/login with valid credentials -> returns 200 & JWT", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "admin@tivask.local", password: "password123" });

    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    authToken = res.body.token;

    // Check Set-Cookie header contains token
    const cookies = res.headers["set-cookie"];
    expect(cookies).toBeDefined();
  });

  it("GET /api/knowledge-base without auth -> returns 401", async () => {
    const res = await request(app).get("/api/knowledge-base");
    expect(res.status).toBe(401);
  });

  it("GET /api/knowledge-base with auth -> returns 200 & entries list", async () => {
    const res = await request(app)
      .get("/api/knowledge-base")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.entries)).toBe(true);
    expect(res.body.entries.length).toBeGreaterThan(0);
  });

  it("POST /api/knowledge-base -> creates new KB entry", async () => {
    const res = await request(app)
      .post("/api/knowledge-base")
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        title: "Panduan Ekstrakurikuler Robotika",
        category: "PROGRAM",
        content: "Ekstrakurikuler Robotika SMKN 1 Adiwerna aktif mengikuti lomba LKS.",
        keywords: ["robot", "ekskul", "robotika"],
        status: "DRAFT",
      });

    expect(res.status).toBe(201);
    expect(res.body.entry.id).toBeDefined();
    expect(res.body.entry.status).toBe("DRAFT");
    createdKBId = res.body.entry.id;
  });

  it("PATCH /api/knowledge-base/:id -> updates and publishes KB entry", async () => {
    const res = await request(app)
      .patch(`/api/knowledge-base/${createdKBId}`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        status: "PUBLISHED",
      });

    expect(res.status).toBe(200);
    expect(res.body.entry.status).toBe("PUBLISHED");
  });

  it("DELETE /api/knowledge-base/:id -> deletes KB entry", async () => {
    const res = await request(app)
      .delete(`/api/knowledge-base/${createdKBId}`)
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
  });

  it("GET /api/conversations -> returns list of conversations", async () => {
    const res = await request(app)
      .get("/api/conversations")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.conversations)).toBe(true);
  });

  it("GET /api/escalations -> returns escalations list", async () => {
    const res = await request(app)
      .get("/api/escalations")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.escalations)).toBe(true);
  });

  it("POST /api/escalations/:id/reply with disconnected gateway -> 503 and OPEN", async () => {
    sendMock.mockResolvedValue(false);
    const res = await request(app)
      .post(`/api/escalations/${escalationId}/reply`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({ message: "Balasan uji yang gagal dikirim" });
    expect(res.status).toBe(503);
    expect((await prisma.escalation.findUnique({ where: { id: escalationId } }))?.status).toBe("OPEN");
    expect(await prisma.message.count({ where: { conversationId, sender: "ADMIN" } })).toBe(0);
  });

  it("POST /api/escalations/:id/reply -> sends admin reply and resolves escalation", async () => {
    sendMock.mockResolvedValue(true);

    const res = await request(app)
      .post(`/api/escalations/${escalationId}/reply`)
      .set("Authorization", `Bearer ${authToken}`)
      .send({
        message: "Halo, panitia SPMB siap membantu terkait pertanyaan Anda.",
      });

    expect(res.status).toBe(200);
    expect(res.body.escalation.status).toBe("RESOLVED");
    expect(res.body.sentMessage).toBeDefined();
  });

  it("GET /api/dashboard/summary -> returns dashboard metrics", async () => {
    const res = await request(app)
      .get("/api/dashboard/summary")
      .set("Authorization", `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.totalConversations).toBeDefined();
    expect(res.body.totalEscalations).toBeDefined();
    expect(res.body.totalKBPublished).toBeGreaterThan(0);
  });

  afterAll(async () => {
    if (createdKBId) await prisma.knowledgeBaseEntry.deleteMany({ where: { id: createdKBId } });
    if (conversationId) await prisma.conversation.deleteMany({ where: { id: conversationId } });
    sendMock?.mockRestore();
    await prisma.$disconnect();
  });
});

