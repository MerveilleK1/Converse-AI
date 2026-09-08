import OpenAI from "openai";

const DEEPSEEK_BASE_URL = "https://api.deepseek.com";
const DEEPSEEK_MODEL = "deepseek-chat";

function createPublicError(statusCode: number, publicMessage: string) {
  const error = new Error(publicMessage) as Error & {
    statusCode: number;
    publicMessage: string;
  };

  error.statusCode = statusCode;
  error.publicMessage = publicMessage;

  return error;
}

export async function createDeepSeekReply(message: string) {
  const apiKey = process.env.DEEPSEEK_API_KEY;

  if (!apiKey) {
    throw createPublicError(500, "DeepSeek API key is not configured");
  }

  const deepseek = new OpenAI({
    baseURL: DEEPSEEK_BASE_URL,
    apiKey,
  });

  try {
    const completion = await deepseek.chat.completions.create({
      model: DEEPSEEK_MODEL,
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant.",
        },
        {
          role: "user",
          content: message,
        },
      ],
      stream: false,
    });

    return completion.choices[0]?.message?.content ?? "";
  } catch (error) {
    console.error("DeepSeek request failed", error);
    throw createPublicError(502, "LLM provider request failed");
  }
}
