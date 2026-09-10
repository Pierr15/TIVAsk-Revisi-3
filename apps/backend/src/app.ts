import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { requestLogger } from "./middleware/logger";
import { errorHandler } from "./middleware/errorHandler";
import { authRouter } from "./modules/auth/auth.routes";
import { knowledgeBaseRouter } from "./modules/knowledge-base/knowledge-base.routes";
import { conversationRouter } from "./modules/conversation/conversation.routes";
import { escalationRouter } from "./modules/escalation/escalation.routes";
import { whatsAppRouter } from "./modules/whatsapp-gateway/whatsapp.routes";
import { dashboardRouter } from "./modules/dashboard/dashboard.routes";

export const app = express();

const frontendUrl = process.env.FRONTEND_URL || "http://localhost:3000";

app.use(
  cors({
    origin: [frontendUrl, "http://localhost:3000", "http://127.0.0.1:3000"],
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(requestLogger);

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

// Main Domain Routes
app.use("/api/auth", authRouter);
app.use("/api/knowledge-base", knowledgeBaseRouter);
app.use("/api/conversations", conversationRouter);
app.use("/api/escalations", escalationRouter);
app.use("/api/whatsapp", whatsAppRouter);
app.use("/api/dashboard", dashboardRouter);

// Global Error Handler
app.use(errorHandler);
