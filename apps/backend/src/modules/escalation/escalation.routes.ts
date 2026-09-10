import { Router } from "express";
import { escalationController } from "./escalation.controller";
import { authGuard } from "../../middleware/auth";

export const escalationRouter = Router();

escalationRouter.use(authGuard);

escalationRouter.get("/", (req, res, next) => escalationController.list(req, res, next));
escalationRouter.get("/:id", (req, res, next) => escalationController.getById(req, res, next));
escalationRouter.post("/:id/reply", (req, res, next) => escalationController.reply(req, res, next));
escalationRouter.patch("/:id/resolve", (req, res, next) => escalationController.resolve(req, res, next));
