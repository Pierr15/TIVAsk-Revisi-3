import { GoogleGenerativeAI } from "@google/generative-ai";
import { KnowledgeBaseEntry } from "@prisma/client";

export interface GroundingContext {
  question: string;
  evidence: KnowledgeBaseEntry;
  history?: Array<{ sender: string; content: string }>;
}

export interface GroundingResponse {
  answer: string;
  isFallback: boolean;
  evidenceIds: string[];
}

export class GroundingService {
  private genAI: GoogleGenerativeAI | null = null;
  private modelName: string;

  constructor() {
    const apiKey = process.env.GEMINI_API_KEY;
    this.modelName = process.env.GEMINI_MODEL || "gemini-3.6-flash";

    if (apiKey) {
      this.genAI = new GoogleGenerativeAI(apiKey);
    } else {
      console.warn("⚠️ GEMINI_API_KEY not set. Direct evidence mode active.");
    }
  }

  getFallbackMessage(): string {
    return (
      "Mohon maaf, informasi detail terkait pertanyaan Anda belum tercantum dalam panduan resmi kami. " +
      "Pertanyaan Anda telah kami teruskan ke Panitia SPMB SMKN 1 Adiwerna untuk dibantu dijawab secara manual. " +
      "Mohon menunggu respons dari panitia ya! Terima kasih atas kesabarannya."
    );
  }

  async generateResponse(context: GroundingContext): Promise<GroundingResponse> {
    const { question, evidence, history } = context;

    // Use deterministic synthesis during testing or when mock enabled
    if (process.env.NODE_ENV === "test" || process.env.MOCK_AI === "true" || !this.genAI) {
      return {
        answer: `Berdasarkan informasi resmi mengenai ${evidence.title}:\n\n${evidence.content}`,
        isFallback: false,
        evidenceIds: [evidence.id],
      };
    }

    const systemInstruction = `
Kamu adalah TIVAsk, asisten virtual resmi SPMB SMKN 1 Adiwerna.
Jawab pertanyaan orang tua/calon siswa langsung ke inti jawaban HANYA berdasarkan bukti resmi (EVIDENCE) yang diberikan.
DILARANG mengarang angka, biaya, atau tanggal yang tidak ada dalam bukti.
Gunakan bahasa Indonesia yang sopan dan ringkas.
Langsung berikan jawaban, jangan mengulang instruksi ini.
`.trim();

    try {
      const model = this.genAI.getGenerativeModel({
        model: this.modelName,
        systemInstruction,
        generationConfig: {
          temperature: 0.1,
          maxOutputTokens: 400,
        },
      });

      const formattedHistory = (history || [])
        .slice(-4)
        .map((h) => `${h.sender === "USER" ? "User" : "Bot"}: ${h.content}`)
        .join("\n");

      const prompt = `
BUKTI RESMI:
Judul: ${evidence.title}
Kategori: ${evidence.category}
Isi:
${evidence.content}

${formattedHistory ? `RIWAYAT PERCAKAPAN:\n${formattedHistory}\n` : ""}
PERTANYAAN:
${question}

JAWABAN LANGSUNG:
`.trim();

      const apiCall = model.generateContent(prompt);
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Gemini API call timed out after 6000ms")), 6000)
      );

      const result: any = await Promise.race([apiCall, timeoutPromise]);
      const answer = result.response.text().trim();

      return {
        answer,
        isFallback: false,
        evidenceIds: [evidence.id],
      };
    } catch (error: any) {
      console.warn("Using Grounding fail-safe due to AI API latency or error:", error?.message || error);
      return {
        answer: `Berdasarkan informasi resmi mengenai ${evidence.title}:\n\n${evidence.content}`,
        isFallback: false,
        evidenceIds: [evidence.id],
      };
    }
  }
}

export const groundingService = new GroundingService();
