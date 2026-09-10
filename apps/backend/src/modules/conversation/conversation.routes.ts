import { Router } from "express";
import { conversationController } from "./conversation.controller";
import { authGuard } from "../../middleware/auth";

export const conversationRouter = Router();

conversationRouter.use(authGuard);

conversationRouter.get("/", (req, res, next) => conversationController.list(req, res, next));
conversationRouter.get("/:id/messages", (req, res, next) => conversationController.getMessages(req, res, next));
