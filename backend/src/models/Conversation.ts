import { Schema, model, type InferSchemaType } from "mongoose";

const conversationSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
      default: "New chat",
    },
    provider: {
      type: String,
      enum: ["openai", "deepseek", "googleai"],
      required: true,
      default: "openai",
    },
    model: {
      type: String,
      required: true,
      default: "gpt-4o-mini",
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

export type Conversation = InferSchemaType<typeof conversationSchema>;

export const ConversationModel = model<Conversation>(
  "Conversation",
  conversationSchema,
);
