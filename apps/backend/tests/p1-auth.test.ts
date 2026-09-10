import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";

beforeEach(() => { vi.resetModules(); });
afterEach(() => { vi.unstubAllEnvs(); });
describe("P1: JWT wajib aman", () => {
  it.each(["", "short", "default-secret", "super-secure-jwt-secret-tivask-hackathon-2026"])("menolak konfigurasi %s", async secret => {
    vi.stubEnv("JWT_SECRET", secret);
    await expect(import("../src/config/auth")).rejects.toThrow("JWT_SECRET wajib diisi");
  });
  it("menolak secret yang tidak disetel", async () => {
    vi.stubEnv("JWT_SECRET", "");
    delete process.env.JWT_SECRET;
    vi.doMock("dotenv/config", () => ({}));
    await expect(import("../src/config/auth")).rejects.toThrow("JWT_SECRET wajib diisi");
    vi.doUnmock("dotenv/config");
  });
  it("menolak token kunci bawaan dan menerima token HS256 yang valid", async () => {
    const secret = "review-only-random-like-secret-32-bytes-long";
    vi.stubEnv("JWT_SECRET", secret);
    const { authGuard } = await import("../src/middleware/auth");
    for (const [key, accepted] of [["default-secret", false], [secret, true]] as const) {
      const token = jwt.sign({ id: "test-admin", email: "test@example.invalid" }, key);
      const next = vi.fn();
      authGuard({ cookies: {}, headers: { authorization: "Bearer " + token } } as any, {} as any, next);
      if (accepted) expect(next).toHaveBeenCalledWith();
      else expect(next.mock.calls[0][0].statusCode).toBe(401);
    }
  });
});
