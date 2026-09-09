import styles from "./Chat.module.css";
import { useEffect, useRef, useState } from "react";
import { Loader } from "../Loader/Loader";
import { Messages } from "../Messages/Messages";
import { Controls } from "../Controls/Controls";

export function Chat({
  assistant,
  isActive = false,
  chatId,
  chatMessages,
  onChatMessagesUpdate,
  onAuthError,
}) {
  const isSyncingFromPropsRef = useRef(false);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);

  useEffect(() => {
    setMessages((currentMessages) =>
      {
        if (areMessagesEqual(currentMessages, chatMessages)) {
          return currentMessages;
        }

        isSyncingFromPropsRef.current = true;
        return chatMessages;
      },
    );
  }, [chatId, chatMessages]);

  useEffect(() => {
    if (assistant?.name === "googleai") {
      assistant.createChat(chatMessages);
    }
  }, [assistant, chatMessages]);

  useEffect(() => {
    if (isSyncingFromPropsRef.current) {
      isSyncingFromPropsRef.current = false;
      return;
    }

    onChatMessagesUpdate(chatId, messages);
  }, [chatId, messages, onChatMessagesUpdate]);

  function updateLastMessageContent(content) {
    setMessages((prevMessages) =>
      prevMessages.map((message, index) =>
        index === prevMessages.length - 1
          ? { ...message, content: `${message.content}${content}` }
          : message,
      ),
    );
  }

  function addMessage(message) {
    setMessages((prevMessages) => [...prevMessages, message]);
  }

  async function handleContentSend(content) {
    addMessage({ content, role: "user" });
    setIsLoading(true);
    try {
      const result = await assistant.chatStream(
        content,
        messages.filter(({ role }) => role !== "system"),
        chatId,
      );

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
      if (error?.status === 401) {
        onAuthError();
        return;
      }

      addMessage({
        content:
          error?.message ??
          "Sorry, I couldn't process your request. Please try again!",
        role: "system",
      });
      setIsLoading(false);
      setIsStreaming(false);
    }
  }

  if (!isActive) return null;

  return (
    <>
      {isLoading && <Loader />}

      <div className={styles.Chat}>
        <Messages messages={messages} />
      </div>

      <Controls
        isDisabled={isLoading || isStreaming}
        onSend={handleContentSend}
      />
    </>
  );
}

function areMessagesEqual(firstMessages = [], secondMessages = []) {
  if (firstMessages.length !== secondMessages.length) {
    return false;
  }

  return firstMessages.every((message, index) => {
    const otherMessage = secondMessages[index];

    return (
      message.role === otherMessage?.role &&
      message.content === otherMessage?.content &&
      message.provider === otherMessage?.provider &&
      message.model === otherMessage?.model &&
      message.createdAt === otherMessage?.createdAt
    );
  });
}
