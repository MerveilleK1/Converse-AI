import { Schema, model, type InferSchemaType } from "mongoose";

const chatExchangeSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    userMessage: {
      type: String,
      required: true,
      trim: true,
    },
    assistantMessage: {
      type: String,
      required: true,
    },
    provider: {
      type: String,
      enum: ["openai", "deepseek", "googleai"],
      required: true,
    },
    model: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      required: true,
    },
  },
  {
    versionKey: false,
  },
);

export type ChatExchange = InferSchemaType<typeof chatExchangeSchema>;

export const ChatExchangeModel = model<ChatExchange>(
  "ChatExchange",
  chatExchangeSchema,
);
