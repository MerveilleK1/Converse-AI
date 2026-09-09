import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { Chat } from "./components/Chat/Chat";
import { Assistant } from "./components/Assistant/Assistant";
import { Auth } from "./components/Auth/Auth";
import styles from "./App.module.css";
import { WelcomeOverlay } from "./components/Welcome/WelcomeOverlay";

const API_BASE_URL = "http://localhost:3001";
const DEFAULT_ASSISTANT_VALUE = "openai:gpt-4o-mini";
const ACTIVE_CONVERSATION_STORAGE_KEY = "activeConversationId";

function App() {
  const activeConversationRequestRef = useRef(0);
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
    localStorage.removeItem(ACTIVE_CONVERSATION_STORAGE_KEY);
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
      activeConversationRequestRef.current += 1;

      setActiveChatId(chat.id);
      setChats((prevChats) => [...prevChats, chat]);
      setAssistantValue(formatAssistantValue(chat.provider, chat.model));
      setHasStarted(false);
      localStorage.setItem(ACTIVE_CONVERSATION_STORAGE_KEY, chat.id);
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

  const handleChatMessagesUpdate = useCallback((id, messages) => {
    const title =
      typeof messages[0]?.content === "string"
        ? messages[0].content.trim().split(" ").slice(0, 7).join(" ")
        : "New chat";

    setChats((prevChats) =>
      prevChats.map((chat) => {
        if (chat.id !== id) return chat;

        const nextTitle = chat.title === "New chat" ? title : chat.title;

        if (
          chat.title === nextTitle &&
          areMessagesEqual(chat.messages, messages)
        ) {
          return chat;
        }

        return { ...chat, title: nextTitle, messages };
      }),
    );
  }, []);

  const handleActiveChatIdChange = useCallback(async (id) => {
    const requestId = activeConversationRequestRef.current + 1;
    activeConversationRequestRef.current = requestId;
    const chat = chats.find((item) => item.id === id);

    if (chat) {
      setAssistantValue(formatAssistantValue(chat.provider, chat.model));
      setHasStarted((chat.messages ?? []).length > 0);
    }

    setActiveChatId(id);
    localStorage.setItem(ACTIVE_CONVERSATION_STORAGE_KEY, id);

    try {
      const messages = await fetchConversationMessages(id);

      if (requestId !== activeConversationRequestRef.current) return;

      setChats((prevChats) =>
        prevChats.map((chat) =>
          chat.id === id ? { ...chat, messages } : chat,
        ),
      );
      setHasStarted(messages.length > 0);
    } catch (error) {
      console.error(error);
    }
  }, [chats, fetchConversationMessages]);

  useEffect(() => {
    if (!authToken || !authUser || hasLoadedConversations) return;

    let isCancelled = false;
    const requestId = activeConversationRequestRef.current + 1;
    activeConversationRequestRef.current = requestId;

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

        if (isCancelled || requestId !== activeConversationRequestRef.current) {
          return;
        }

        const storedActiveConversationId = localStorage.getItem(
          ACTIVE_CONVERSATION_STORAGE_KEY,
        );
        const selectedChat =
          restoredChats.find((chat) => chat.id === storedActiveConversationId) ??
          restoredChats[restoredChats.length - 1];
        const messages = await fetchConversationMessages(selectedChat.id);

        if (isCancelled || requestId !== activeConversationRequestRef.current) {
          return;
        }

        const chatsWithMessages = restoredChats.map((chat) =>
          chat.id === selectedChat.id ? { ...chat, messages } : chat,
        );

        setChats(chatsWithMessages);
        setActiveChatId(selectedChat.id);
        setAssistantValue(formatAssistantValue(selectedChat.provider, selectedChat.model));
        setHasLoadedConversations(true);
        setHasStarted(messages.length > 0);
        localStorage.setItem(ACTIVE_CONVERSATION_STORAGE_KEY, selectedChat.id);
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
    title:
      typeof conversation.title === "string" && conversation.title.trim().length > 0
        ? conversation.title.trim()
        : "New chat",
    provider: conversation.provider ?? "openai",
    model: conversation.model ?? "gpt-4o-mini",
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

export default App;
