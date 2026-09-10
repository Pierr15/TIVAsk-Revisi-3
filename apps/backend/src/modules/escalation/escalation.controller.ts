import { Request, Response, NextFunction } from "express";
import { escalationService } from "./escalation.service";

export class EscalationController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as string | undefined;
      const search = req.query.search as string | undefined;
      const escalations = await escalationService.list(status, search);
      return res.status(200).json({ escalations });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const escalation = await escalationService.getById(id);
      return res.status(200).json({ escalation });
    } catch (error) {
      next(error);
    }
  }

  async reply(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const { message } = req.body;
      const adminId = req.user!.id;
      const result = await escalationService.reply(id, adminId, message);
      return res.status(200).json({
        successMessage: "Balasan diterima gateway WhatsApp",
        escalation: result.escalation,
        sentMessage: result.message,
        whatsAppSent: result.whatsAppSent,
      });
    } catch (error) {
      next(error);
    }
  }

  async resolve(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const adminId = req.user!.id;
      const escalation = await escalationService.resolve(id, adminId);
      return res.status(200).json({
        successMessage: "Eskalasi ditandai selesai",
        escalation,
      });
    } catch (error) {
      next(error);
    }
  }
}

export const escalationController = new EscalationController();
