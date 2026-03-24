import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPEN_AI_API_KEY,
  dangerouslyAllowBrowser: true,
});

export class Assistant {
  #model;
  #client;

  constructor(model = "gpt-4o-mini", client = openai) {
    this.#client = client;
    this.#model = model;
  }

  #formatHistory(history = []) {
    return history
      .filter(
        (message) =>
          message.role === "user" ||
          message.role === "assistant" ||
          message.role === "system"
      )
      .map((message) => ({
        role: message.role,
        content: [
          {
            type: message.role === "assistant" ? "output_text" : "input_text",
            text: message.content,
          },
        ],
      }));
  }

  async chat(content, history = []) {
    try {
      const formattedHistory = this.#formatHistory(history);

      const result = await this.#client.responses.create({
        model: this.#model,
        input: [
          ...formattedHistory,
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: content,
              },
            ],
          },
        ],
      });

      return result.output_text;
    } catch (error) {
      throw this.#parseError(error);
    }
  }

  async *chatStream(content, history = []) {
    try {
      const formattedHistory = this.#formatHistory(history);

      const stream = await this.#client.responses.create({
        model: this.#model,
        input: [
          ...formattedHistory,
          {
            role: "user",
            content: [
              {
                type: "input_text",
                text: content,
              },
            ],
          },
        ],
        stream: true,
      });

      for await (const event of stream) {
        if (event.type === "response.output_text.delta") {
          yield event.delta;
        }
      }
    } catch (error) {
      throw this.#parseError(error);
    }
  }

  #parseError(error) {
    return error;
  }
}