import "dotenv/config";

const configuredSecret = process.env.JWT_SECRET?.trim();
const insecureSecrets = new Set([
  "default-secret",
  "super-secure-jwt-secret-tivask-hackathon-2026",
]);

if (!configuredSecret || Buffer.byteLength(configuredSecret, "utf8") < 32 || insecureSecrets.has(configuredSecret)) {
  throw new Error("JWT_SECRET wajib diisi dengan nilai acak minimal 32 byte. Buat rahasia baru sebelum menjalankan backend.");
}

export const JWT_SECRET: string = configuredSecret;
