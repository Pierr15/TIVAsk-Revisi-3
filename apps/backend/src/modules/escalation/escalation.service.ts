import { prisma } from "../../lib/prisma";
import { AppError } from "../../middleware/errorHandler";
import { whatsAppService } from "../whatsapp-gateway/whatsapp.service";
import { EscalationStatus } from "@tivask/shared";

export class EscalationService {
  async list(status?: string, search?: string) {
    const where: any = {};
    if (status && ["OPEN", "RESOLVED"].includes(status)) {
      where.status = status as EscalationStatus;
    }

    if (search) {
      where.conversation = {
        OR: [
          { phoneNumber: { contains: search, mode: "insensitive" } },
          { lastTopic: { contains: search, mode: "insensitive" } },
        ],
      };
    }

    return prisma.escalation.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        conversation: {
          include: {
            messages: {
              orderBy: { createdAt: "asc" },
              take: 20,
            },
          },
        },
        handledBy: {
          select: { id: true, email: true },
        },
      },
    });
  }

  async getById(id: string) {
    const escalation = await prisma.escalation.findUnique({
      where: { id },
      include: {
        conversation: {
          include: {
            messages: {
              orderBy: { createdAt: "asc" },
            },
          },
        },
        handledBy: {
          select: { id: true, email: true },
        },
      },
    });

    if (!escalation) {
      throw new AppError("Eskalasi tidak ditemukan", 404);
    }

    return escalation;
  }

  async reply(escalationId: string, adminId: string, replyText: string) {
    if (typeof replyText !== "string" || !replyText.trim()) {
      throw new AppError("Pesan balasan tidak boleh kosong", 400);
    }

    const escalation = await this.getById(escalationId);
    if (escalation.status !== "OPEN") {
      throw new AppError("Eskalasi sudah selesai. Muat ulang daftar sebelum melanjutkan.", 409);
    }
    const text = replyText.trim();
    const sent = await whatsAppService.sendMessage(
      escalation.conversation.phoneNumber,
      "*Pesan dari Panitia SPMB SMKN 1 Adiwerna:*\n\n" + text
    );
    if (!sent) {
      throw new AppError("Pengiriman WhatsApp belum berhasil dikonfirmasi. Eskalasi tetap terbuka dan draf dapat dicoba kembali setelah koneksi diperiksa.", 503);
    }

    try {
      const result = await prisma.$transaction(async (tx) => {
        const message = await tx.message.create({
          data: {
            conversationId: escalation.conversationId,
            sender: "ADMIN",
            content: text,
            evidenceIds: [],
          },
        });
        const updatedEscalation = await tx.escalation.update({
          where: { id: escalationId },
          data: { status: "RESOLVED", handledById: adminId },
          include: {
            conversation: true,
            handledBy: { select: { id: true, email: true } },
          },
        });
        return { escalation: updatedEscalation, message };
      });
      return { ...result, whatsAppSent: true };
    } catch (error) {
      console.error("WhatsApp accepted the reply, but database recording failed:", error);
      throw new AppError("WhatsApp sudah menerima pesan, tetapi pencatatan gagal. Periksa chat WhatsApp sebelum mengirim ulang agar pesan tidak ganda.", 500);
    }
  }

  async resolve(escalationId: string, adminId: string) {
    await this.getById(escalationId);

    return prisma.escalation.update({
      where: { id: escalationId },
      data: {
        status: "RESOLVED",
        handledById: adminId,
      },
      include: {
        conversation: true,
        handledBy: {
          select: { id: true, email: true },
        },
      },
    });
  }
}

export const escalationService = new EscalationService();
