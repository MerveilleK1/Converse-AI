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

export function Assistant({
  authToken,
  value,
  onAuthError,
  onAssistantChange,
  onValueChange,
}) {
  const [localValue, setLocalValue] = useState(value ?? "openai:gpt-4o-mini");
  const selectedValue = value ?? localValue;

  function handleValueChange(event) {
    setLocalValue(event.target.value);
    onValueChange?.(event.target.value);
  }

  useEffect(() => {
    const [assistant, model] = selectedValue.split(":");
    const AssistantClass = assistantMap[assistant];

    if (!AssistantClass) {
     throw new Error(`Unknown assistant: ${assistant} or model: ${model}`);
    }

     onAssistantChange(new AssistantClass(model, authToken, onAuthError));
  }, [selectedValue, authToken, onAuthError, onAssistantChange]);

  return (
    <div className={styles.Assistant}>
      <label htmlFor="assistant-select" className={styles.Label}>
        Assistant
      </label>

      <select
        id="assistant-select"
        className={styles.Select}
        value={selectedValue}
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
