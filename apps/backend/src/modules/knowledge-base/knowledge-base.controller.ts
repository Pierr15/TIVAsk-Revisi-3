import { Request, Response, NextFunction } from "express";
import { knowledgeBaseService } from "./knowledge-base.service";

export class KnowledgeBaseController {
  async list(req: Request, res: Response, next: NextFunction) {
    try {
      const status = req.query.status as string | undefined;
      const search = req.query.search as string | undefined;
      const entries = await knowledgeBaseService.list(status, search);
      return res.status(200).json({ entries });
    } catch (error) {
      next(error);
    }
  }

  async getById(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const entry = await knowledgeBaseService.getById(id);
      return res.status(200).json({ entry });
    } catch (error) {
      next(error);
    }
  }

  async create(req: Request, res: Response, next: NextFunction) {
    try {
      const { title, category, content, keywords, status } = req.body;
      const entry = await knowledgeBaseService.create({
        title,
        category,
        content,
        keywords,
        status,
      });
      return res.status(201).json({ message: "Entri berhasil dibuat", entry });
    } catch (error) {
      next(error);
    }
  }

  async update(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      const entry = await knowledgeBaseService.update(id, req.body);
      return res.status(200).json({ message: "Entri berhasil diperbarui", entry });
    } catch (error) {
      next(error);
    }
  }

  async delete(req: Request, res: Response, next: NextFunction) {
    try {
      const { id } = req.params;
      await knowledgeBaseService.delete(id);
      return res.status(200).json({ message: "Entri berhasil dihapus" });
    } catch (error) {
      next(error);
    }
  }
}

export const knowledgeBaseController = new KnowledgeBaseController();
