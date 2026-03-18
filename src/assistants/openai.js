import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: import.meta.env.VITE_OPEN_AI_API_KEY,
  dangerouslyAllowBrowser: true,
});

export class Assistant {
  #model;

  constructor(model = "gpt-4o-mini") {
    this.#model = model;
  }

  async chat(content, history = []) {
    const formattedHistory = history.map((message) => ({
      role: message.role,
      content: [
        {
          type: "input_text",
          text: message.content,
        },
      ],
    }));

    const result = await openai.responses.create({
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
  }
}