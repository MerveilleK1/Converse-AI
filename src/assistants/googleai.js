import { GoogleGenAI} from "@google/genai";

const googleai = new GoogleGenAI({
  apiKey: import.meta.env.VITE_GOOGLE_AI_API_KEY,
});



export class Assistant {
  #chat;

  constructor(model = "gemini-2.5-flash") {
    
    this.#chat = googleai.chats.create({
  model: "gemini-2.5-flash",
  history: [],
});
  }

  async chat(content) {
    try {
      const result = await this.#chat.sendMessage({message: content});
      return result.text;
    } catch (error) {
      throw error;
    }
  }

   async *chatStream(content) {
    try {
      const result = await this.#chat.sendMessageStream({message: content});

      for await (const chunk of result) {
        yield chunk.text;
      }
    } catch (error) {
      throw error;
    }
  }
}