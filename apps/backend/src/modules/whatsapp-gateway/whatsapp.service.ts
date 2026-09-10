import { Client, LocalAuth, Message as WAMessage } from "whatsapp-web.js";
import QRCode from "qrcode";
import { prisma } from "../../lib/prisma";

export type WhatsAppStatus = "connected" | "disconnected" | "needs_qr";

export interface MessageHandler {
  (from: string, body: string, rawMessage: WAMessage): Promise<void>;
}

export class WhatsAppService {
  private client: Client | null = null;
  private status: WhatsAppStatus = "disconnected";
  private currentQrCode: string | null = null;
  private onMessageHandler: MessageHandler | null = null;

  constructor() {
    this.initStatusFromDb();
  }

  private async initStatusFromDb() {
    try {
      const session = await prisma.whatsAppSession.findUnique({
        where: { id: "singleton" },
      });
      if (session) {
        this.status = (session.status as WhatsAppStatus) || "disconnected";
        this.currentQrCode = session.qrCode;
      }
    } catch (e) {
      console.warn("Could not read initial WhatsAppSession from DB:", e);
    }
  }

  private async updateSession(status: WhatsAppStatus, qrCode: string | null = null) {
    this.status = status;
    this.currentQrCode = qrCode;

    try {
      await prisma.whatsAppSession.upsert({
        where: { id: "singleton" },
        update: { status, qrCode },
        create: { id: "singleton", status, qrCode },
      });
    } catch (error) {
      console.error("Failed to update WhatsAppSession in DB:", error);
    }
  }

  public setMessageCallback(handler: MessageHandler) {
    this.onMessageHandler = handler;
  }

  public getStatus(): { status: WhatsAppStatus; qrCode: string | null } {
    return {
      status: this.status,
      qrCode: this.currentQrCode,
    };
  }

  public async initializeClient() {
    console.log("🔄 Initializing WhatsApp Web Client...");

    const chromePath = process.env.CHROME_EXECUTABLE_PATH;

    const puppeteerOptions: any = {
      headless: true,
      args: [
        "--no-sandbox",
        "--disable-setuid-sandbox",
        "--disable-dev-shm-usage",
        "--disable-gpu",
      ],
    };

    if (chromePath && chromePath.trim().length > 0) {
      puppeteerOptions.executablePath = chromePath;
    }

    this.client = new Client({
      authStrategy: new LocalAuth({
        clientId: "tivask-bot-session",
        dataPath: "./.wwebjs_auth",
      }),
      puppeteer: puppeteerOptions,
    });

    this.client.on("qr", async (qr) => {
      console.log("📲 WhatsApp QR Received. Generating QR data URL...");
      try {
        const qrDataUrl = await QRCode.toDataURL(qr);
        await this.updateSession("needs_qr", qrDataUrl);
      } catch (err) {
        console.error("Failed to generate QR Data URL:", err);
        await this.updateSession("needs_qr", qr);
      }
    });

    this.client.on("ready", async () => {
      console.log("✅ WhatsApp Web Client is READY and CONNECTED!");
      await this.updateSession("connected", null);
    });

    this.client.on("authenticated", () => {
      console.log("🔑 WhatsApp Web Client authenticated successfully.");
    });

    this.client.on("auth_failure", async (msg) => {
      console.error("❌ WhatsApp Web auth failure:", msg);
      await this.updateSession("disconnected", null);
    });

    this.client.on("disconnected", async (reason) => {
      console.warn("⚠️ WhatsApp Web disconnected:", reason);
      await this.updateSession("disconnected", null);
    });

    this.client.on("message", async (msg) => {
      await this.handleIncomingMessage(msg);
    });

    try {
      await this.client.initialize();
    } catch (err: any) {
      console.error("Failed to launch WhatsApp Client:", err?.message || err);
      await this.updateSession("disconnected", null);
    }
  }

  private async resolvePhoneNumber(from: string): Promise<string> {
    if (/^\d+@c\.us$/.test(from)) return from.slice(0, -5);
    if (!/^\d+@lid$/.test(from) || !this.client) {
      throw new Error("Pengirim privat tidak dapat dikenali");
    }
    const mappings = await this.client.getContactLidAndPhone([from]);
    const pn = mappings.find((mapping) => mapping.lid === from)?.pn;
    if (!pn || !/^\d+@c\.us$/.test(pn)) {
      throw new Error("Nomor telepon untuk pengirim LID belum tersedia");
    }
    return pn.slice(0, -5);
  }

  private async handleIncomingMessage(msg: WAMessage) {
    if (msg.fromMe || !/^\d+@(c\.us|lid)$/.test(msg.from)) return;
    try {
      if (msg.type !== "chat") {
        await msg.reply("Mohon maaf, TIVAsk saat ini hanya mendukung pesan teks seputar informasi SPMB SMKN 1 Adiwerna.");
        return;
      }
      const text = msg.body?.trim();
      if (!text || !this.onMessageHandler) return;
      const phoneNumber = await this.resolvePhoneNumber(msg.from);
      await this.onMessageHandler(phoneNumber, text, msg);
    } catch (error) {
      console.error("Error processing private WhatsApp message:", error);
      try {
        await msg.reply("Terjadi kesalahan teknis saat memproses pesan Anda. Mohon coba sesaat lagi.");
      } catch (replyError) {
        console.error("Failed to send technical-error reply:", replyError);
      }
    }
  }

  public async sendMessage(phoneNumber: string, content: string): Promise<boolean> {
    if (!this.client || this.status !== "connected") {
      console.warn(`WhatsApp not connected. Cannot send to ${phoneNumber}`);
      return false;
    }

    try {
      // Nomor harus berasal dari PN yang sudah diverifikasi, bukan angka dari LID.
      if (!/^\d+(?:@c\.us)?$/.test(phoneNumber)) return false;
      const formattedTo = phoneNumber.endsWith("@c.us") ? phoneNumber : phoneNumber + "@c.us";

      await this.client.sendMessage(formattedTo, content);
      return true;
    } catch (error) {
      console.error(`Failed to send WhatsApp message to ${phoneNumber}:`, error);
      return false;
    }
  }
}

export const whatsAppService = new WhatsAppService();
