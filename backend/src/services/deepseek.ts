import OpenAI from "openai";

const DEEPSEEK_BASE_URL = "https://api.deepseek.com";
const DEEPSEEK_MODEL = "deepseek-chat";
const ALLOWED_DEEPSEEK_MODELS = new Set(["deepseek-chat"]);

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
    .filter(
      (message) =>
        message.role === "user" ||
        message.role === "assistant" ||
        message.role === "system",
    )
    .map((message) => ({
      role: message.role,
      content: message.content,
    }));
}

export async function createDeepSeekReply(
  message: string,
  model = DEEPSEEK_MODEL,
  history: ChatMessage[] = [],
) {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    throw createPublicError(500, "DeepSeek API key is not configured");
  }

  if (!ALLOWED_DEEPSEEK_MODELS.has(model)) {
    throw createPublicError(400, "Unsupported DeepSeek model");
  }

  const deepseek = new OpenAI({
    baseURL: DEEPSEEK_BASE_URL,
    apiKey,
  });

  try {
    const completion = await deepseek.chat.completions.create({
      model,
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant.",
        },
        ...formatHistory(history),
        {
          role: "user",
          content: message,
        },
      ],
      stream: false,
    });

    return completion.choices[0]?.message?.content ?? "";
  } catch (error) {
    console.error("DeepSeek request failed", getProviderLogDetails(error));
    throw createPublicError(502, "LLM provider request failed");
  }
}
