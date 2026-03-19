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

  async chat(content, history = []) {
    try{
    const formattedHistory = history.map((message) => ({
      role: message.role,
      content: [
        {
          type: "input_text",
          text: message.content,
        },
      ],
    }));

    const result = awaitthis.#client.openai.responses.create({
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
      throw error;
    }
  }


  async *chatStream(content, history = []) {
  const formattedHistory = history
    .filter((message) => message.role === "user" || message.role === "assistant")
    .map((message) => ({
      role: message.role,
      content: [
        {
          type: "input_text",
          text: message.content,
        },
      ],
    }));

  const stream = await openai.responses.create({
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
}
}