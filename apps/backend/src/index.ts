import "dotenv/config";
import { app } from "./app";
import { whatsAppService } from "./modules/whatsapp-gateway/whatsapp.service";
import { conversationService } from "./modules/conversation/conversation.service";

const PORT = process.env.PORT || 3001;

// Connect WhatsApp incoming message to Conversation Service
whatsAppService.setMessageCallback(async (phoneNumber, text, rawMsg) => {
  console.log(`📩 Incoming message from ${phoneNumber}: "${text}"`);
  const result = await conversationService.handleUserMessage(phoneNumber, text);
  await rawMsg.reply(result.reply);
  console.log(`📤 Replied to ${phoneNumber} (fallback=${result.isFallback})`);
});

// Start HTTP Server
const server = app.listen(PORT, () => {
  console.log(`🚀 TIVAsk Backend running on http://localhost:${PORT}`);
  console.log(`🌐 Frontend origin allowed: ${process.env.FRONTEND_URL || "http://localhost:3000"}`);

  // Initialize WhatsApp client if not explicitly disabled
  if (process.env.DISABLE_WHATSAPP !== "true") {
    whatsAppService.initializeClient().catch((err) => {
      console.error("WhatsApp initialization error:", err);
    });
  } else {
    console.log("ℹ️ WhatsApp initialization skipped (DISABLE_WHATSAPP=true).");
  }
});

export { server };
