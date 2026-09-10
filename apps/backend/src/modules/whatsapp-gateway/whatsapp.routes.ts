import { Router } from "express";
import { whatsAppService } from "./whatsapp.service";
import { authGuard } from "../../middleware/auth";

export const whatsAppRouter = Router();

whatsAppRouter.use(authGuard);

whatsAppRouter.get("/status", (req, res) => {
  const status = whatsAppService.getStatus();
  return res.status(200).json(status);
});
