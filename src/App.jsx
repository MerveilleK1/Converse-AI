import { useCallback, useEffect, useMemo, useState } from "react";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { Chat } from "./components/Chat/Chat";
import { Assistant } from "./components/Assistant/Assistant";
import { Auth } from "./components/Auth/Auth";
import styles from "./App.module.css";
import { WelcomeOverlay } from "./components/Welcome/WelcomeOverlay";

const API_BASE_URL = "http://localhost:3001";
const DEFAULT_ASSISTANT_VALUE = "openai:gpt-4o-mini";

function App() {
  const [authToken, setAuthToken] = useState(() =>
    localStorage.getItem("authToken"),
  );
  const [authUser, setAuthUser] = useState(() => {
    const storedUser = localStorage.getItem("authUser");

    try {
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (_error) {
      localStorage.removeItem("authToken");
      localStorage.removeItem("authUser");
      return null;
    }
  });
  const [authMessage, setAuthMessage] = useState("");
  const [assistant, setAssistant] = useState();
  const [assistantValue, setAssistantValue] = useState(DEFAULT_ASSISTANT_VALUE);
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState();
  const [hasStarted, setHasStarted] = useState(false);
  const [hasLoadedConversations, setHasLoadedConversations] = useState(false);

  const activeChat = useMemo(
    () => chats.find(({ id }) => id === activeChatId),
    [chats, activeChatId],
  );
  const activeChatMessages = activeChat?.messages ?? [];

  const handleLogout = useCallback((nextAuthMessage = "") => {
    setAuthToken(null);
    setAuthUser(null);
    setAssistant(undefined);
    setAssistantValue(DEFAULT_ASSISTANT_VALUE);
    setChats([]);
    setActiveChatId(undefined);
    setHasStarted(false);
    setHasLoadedConversations(false);
    setAuthMessage(typeof nextAuthMessage === "string" ? nextAuthMessage : "");
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
  }, []);

  const handleAuthExpired = useCallback(() => {
    handleLogout("Your session has expired. Please log in again.");
  }, [handleLogout]);

  const fetchWithAuth = useCallback(
    async (path, options = {}) => {
      const response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: {
          ...(options.body ? { "Content-Type": "application/json" } : {}),
          Authorization: `Bearer ${authToken}`,
          ...options.headers,
        },
      });

      if (response.status === 401) {
        handleAuthExpired();
      }

      return response;
    },
    [authToken, handleAuthExpired],
  );

  const fetchConversationMessages = useCallback(
    async (conversationId) => {
      const response = await fetchWithAuth(
        `/api/conversations/${conversationId}/messages`,
      );

      if (!response.ok) {
        throw new Error("Unable to load conversation messages");
      }

      const data = await response.json();
      return mapExchangesToMessages(data.exchanges ?? []);
    },
    [fetchWithAuth],
  );

  const createConversation = useCallback(
    async () => {
      const { provider, model } = parseAssistantValue(assistantValue);
      const response = await fetchWithAuth("/api/conversations", {
        method: "POST",
        body: JSON.stringify({
          title: "New chat",
          provider,
          model,
        }),
      });

      if (!response.ok) {
        throw new Error("Unable to create conversation");
      }

      const data = await response.json();
      return mapConversationToChat(data.conversation);
    },
    [assistantValue, fetchWithAuth],
  );

  const handleNewChatCreate = useCallback(async () => {
    try {
      const chat = await createConversation();

      setActiveChatId(chat.id);
      setChats((prevChats) => [...prevChats, chat]);
    } catch (error) {
      console.error(error);
    }
  }, [createConversation]);

  const handleAssistantChange = useCallback((newAssistant) => {
    setAssistant(newAssistant);
  }, []);

  const handleAssistantValueChange = useCallback((nextValue) => {
    setAssistantValue(nextValue);

    const { provider, model } = parseAssistantValue(nextValue);
    setChats((prevChats) =>
      prevChats.map((chat) =>
        chat.id === activeChatId ? { ...chat, provider, model } : chat,
      ),
    );
  }, [activeChatId]);

  const handleAuthSuccess = useCallback((token, user) => {
    setAuthToken(token);
    setAuthUser(user);
    setAuthMessage("");
    setHasLoadedConversations(false);
    localStorage.setItem("authToken", token);
    localStorage.setItem("authUser", JSON.stringify(user));
  }, []);

  function handleChatMessagesUpdate(id, messages) {
    const title = messages[0]?.content.split(" ").slice(0, 7).join(" ");

    setChats((prevChats) =>
      prevChats.map((chat) =>
        chat.id === id
          ? { ...chat, title: chat.title === "New chat" ? title : chat.title, messages }
          : chat,
      ),
    );
  }

  async function handleActiveChatIdChange(id) {
    const chat = chats.find((item) => item.id === id);

    if (chat) {
      setAssistantValue(formatAssistantValue(chat.provider, chat.model));
    }

    try {
      const messages = await fetchConversationMessages(id);

      setChats((prevChats) =>
        prevChats.map((chat) =>
          chat.id === id ? { ...chat, messages } : chat,
        ),
      );
      setActiveChatId(id);
      setHasStarted(messages.length > 0);
    } catch (error) {
      console.error(error);
    }
  }

  useEffect(() => {
    if (!authToken || !authUser || hasLoadedConversations) return;

    let isCancelled = false;

    async function loadConversations() {
      try {
        const response = await fetchWithAuth("/api/conversations");

        if (!response.ok) {
          throw new Error("Unable to load conversations");
        }

        const data = await response.json();
        let restoredChats = (data.conversations ?? []).map(mapConversationToChat);

        if (isCancelled) return;

        if (restoredChats.length === 0) {
          restoredChats = [await createConversation()];
        }

        const selectedChat = restoredChats[restoredChats.length - 1];
        const messages = await fetchConversationMessages(selectedChat.id);
        const chatsWithMessages = restoredChats.map((chat) =>
          chat.id === selectedChat.id ? { ...chat, messages } : chat,
        );

        setChats(chatsWithMessages);
        setActiveChatId(selectedChat.id);
        setAssistantValue(formatAssistantValue(selectedChat.provider, selectedChat.model));
        setHasLoadedConversations(true);
        setHasStarted(messages.length > 0);
      } catch (error) {
        console.error(error);

        if (!isCancelled) {
          setHasLoadedConversations(true);
        }
      }
    }

    loadConversations();

    return () => {
      isCancelled = true;
    };
  }, [
    authToken,
    authUser,
    hasLoadedConversations,
    fetchWithAuth,
    createConversation,
    fetchConversationMessages,
  ]);

  function handleStart() {
    setHasStarted(true);
  }

  if (!authToken || !authUser) {
    return (
      <Auth initialMessage={authMessage} onAuthSuccess={handleAuthSuccess} />
    );
  }

  return (
    <div className={styles.App}>
      <header className={styles.Header}>
        <img className={styles.Logo} src="/chatbot.png" />
        <div>
          <h2 className={styles.Title}>Converse-AI</h2>
          <div className={styles.User}>{authUser.email}</div>
        </div>
        <button className={styles.LogoutButton} onClick={() => handleLogout()}>
          Logout
        </button>
      </header>

      <div className={styles.Content}>
        <Sidebar
          chats={chats}
          activeChatId={activeChatId}
          activeChatMessages={activeChatMessages}
          onActiveChatIdChange={handleActiveChatIdChange}
          onNewChatCreate={handleNewChatCreate}
        />

        <main className={styles.Main}>
          {!hasStarted && <WelcomeOverlay onStart={handleStart} />}

          {chats.map((chat) => (
            <Chat
              key={chat.id}
              assistant={assistant}
              onAuthError={handleAuthExpired}
              isActive={chat.id === activeChatId}
              chatId={chat.id}
              chatMessages={chat.messages}
              onChatMessagesUpdate={handleChatMessagesUpdate}
            />
          ))}
          <div className={styles.Configuration}>
            <Assistant
              authToken={authToken}
              value={assistantValue}
              onAuthError={handleAuthExpired}
              onAssistantChange={handleAssistantChange}
              onValueChange={handleAssistantValueChange}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

function mapConversationToChat(conversation) {
  return {
    id: conversation._id,
    title: conversation.title,
    provider: conversation.provider,
    model: conversation.model,
    messages: [],
  };
}

function mapExchangesToMessages(exchanges) {
  return exchanges.flatMap((exchange) => [
    {
      role: "user",
      content: exchange.userMessage,
      provider: exchange.provider,
      model: exchange.model,
      createdAt: exchange.createdAt,
    },
    {
      role: "assistant",
      content: exchange.assistantMessage,
      provider: exchange.provider,
      model: exchange.model,
      createdAt: exchange.createdAt,
    },
  ]);
}

function parseAssistantValue(value) {
  const [providerKey, model] = value.split(":");
  const provider = providerKey === "deepseekai" ? "deepseek" : providerKey;

  return {
    provider,
    model,
  };
}

function formatAssistantValue(provider, model) {
  const providerKey = provider === "deepseek" ? "deepseekai" : provider;

  return `${providerKey}:${model}`;
}

export default App;
