import { Request, Response, NextFunction } from "express";
import { conversationService } from "./conversation.service";

export class ConversationController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const search = req.query.search as string | undefined;
      const conversations = await conversationService.list(search);
      return res.status(200).json({ conversations });
    } catch (error) {
      next(error);
    }
  }

  async getMessages(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const messages = await conversationService.getMessages(id);
      return res.status(200).json({ messages });
    } catch (error) {
      next(error);
    }
  }
}

export const conversationController = new ConversationController();
