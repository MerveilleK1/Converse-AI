import cors from "cors";
import express from "express";
import { errorHandler } from "./middleware/errorHandler.js";

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

app.post("/api/chat", (req, res) => {
  const { message } = req.body;

  if (typeof message !== "string" || message.trim().length === 0) {
    res.status(400).json({ error: "Message is required" });
    return;
  }

  res.json({ reply: "Test response from backend" });
});

app.use(errorHandler);
