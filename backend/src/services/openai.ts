import OpenAI from "openai";

const OPENAI_MODEL = "gpt-4o-mini";
const ALLOWED_OPENAI_MODELS = new Set(["gpt-4o-mini", "gpt-4.1-nano"]);

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

export async function createOpenAIReply(
  message: string,
  model = OPENAI_MODEL,
  history: ChatMessage[] = [],
) {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw createPublicError(500, "OpenAI API key is not configured");
  }

  if (!ALLOWED_OPENAI_MODELS.has(model)) {
    throw createPublicError(400, "Unsupported OpenAI model");
  }

  const openai = new OpenAI({ apiKey });

  try {
    const result = await openai.responses.create({
      model,
      input: [
        ...formatHistory(history),
        {
          role: "user",
          content: message,
        },
      ],
    });

    return result.output_text;
  } catch (error) {
    console.error("OpenAI request failed", error);
    throw createPublicError(502, "LLM provider request failed");
  }
}
