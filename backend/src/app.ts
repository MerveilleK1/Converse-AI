import cors from "cors";
import express from "express";
import { errorHandler } from "./middleware/errorHandler.js";
import { createDeepSeekReply } from "./services/deepseek.js";
import { createGoogleAIReply } from "./services/googleai.js";
import { createOpenAIReply } from "./services/openai.js";

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

    if (provider === "openai") {
      reply = await createOpenAIReply(
        message.trim(),
        typeof model === "string" ? model : undefined,
        Array.isArray(history) ? history : [],
      );
    } else if (provider === "googleai") {
      reply = await createGoogleAIReply(
        message.trim(),
        typeof model === "string" ? model : undefined,
        Array.isArray(history) ? history : [],
      );
    } else {
      reply = await createDeepSeekReply(message.trim());
    }

    res.json({ reply });
  } catch (error) {
    next(error);
  }
});

app.use(errorHandler);
