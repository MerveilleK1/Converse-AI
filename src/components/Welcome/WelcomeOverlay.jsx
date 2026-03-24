import styles from "./WelcomeOverlay.module.css";

export function WelcomeOverlay({ onStart }) {
  return (
    <div className={styles.Overlay}>
      <div className={styles.Card}>
        <img className={styles.Logo} src="/chatbot.png" alt="Converse-AI logo" />
        <h1 className={styles.Title}>Welcome to Converse-AI </h1>
        <p className={styles.Text}>
           Click the button below, choose an assistant and begin your conversation.
        </p>
        <button className={styles.Button} onClick={onStart}>
          Start
        </button>
      </div>
    </div>
  );
}