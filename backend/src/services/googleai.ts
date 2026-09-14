import { GoogleGenAI } from "@google/genai";

const GOOGLE_AI_MODEL = "gemini-2.5-flash";
const ALLOWED_GOOGLE_AI_MODELS = new Set([
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
]);

type ChatMessage = {
  role: "user" | "assistant" | "system";
  content: string;
};

function createPublicError(statusCode: number, publicMessage: string) {
  const error = new Error(publicMessage) as Error & {
    statusCode: number;
    publicMessage: string;
  };

  error.statusCode = statusCode;
  error.publicMessage = publicMessage;

  return error;
}

function getProviderLogDetails(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return { message: String(error) };
  }

  const providerError = error as {
    status?: number;
    code?: string;
    type?: string;
    message?: string;
  };

  return {
    status: providerError.status,
    code: providerError.code,
    type: providerError.type,
    message: providerError.message,
  };
}

function formatHistory(history: ChatMessage[] = []) {
  return history
    .filter(({ role }) => role !== "system")
    .map(({ content, role }) => ({
      parts: [{ text: content }],
      role: role === "assistant" ? "model" : role,
    }));
}

export async function createGoogleAIReply(
  message: string,
  model = GOOGLE_AI_MODEL,
  history: ChatMessage[] = [],
) {
  const apiKey = process.env.GOOGLE_AI_API_KEY;

  if (!apiKey) {
    throw createPublicError(500, "Google AI API key is not configured");
  }

  if (!ALLOWED_GOOGLE_AI_MODELS.has(model)) {
    throw createPublicError(400, "Unsupported Google AI model");
  }

  const googleai = new GoogleGenAI({ apiKey });

  try {
    const chat = googleai.chats.create({
      model,
      history: formatHistory(history),
    });

    const result = await chat.sendMessage({ message });
    return result.text ?? "";
  } catch (error) {
    console.error("Google AI request failed", getProviderLogDetails(error));
    throw createPublicError(502, "LLM provider request failed");
  }
}
