import { useEffect, useState } from "react";
import { Assistant as GoogleAIAssistant } from "../../assistants/googleai";
import { Assistant as OpenAIAssistant } from "../../assistants/openai";
import { Assistant as DeepSeekAIAssistant } from "../../assistants/deepseekai";

import styles from "./Assistant.module.css";

const assistantMap = {
  googleai: GoogleAIAssistant,
  openai: OpenAIAssistant,
  deepseekai: DeepSeekAIAssistant,
};

export function Assistant({ onAssistantChange }) {
  const [value, setValue] = useState("googleai:gemini-2.5-flash");

  function handleValueChange(event) {
    setValue(event.target.value);
  }

  useEffect(() => {
    const [assistant, model] = value.split(":");
    const AssistantClass = assistantMap[assistant];

    if (!AssistantClass) {
     throw new Error(`Unknown assistant: ${assistant} or model: ${model}`);
    }

     onAssistantChange(new AssistantClass(model));
  }, [value]);

  return (
    <div className={styles.Assistant}>
      <label htmlFor="assistant-select" className={styles.Label}>
        Assistant
      </label>

      <select
        id="assistant-select"
        className={styles.Select}
        value={value}
        onChange={handleValueChange}
      >
        <optgroup label="Google AI">
          <option value="googleai:gemini-2.5-flash">Gemini 2.5 Flash</option>
          <option value="googleai:gemini-2.5-flash-lite">
            Gemini 2.5 Flash-Lite
          </option>
        </optgroup>

        <optgroup label="Open AI">
          <option value="openai:gpt-4o-mini">GPT-4o mini</option>
          <option value="openai:gpt-4.1-nano">GPT-4.1 nano</option>
        </optgroup>

        <optgroup label="DeepSeek AI">
          <option value="deepseekai:deepseek-chat">DeepSeek-V3</option>
        </optgroup>
      </select>
    </div>
  );
}