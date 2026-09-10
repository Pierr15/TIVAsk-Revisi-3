import { Router } from "express";
import { prisma } from "../../lib/prisma";
import { authGuard } from "../../middleware/auth";
import { whatsAppService } from "../whatsapp-gateway/whatsapp.service";

export const dashboardRouter = Router();

dashboardRouter.use(authGuard);

dashboardRouter.get("/summary", async (req, res, next) => {
  try {
    const [totalConversations, totalEscalations, openEscalations, totalKBPublished] =
      await Promise.all([
        prisma.conversation.count(),
        prisma.escalation.count(),
        prisma.escalation.count({ where: { status: "OPEN" } }),
        prisma.knowledgeBaseEntry.count({ where: { status: "PUBLISHED" } }),
      ]);

    const waStatus = whatsAppService.getStatus();

    return res.status(200).json({
      totalConversations,
      totalEscalations,
      openEscalations,
      totalKBPublished,
      whatsAppStatus: waStatus.status,
    });
  } catch (error) {
    next(error);
  }
});
