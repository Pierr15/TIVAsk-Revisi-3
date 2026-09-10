import { Router } from "express";
import { authController } from "./auth.controller";
import { authGuard } from "../../middleware/auth";

export const authRouter = Router();

authRouter.post("/login", (req, res, next) => authController.login(req, res, next));
authRouter.post("/logout", authGuard, (req, res, next) => authController.logout(req, res, next));
authRouter.get("/me", authGuard, (req, res, next) => authController.me(req, res, next));
