import { useState } from "react";
import styles from "./Auth.module.css";

const API_BASE_URL = "http://localhost:3001";

export function Auth({ initialMessage = "", onAuthSuccess }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState("login");
  const [error, setError] = useState("");
  const [message, setMessage] = useState(initialMessage);
  const [isLoading, setIsLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError("");
    setMessage("");

    if (!email.trim() || !password) {
      setError("Please enter an email and password.");
      return;
    }

    if (mode === "register" && password.length < 5) {
      setError("Password must be at least 5 characters.");
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/auth/${mode}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(getFriendlyError(response.status, data?.error));
        return;
      }

      if (mode === "register") {
        setMode("login");
        setPassword("");
        setMessage("Account created. You can now log in.");
        return;
      }

      onAuthSuccess(data.token, data.user);
    } catch (_error) {
      setError("Backend unavailable. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleModeChange(nextMode) {
    setMode(nextMode);
    setError("");
    setMessage("");
  }

  return (
    <main className={styles.Auth}>
      <form className={styles.Card} onSubmit={handleSubmit}>
        <img className={styles.Logo} src="/chatbot.png" alt="" />
        <h1 className={styles.Title}>Converse-AI</h1>

        <div className={styles.ModeSwitch}>
          <button
            className={styles.ModeButton}
            data-active={mode === "login"}
            type="button"
            onClick={() => handleModeChange("login")}
          >
            Login
          </button>
          <button
            className={styles.ModeButton}
            data-active={mode === "register"}
            type="button"
            onClick={() => handleModeChange("register")}
          >
            Register
          </button>
        </div>

        <div className={styles.Fields}>
          <label className={styles.Field}>
            <span>Email</span>
            <input
              className={styles.Input}
              type="email"
              value={email}
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>

          <label className={styles.Field}>
            <span>Password</span>
            <input
              className={styles.Input}
              type="password"
              value={password}
              minLength={mode === "register" ? 5 : undefined}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              onChange={(event) => setPassword(event.target.value)}
            />
          </label>
        </div>

        {error && <p className={styles.Error}>{error}</p>}
        {message && <p className={styles.Message}>{message}</p>}

        <div className={styles.Actions}>
          <button
            className={styles.PrimaryButton}
            type="submit"
            disabled={isLoading}
          >
            {isLoading
              ? "Please wait..."
              : mode === "login"
                ? "Login"
                : "Create account"}
          </button>
        </div>
      </form>
    </main>
  );
}

function getFriendlyError(status, backendError) {
  if (status === 401) return "Invalid email or password.";
  if (status === 409) return "This email is already registered.";
  if (status === 400) {
    return backendError ?? "Please check your email and password.";
  }

  return backendError ?? "Something went wrong. Please try again.";
}
