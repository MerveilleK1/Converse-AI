import cors from "cors";
import express from "express";
import { errorHandler } from "./middleware/errorHandler.js";
import { createDeepSeekReply } from "./services/deepseek.js";
import { createGoogleAIReply } from "./services/googleai.js";
import { createOpenAIReply } from "./services/openai.js";
import { ChatExchangeModel } from "./models/ChatExchange.js";

const frontendOrigin = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";

export const app = express();

app.use(
  cors({
    origin: frontendOrigin,
  }),
);

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ status: "ok" });
});

app.post("/api/chat", async (req, res, next) => {
  const { provider, message, model, history } = req.body;

  if (typeof message !== "string" || message.trim().length === 0) {
    res.status(400).json({ error: "Message is required" });
    return;
  }

  if (provider !== "openai" && provider !== "deepseek" && provider !== "googleai") {
    res.status(400).json({ error: "Unsupported provider" });
    return;
  }

  try {
    let reply;
    let selectedModel;

    if (provider === "openai") {
      selectedModel = typeof model === "string" ? model : "gpt-4o-mini";
      reply = await createOpenAIReply(
        message.trim(),
        selectedModel,
        Array.isArray(history) ? history : [],
      );
    } else if (provider === "googleai") {
      selectedModel = typeof model === "string" ? model : "gemini-2.5-flash";
      reply = await createGoogleAIReply(
        message.trim(),
        selectedModel,
        Array.isArray(history) ? history : [],
      );
    } else {
      selectedModel = typeof model === "string" ? model : "deepseek-chat";
      reply = await createDeepSeekReply(
        message.trim(),
        selectedModel,
        Array.isArray(history) ? history : [],
      );
    }

    await ChatExchangeModel.create({
      userMessage: message.trim(),
      assistantMessage: reply,
      provider,
      model: selectedModel,
    });

    res.json({ reply });
  } catch (error) {
    next(error);
  }
});

app.get("/api/chat/history", async (_req, res, next) => {
  try {
    const exchanges = await ChatExchangeModel.find().sort({ createdAt: 1 }).lean();
    res.json({ exchanges });
  } catch (error) {
    next(error);
  }
});

app.use(errorHandler);
