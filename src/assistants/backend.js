export class Assistant {
  async chat(content) {
    const response = await fetch("http://localhost:3001/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ message: content }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data?.error ?? "Backend request failed");
    }

    return data.reply;
  }

  async *chatStream(content) {
    yield await this.chat(content);
  }
}
