import { useCallback, useEffect, useMemo, useState } from "react";
import { v4 as uuidv4 } from "uuid";
import { Sidebar } from "./components/Sidebar/Sidebar";
import { Chat } from "./components/Chat/Chat";
import { Assistant } from "./components/Assistant/Assistant";
import { Auth } from "./components/Auth/Auth";
import styles from "./App.module.css";
import { WelcomeOverlay } from "./components/Welcome/WelcomeOverlay";

const API_BASE_URL = "http://localhost:3001";

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
  const [chats, setChats] = useState([]);
  const [activeChatId, setActiveChatId] = useState();
  const [hasStarted, setHasStarted] = useState(false);
  const [hasLoadedHistory, setHasLoadedHistory] = useState(false);

  const activeChatMessages = useMemo(
    () => chats.find(({ id }) => id === activeChatId)?.messages ?? [],
    [chats, activeChatId],
  );

  const handleNewChatCreate = useCallback(() => {
    const id = uuidv4();

    setActiveChatId(id);
    setChats((prevChats) => [...prevChats, { id, messages: [] }]);
  }, []);

  const handleAssistantChange = useCallback((newAssistant) => {
    setAssistant(newAssistant);
  }, []);

  const handleAuthSuccess = useCallback((token, user) => {
    setAuthToken(token);
    setAuthUser(user);
    setAuthMessage("");
    setHasLoadedHistory(false);
    localStorage.setItem("authToken", token);
    localStorage.setItem("authUser", JSON.stringify(user));
  }, []);

  const handleLogout = useCallback((nextAuthMessage = "") => {
    setAuthToken(null);
    setAuthUser(null);
    setAssistant(undefined);
    setChats([]);
    setActiveChatId(undefined);
    setHasStarted(false);
    setHasLoadedHistory(false);
    setAuthMessage(typeof nextAuthMessage === "string" ? nextAuthMessage : "");
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
  }, []);

  function handleChatMessagesUpdate(id, messages) {
    const title = messages[0]?.content.split(" ").slice(0, 7).join(" ");

    setChats((prevChats) =>
      prevChats.map((chat) =>
        chat.id === id
          ? { ...chat, title: chat.title ?? title, messages }
          : chat,
      ),
    );
  }

  function handleActiveChatIdChange(id) {
    setActiveChatId(id);
    setChats((prevChats) =>
      prevChats.filter(({ messages }) => messages.length > 0),
    );
  }

  const handleAuthExpired = useCallback(() => {
    handleLogout("Your session has expired. Please log in again.");
  }, [handleLogout]);

  useEffect(() => {
    if (!authToken || !authUser || hasLoadedHistory) return;

    let isCancelled = false;

    async function loadChatHistory() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/chat/history`, {
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
        });

        if (response.status === 401) {
          handleAuthExpired();
          return;
        }

        if (!response.ok) {
          throw new Error("Unable to load chat history");
        }

        const data = await response.json();

        if (isCancelled) return;

        const restoredChat = createChatFromExchanges(data.exchanges ?? []);

        if (restoredChat) {
          setActiveChatId(restoredChat.id);
          setChats([restoredChat]);
          setHasStarted(true);
        } else {
          handleNewChatCreate();
        }
      } catch (error) {
        console.error(error);

        if (!isCancelled) {
          handleNewChatCreate();
        }
      } finally {
        if (!isCancelled) {
          setHasLoadedHistory(true);
        }
      }
    }

    loadChatHistory();

    return () => {
      isCancelled = true;
    };
  }, [
    authToken,
    authUser,
    hasLoadedHistory,
    handleAuthExpired,
    handleNewChatCreate,
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
              onAuthError={handleAuthExpired}
              onAssistantChange={handleAssistantChange}
            />
          </div>
        </main>
      </div>
    </div>
  );
}

function createChatFromExchanges(exchanges) {
  if (!Array.isArray(exchanges) || exchanges.length === 0) {
    return null;
  }

  const messages = exchanges.flatMap((exchange) => [
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
  const title = messages[0]?.content.split(" ").slice(0, 7).join(" ");

  return {
    id: uuidv4(),
    title,
    messages,
  };
}

export default App;
