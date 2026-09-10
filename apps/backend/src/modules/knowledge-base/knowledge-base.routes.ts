import { Router } from "express";
import { knowledgeBaseController } from "./knowledge-base.controller";
import { authGuard } from "../../middleware/auth";

export const knowledgeBaseRouter = Router();

knowledgeBaseRouter.use(authGuard);

knowledgeBaseRouter.get("/", (req, res, next) => knowledgeBaseController.list(req, res, next));
knowledgeBaseRouter.get("/:id", (req, res, next) => knowledgeBaseController.getById(req, res, next));
knowledgeBaseRouter.post("/", (req, res, next) => knowledgeBaseController.create(req, res, next));
knowledgeBaseRouter.patch("/:id", (req, res, next) => knowledgeBaseController.update(req, res, next));
knowledgeBaseRouter.delete("/:id", (req, res, next) => knowledgeBaseController.delete(req, res, next));
