import OpenAI from "openai";

const deepseek = new OpenAI({
  baseURL: "https://api.deepseek.com",
  apiKey: import.meta.env.VITE_DEEPSEEK_AI_API_KEY,
  dangerouslyAllowBrowser: true,
});

export class Assistant {
  #model;

  constructor(model = "deepseek-chat") {
    this.#model = model;
  }

  formatHistory(history = []) {
    return history
      .filter(
        (message) =>
          message.role === "user" || message.role === "assistant" || message.role === "system"
      )
      .map((message) => ({
        role: message.role,
        content: message.content,
      }));
  }

  async chat(content, history = []) {
    const messages = [
      {
        role: "system",
        content: "You are a helpful assistant.",
      },
      ...this.formatHistory(history),
      {
        role: "user",
        content,
      },
    ];

    const completion = await deepseek.chat.completions.create({
      model: this.#model,
      messages,
      stream: false,
    });

    return completion.choices[0]?.message?.content ?? "";
  }

  async *chatStream(content, history = []) {
    const messages = [
      {
        role: "system",
        content: "You are a helpful assistant.",
      },
      ...this.formatHistory(history),
      {
        role: "user",
        content,
      },
    ];

    const stream = await deepseek.chat.completions.create({
      model: this.#model,
      messages,
      stream: true,
    });

    for await (const chunk of stream) {
      yield chunk.choices[0]?.delta?.content || "";
    }
  }
}