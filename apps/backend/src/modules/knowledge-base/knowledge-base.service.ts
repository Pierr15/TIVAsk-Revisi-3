import { prisma } from "../../lib/prisma";
import { AppError } from "../../middleware/errorHandler";
import { CreateKBDTO, UpdateKBDTO, KBStatus } from "@tivask/shared";

export class KnowledgeBaseService {
  async list(status?: string, search?: string) {
    const where: any = {};
    if (status && ["DRAFT", "PUBLISHED", "ARCHIVED"].includes(status)) {
      where.status = status as KBStatus;
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { category: { contains: search, mode: "insensitive" } },
        { content: { contains: search, mode: "insensitive" } },
        { keywords: { has: search.toLowerCase() } },
      ];
    }

    return prisma.knowledgeBaseEntry.findMany({
      where,
      orderBy: { updatedAt: "desc" },
    });
  }

  async getById(id: string) {
    const entry = await prisma.knowledgeBaseEntry.findUnique({
      where: { id },
    });
    if (!entry) {
      throw new AppError("Entri Knowledge Base tidak ditemukan", 404);
    }
    return entry;
  }

  async create(data: CreateKBDTO) {
    if (!data.title || !data.category || !data.content) {
      throw new AppError("Title, category, dan content wajib diisi", 400);
    }

    const keywords = Array.isArray(data.keywords)
      ? data.keywords.map((k) => k.trim().toLowerCase()).filter(Boolean)
      : [];

    return prisma.knowledgeBaseEntry.create({
      data: {
        title: data.title.trim(),
        category: data.category.trim().toUpperCase(),
        content: data.content.trim(),
        keywords,
        status: data.status || "DRAFT",
      },
    });
  }

  async update(id: string, data: UpdateKBDTO) {
    await this.getById(id);

    const updateData: any = {};
    if (data.title !== undefined) updateData.title = data.title.trim();
    if (data.category !== undefined) updateData.category = data.category.trim().toUpperCase();
    if (data.content !== undefined) updateData.content = data.content.trim();
    if (data.status !== undefined) {
      if (!["DRAFT", "PUBLISHED", "ARCHIVED"].includes(data.status)) {
        throw new AppError("Status tidak valid. Harus DRAFT, PUBLISHED, atau ARCHIVED", 400);
      }
      updateData.status = data.status;
    }
    if (data.keywords !== undefined) {
      updateData.keywords = Array.isArray(data.keywords)
        ? data.keywords.map((k) => k.trim().toLowerCase()).filter(Boolean)
        : [];
    }

    return prisma.knowledgeBaseEntry.update({
      where: { id },
      data: updateData,
    });
  }

  async delete(id: string) {
    await this.getById(id);
    return prisma.knowledgeBaseEntry.delete({
      where: { id },
    });
  }
}

export const knowledgeBaseService = new KnowledgeBaseService();
