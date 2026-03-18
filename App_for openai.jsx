import { useState } from "react";
import { Assistant } from "./assistants/openai";
import { Chat } from "./components/Chat/Chat";
import { Controls } from "./components/Controls/Controls";
import styles from "./App.module.css";


function App() {
  const assistant = new Assistant();
  const [messages, setMessages] = useState([]);

   const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  function updateLastMessageContent(content) {
    setMessages((prevMessages) =>
      prevMessages.map((message, index) =>
        index === prevMessages.length - 1
          ? { ...message, content: `${message.content}${content}` }
          : message
      )
    );
  }


  function addMessage(message) {
    setMessages((prevMessages) => [...prevMessages, message]);
  }

  async function handleContentSend(content) {
    addMessage({ content, role: "user" });
    setIsLoading(true);

    try {
      const result = await assistant.chatStream(content, messages);

      let isFirstChunk = false;

      for await (const chunk of result) {
        if (!isFirstChunk) {
          isFirstChunk = true;
          addMessage({ content: "", role: "assistant" });
          setIsLoading(false);
          setIsStreaming(true);
        }

        updateLastMessageContent(chunk);
      }

      setIsStreaming(false);
    } catch (error) {
      console.error("Gemini error:", error);

      addMessage({
        content: "Sorry, I couldn't process your request. Please try again!",
        role: "system",
      });
    }
  }

  return (
    <div className={styles.App}>
      <header className={styles.Header}>
        <img className={styles.Logo} src="/chatbot.png" />
        <h2 className={styles.Title}>Converse-AI</h2>
      </header>

      <div className={styles.ChatContainer}>
        <Chat messages={messages} />
      </div>

      <Controls onSend={handleContentSend} />
    </div>
  );
}

export default App;