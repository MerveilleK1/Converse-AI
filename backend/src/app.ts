import cors from "cors";
import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { Types } from "mongoose";
import { errorHandler } from "./middleware/errorHandler.js";
import { requireAuth } from "./middleware/requireAuth.js";
import { createDeepSeekReply } from "./services/deepseek.js";
import { createGoogleAIReply } from "./services/googleai.js";
import { createOpenAIReply } from "./services/openai.js";
import { ChatExchangeModel } from "./models/ChatExchange.js";
import { ConversationModel } from "./models/Conversation.js";
import { UserModel } from "./models/User.js";

const frontendOrigin = process.env.FRONTEND_ORIGIN ?? "http://localhost:5173";
const passwordSaltRounds = 10;

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

app.post("/api/auth/register", async (req, res, next) => {
  const { email, password } = req.body;

  if (
    typeof email !== "string" ||
    !email.includes("@") ||
    typeof password !== "string"
  ) {
    res.status(400).json({ error: "Valid email and password are required" });
    return;
  }

  if (password.length < 5) {
    res.status(400).json({ error: "Password must be at least 5 characters" });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const existingUser = await UserModel.findOne({ email: normalizedEmail });

    if (existingUser) {
      res.status(409).json({ error: "Email is already registered" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, passwordSaltRounds);
    const user = await UserModel.create({
      email: normalizedEmail,
      passwordHash,
    });

    res.status(201).json({
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/auth/login", async (req, res, next) => {
  const { email, password } = req.body;

  if (
    typeof email !== "string" ||
    !email.includes("@") ||
    typeof password !== "string" ||
    password.length === 0
  ) {
    res.status(400).json({ error: "Valid email and password are required" });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();

  try {
    const user = await UserModel.findOne({ email: normalizedEmail });

    if (!user) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);

    if (!isPasswordValid) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const jwtSecret = process.env.JWT_SECRET;

    if (!jwtSecret) {
      res.status(500).json({ error: "JWT secret is not configured" });
      return;
    }

    const token = jwt.sign(
      {
        sub: user.id,
        email: user.email,
      },
      jwtSecret,
      { expiresIn: "1h" },
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
      },
    });
  } catch (error) {
    next(error);
  }
});

app.post("/api/conversations", requireAuth, async (req, res, next) => {
  const authenticatedUserId = req.auth?.userId;
  const { title, provider, model } = req.body;

  if (!authenticatedUserId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const conversation = await ConversationModel.create({
      userId: authenticatedUserId,
      title:
        typeof title === "string" && title.trim().length > 0
          ? title.trim()
          : "New chat",
      provider: isSupportedProvider(provider) ? provider : "openai",
      model:
        typeof model === "string" && model.trim().length > 0
          ? model.trim()
          : "gpt-4o-mini",
    });

    res.status(201).json({ conversation });
  } catch (error) {
    next(error);
  }
});

app.get("/api/conversations", requireAuth, async (req, res, next) => {
  const authenticatedUserId = req.auth?.userId;

  if (!authenticatedUserId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const conversations = await ConversationModel.find({
      userId: authenticatedUserId,
    })
      .sort({ createdAt: 1 })
      .lean();

    res.json({ conversations });
  } catch (error) {
    next(error);
  }
});

app.get(
  "/api/conversations/:conversationId/messages",
  requireAuth,
  async (req, res, next) => {
    const authenticatedUserId = req.auth?.userId;
    const { conversationId } = req.params;

    if (!authenticatedUserId) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    if (!Types.ObjectId.isValid(conversationId)) {
      res.status(400).json({ error: "Invalid conversation id" });
      return;
    }

    try {
      const conversation = await ConversationModel.findOne({
        _id: conversationId,
        userId: authenticatedUserId,
      });

      if (!conversation) {
        res.status(404).json({ error: "Conversation not found" });
        return;
      }

      const exchanges = await ChatExchangeModel.find({
        conversationId,
        userId: authenticatedUserId,
      })
        .sort({ createdAt: 1 })
        .lean();

      res.json({ exchanges });
    } catch (error) {
      next(error);
    }
  },
);

app.post("/api/chat", requireAuth, async (req, res, next) => {
  const { conversationId, provider, message, model, history } = req.body;
  const authenticatedUserId = req.auth?.userId;

  if (!authenticatedUserId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  if (typeof message !== "string" || message.trim().length === 0) {
    res.status(400).json({ error: "Message is required" });
    return;
  }

  if (typeof conversationId !== "string" || !Types.ObjectId.isValid(conversationId)) {
    res.status(400).json({ error: "Valid conversation id is required" });
    return;
  }

  if (!isSupportedProvider(provider)) {
    res.status(400).json({ error: "Unsupported provider" });
    return;
  }

  try {
    const conversation = await ConversationModel.findOne({
      _id: conversationId,
      userId: authenticatedUserId,
    });

    if (!conversation) {
      res.status(404).json({ error: "Conversation not found" });
      return;
    }

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
      userId: authenticatedUserId,
      conversationId,
      userMessage: message.trim(),
      assistantMessage: reply,
      provider,
      model: selectedModel,
    });

    const title = message.trim().split(" ").slice(0, 7).join(" ");
    await ConversationModel.updateOne(
      { _id: conversationId, userId: authenticatedUserId },
      {
        $set: {
          provider,
          model: selectedModel,
          ...(conversation.title === "New chat" ? { title } : {}),
        },
      },
    );

    res.json({ reply });
  } catch (error) {
    next(error);
  }
});

app.get("/api/chat/history", requireAuth, async (req, res, next) => {
  const authenticatedUserId = req.auth?.userId;

  if (!authenticatedUserId) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  try {
    const exchanges = await ChatExchangeModel.find({
      userId: authenticatedUserId,
    })
      .sort({ createdAt: 1 })
      .lean();
    res.json({ exchanges });
  } catch (error) {
    next(error);
  }
});

app.use(errorHandler);

function isSupportedProvider(provider: unknown) {
  return provider === "openai" || provider === "deepseek" || provider === "googleai";
}
