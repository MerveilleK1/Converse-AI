export class Assistant {
  #model;
  #authToken;
  #onAuthError;

  constructor(model = "gpt-4o-mini", authToken, onAuthError) {
    this.#model = model;
    this.#authToken = authToken;
    this.#onAuthError = onAuthError;
  }

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
          Authorization: `Bearer ${this.#authToken}`,
        },
        body: JSON.stringify({
          provider: "openai",
          message: content,
          model: this.#model,
          history: this.#formatHistory(history),
        }),
      });

      const data = await response.json();

      if (response.status === 401) {
        this.#onAuthError?.();
        const error = new Error("Your session has expired. Please log in again.");
        error.status = 401;
        throw error;
      }

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
