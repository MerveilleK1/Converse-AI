import styles from "./Sidebar.module.css";
import { useState } from "react";

export function Sidebar({
  chats,
  activeChatId,
  activeChatMessages,
  onActiveChatIdChange,
  onNewChatCreate,
}) {
  const [isOpen, setIsOpen] = useState(false);

  function handleSidebarToggle() {
    setIsOpen(!isOpen);
  }

  function handleEscapeClick(event) {
    if (isOpen && event.key === "Escape") {
      setIsOpen(false);
    }
  }

  function handleChatClick(chatId) {
    onActiveChatIdChange(chatId);

    if (isOpen) {
      setIsOpen(false);
    }
  }

  return (
    <>
      <button
        className={styles.MenuButton}
        onClick={handleSidebarToggle}
        onKeyDown={handleEscapeClick}
      >
        <MenuIcon />
      </button>

      <div className={styles.Sidebar} data-open={isOpen}>
          <button
          className={styles.NewChatButton}
          disabled={activeChatMessages.length === 0}
          onClick={onNewChatCreate}
        > +
        </button>
        <ul className={styles.Chats}>
          {chats
            .map((chat) => (
              <li
                key={chat.id}
                className={styles.Chat}
                data-active={chat.id === activeChatId}
                onClick={() => handleChatClick(chat.id)}
              >
                <button className={styles.ChatButton}>
                  <div className={styles.ChatTitle}>{getChatTitle(chat)}</div>
                </button>
              </li>
            ))}
        </ul>
      </div>

      {isOpen && (
        <div className={styles.Overlay} onClick={handleSidebarToggle} />
      )}
    </>
  );
}

function getChatTitle(chat) {
  if (typeof chat.title === "string" && chat.title.trim().length > 0) {
    return chat.title.trim();
  }

  const firstMessage = chat.messages?.find(
    (message) => message.role === "user" && message.content,
  );

  if (firstMessage) {
    return firstMessage.content.trim().split(" ").slice(0, 7).join(" ");
  }

  return "New chat";
}

function MenuIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      height="24px"
      viewBox="0 -960 960 960"
      width="24px"
      fill="#1f1f1f"
    >
      <path d="M280-600v-80h560v80H280Zm0 160v-80h560v80H280Zm0 160v-80h560v80H280ZM160-600q-17 0-28.5-11.5T120-640q0-17 11.5-28.5T160-680q17 0 28.5 11.5T200-640q0 17-11.5 28.5T160-600Zm0 160q-17 0-28.5-11.5T120-480q0-17 11.5-28.5T160-520q17 0 28.5 11.5T200-480q0 17-11.5 28.5T160-440Zm0 160q-17 0-28.5-11.5T120-320q0-17 11.5-28.5T160-360q17 0 28.5 11.5T200-320q0 17-11.5 28.5T160-280Z" />
    </svg>
  );
}
