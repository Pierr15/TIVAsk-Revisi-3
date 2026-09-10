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
    if (!replyText || replyText.trim().length === 0) {
      throw new AppError("Pesan balasan tidak boleh kosong", 400);
    }

    const escalation = await this.getById(escalationId);

    // 1. Save admin response as Message
    const message = await prisma.message.create({
      data: {
        conversationId: escalation.conversationId,
        sender: "ADMIN",
        content: replyText.trim(),
        evidenceIds: [],
      },
    });

    // 2. Mark escalation as resolved
    const updatedEscalation = await prisma.escalation.update({
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

    // 3. Dispatch to WhatsApp Gateway
    const sent = await whatsAppService.sendMessage(
      escalation.conversation.phoneNumber,
      `*Pesan dari Panitia SPMB SMKN 1 Adiwerna:*\n\n${replyText.trim()}`
    );

    return {
      escalation: updatedEscalation,
      message,
      whatsAppSent: sent,
    };
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
