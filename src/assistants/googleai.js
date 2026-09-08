export class Assistant {
  #model;
  name = "googleai";

  constructor(model = "gemini-2.5-flash") {
    this.#model = model;
  }

  createChat() {}

  #formatHistory(history = []) {
    return history
      .filter(
        (message) =>
          message.role === "user" ||
          message.role === "assistant" ||
          message.role === "system",
      )
      .map((message) => ({
        role: message.role,
        content: message.content,
      }));
  }

  async chat(content, history = []) {
    try {
      const response = await fetch("http://localhost:3001/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: "googleai",
          message: content,
          model: this.#model,
          history: this.#formatHistory(history),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error ?? "Backend request failed");
      }

      return data.reply;
    } catch (error) {
      throw this.#parseError(error);
    }
  }

  async *chatStream(content, history = []) {
    try {
      yield await this.chat(content, history);
    } catch (error) {
      throw this.#parseError(error);
    }
  }

  #parseError(error) {
    return error;
  }
}
