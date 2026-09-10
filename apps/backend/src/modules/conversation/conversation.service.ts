import { prisma } from "../../lib/prisma";
import { retrievalService } from "../retrieval/retrieval.service";
import { groundingService } from "../ai-grounding/grounding.service";
import { AppError } from "../../middleware/errorHandler";

export class ConversationService {
  private isGreeting(content: string): boolean {
    const normalized = content
      .toLowerCase()
      .replace(/[!?.,]/g, "")
      .replace(/\s+/g, " ")
      .trim();

    return /^(halo|hai|hi|hello|assalamualaikum|assalamu alaikum|selamat pagi|pagi|selamat siang|siang|selamat sore|sore|selamat malam|malam)( kak| min| admin)?$/.test(
      normalized,
    );
  }

  private getWelcomeMessage(): string {
    return (
      "Halo! 👋 Saya TIVAsk, asisten virtual informasi SPMB SMKN 1 Adiwerna.\n\n" +
      "Saya dapat membantu menjawab pertanyaan seputar:\n" +
      "• Jadwal dan alur SPMB\n" +
      "• Persyaratan pendaftaran\n" +
      "• Jalur dan kuota penerimaan\n" +
      "• Informasi jurusan\n" +
      "• Biaya dan daftar ulang\n" +
      "• Informasi sekolah lainnya\n\n" +
      "Silakan kirim pertanyaan Anda. Contoh:\n" +
      '"Berapa kuota jurusan TJKT?"'
    );
  }

  async handleUserMessage(phoneNumber: string, content: string) {
    // 1. Find or create conversation
    let conversation = await prisma.conversation.findUnique({
      where: { phoneNumber },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 4,
        },
      },
    });

    if (!conversation) {
      conversation = await prisma.conversation.create({
        data: { phoneNumber },
        include: { messages: true },
      });
    }

    // 2. Save incoming user message
    await prisma.message.create({
      data: {
        conversationId: conversation.id,
        sender: "USER",
        content,
        evidenceIds: [],
      },
    });

    // Greeting / opening message
    if (this.isGreeting(content)) {
      const welcomeMessage = this.getWelcomeMessage();

      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          sender: "BOT",
          content: welcomeMessage,
          evidenceIds: [],
        },
      });

      return {
        reply: welcomeMessage,
        isFallback: false,
        evidenceIds: [],
      };
    }

    // 3. Search for evidence using Retrieval Engine
    const retrieval = await retrievalService.findEvidence(
      content,
      conversation.lastTopic,
      conversation.lastCategory,
    );

    // 4. Grounded Response or Fallback
    if (retrieval.match && retrieval.reason === "MATCH_FOUND") {
      const grounding = await groundingService.generateResponse({
        question: content,
        evidence: retrieval.match,
      });

      // Retrieval menemukan kandidat,
      // tetapi Gemini menilai evidence tidak cukup.
      if (grounding.isFallback) {
        await prisma.message.create({
          data: {
            conversationId: conversation.id,
            sender: "BOT",
            content: grounding.answer,
            evidenceIds: [],
          },
        });

        const openEscalation = await prisma.escalation.findFirst({
          where: {
            conversationId: conversation.id,
            status: "OPEN",
          },
        });

        if (!openEscalation) {
          await prisma.escalation.create({
            data: {
              conversationId: conversation.id,
              status: "OPEN",
            },
          });
        }

        return {
          reply: grounding.answer,
          isFallback: true,
          evidenceIds: [],
        };
      }

      // Update conversation context
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: {
          lastTopic: retrieval.resolvedTopic || retrieval.match.title,
          lastCategory: retrieval.resolvedCategory || retrieval.match.category,
        },
      });

      // Save bot response
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          sender: "BOT",
          content: grounding.answer,
          evidenceIds: grounding.evidenceIds,
        },
      });

      return {
        reply: grounding.answer,
        isFallback: false,
        evidenceIds: grounding.evidenceIds,
      };
    } else {
      // Fallback required: evidence not found, ambiguous, or below threshold
      const fallbackText = groundingService.getFallbackMessage();

      // A rejected/new topic must not resurrect an older answer on the next follow-up.
      await prisma.conversation.update({
        where: { id: conversation.id },
        data: { lastTopic: null, lastCategory: null },
      });

      // Save bot fallback response
      await prisma.message.create({
        data: {
          conversationId: conversation.id,
          sender: "BOT",
          content: fallbackText,
          evidenceIds: [],
        },
      });

      // Create or ensure an OPEN escalation exists for this conversation
      const openEscalation = await prisma.escalation.findFirst({
        where: {
          conversationId: conversation.id,
          status: "OPEN",
        },
      });

      if (!openEscalation) {
        await prisma.escalation.create({
          data: {
            conversationId: conversation.id,
            status: "OPEN",
          },
        });
      }

      return {
        reply: fallbackText,
        isFallback: true,
        evidenceIds: [],
      };
    }
  }

  async list(search?: string) {
    const where: any = {};
    if (search) {
      where.OR = [
        { phoneNumber: { contains: search, mode: "insensitive" } },
        { lastTopic: { contains: search, mode: "insensitive" } },
      ];
    }

    return prisma.conversation.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      include: {
        messages: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        _count: {
          select: { messages: true, escalations: true },
        },
      },
    });
  }

  async getMessages(conversationId: string) {
    const conversation = await prisma.conversation.findUnique({
      where: { id: conversationId },
    });

    if (!conversation) {
      throw new AppError("Percakapan tidak ditemukan", 404);
    }

    return prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: "asc" },
    });
  }
}

export const conversationService = new ConversationService();
