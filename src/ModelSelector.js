import React, { useState, useEffect } from "react";

const PRESET_MODELS = [
  { value: "gpt-4o", label: "gpt-4o" },
  { value: "gpt-4", label: "gpt-4" },
  { value: "gpt-4o-mini", label: "gpt-4o-mini" },
  { value: "gpt-3.5", label: "gpt-3.5" },
];

const DEFAULT_CONFIG = {
  model: "gpt-4o-mini",
  customModel: "",
  temperature: 0.7,
  maxTokens: 512,
  roomId: "",
  botName: "",
  customInstructions: "",
};

// Mock cost-per-1k-tokens values (informational only)
const COST_PER_1K = {
  "gpt-4o": 0.06,
  "gpt-4": 0.12,
  "gpt-4o-mini": 0.02,
  "gpt-3.5": 0.002,
};

function estimateCostPerInference(model, maxTokens) {
  const m = model in COST_PER_1K ? model : "gpt-4o-mini";
  const costPer1k = COST_PER_1K[m] || 0.02;
  return ((costPer1k / 1000) * maxTokens).toFixed(6);
}

export default function ModelSelector() {
  const [config, setConfig] = useState(DEFAULT_CONFIG);
  const [useCustom, setUseCustom] = useState(false);
  const [message, setMessage] = useState(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem("bot_editor_config");
      if (saved) setConfig(JSON.parse(saved));
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    setUseCustom(Boolean(config.customModel && config.customModel.length > 0));
  }, [config.customModel]);

  function update(changes) {
    setConfig((c) => ({ ...c, ...changes }));
  }

  function validate() {
    const t = Number(config.temperature);
    const tokens = Number(config.maxTokens);
    if (isNaN(t) || t < 0 || t > 2) return "Temperature must be between 0 and 2.";
    if (!Number.isInteger(tokens) || tokens <= 0 || tokens > 65536) return "Max tokens must be an integer between 1 and 65536.";
    if (useCustom && (!config.customModel || config.customModel.trim().length < 1)) return "Custom model string cannot be empty.";
    return null;
  }

  function save() {
    const err = validate();
    if (err) {
      setMessage({ type: "error", text: err });
      return;
    }
    const payload = { ...config };
    // If user provided a roomId and botName, attempt to persist to backend
    if (config.roomId && config.botName) {
      fetch(`${process.env.REACT_APP_API_BASE || ""}/api/update-bot`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roomId: config.roomId,
          botName: config.botName,
          model: useCustom ? config.customModel : config.model,
          temperature: config.temperature,
          max_tokens: config.maxTokens,
          customInstructions: config.customInstructions || null,
        }),
      })
        .then(async (res) => {
          const body = await res.json();
          if (!res.ok) throw new Error(body.detail || body.error || JSON.stringify(body));
          setMessage({ type: "success", text: "Saved bot configuration to server." });
        })
        .catch((err) => setMessage({ type: "error", text: "Server save failed: " + err.message }));
      // still persist locally as a fallback
      localStorage.setItem("bot_editor_config", JSON.stringify(payload));
      return;
    }

    // persist locally if not targeting a backend bot
    localStorage.setItem("bot_editor_config", JSON.stringify(payload));
    setMessage({ type: "success", text: "Saved bot configuration locally." });
  }

  const selectedModel = useCustom && config.customModel ? config.customModel : config.model;
  const estimatedCost = estimateCostPerInference(selectedModel, Number(config.maxTokens));

  return (
    <div className="model-selector">
      <label>Room ID</label>
      <input
        type="text"
        placeholder="room id to update (optional)"
        value={config.roomId}
        onChange={(e) => update({ roomId: e.target.value })}
      />

      <label>Bot Name</label>
      <input
        type="text"
        placeholder="bot name to update (optional)"
        value={config.botName}
        onChange={(e) => update({ botName: e.target.value })}
      />

      <label>Custom Instructions</label>
      <input
        type="text"
        placeholder="(optional) custom instructions for the bot"
        value={config.customInstructions}
        onChange={(e) => update({ customInstructions: e.target.value })}
      />
      <label>Model</label>
      <div className="row">
        <select
          value={config.model}
          onChange={(e) => update({ model: e.target.value })}
          disabled={useCustom}
        >
          {PRESET_MODELS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </select>
        <label className="custom-toggle">
          <input
            type="checkbox"
            checked={useCustom}
            onChange={(e) => {
              const checked = e.target.checked;
              setUseCustom(checked);
              if (!checked) update({ customModel: "" });
            }}
          />
          Use custom model
        </label>
      </div>

      {useCustom && (
        <div className="row">
          <input
            type="text"
            placeholder="custom-model-name-or-endpoint"
            value={config.customModel}
            onChange={(e) => update({ customModel: e.target.value })}
          />
        </div>
      )}

      <label>Temperature</label>
      <input
        type="number"
        step="0.1"
        min="0"
        max="2"
        value={config.temperature}
        onChange={(e) => update({ temperature: Number(e.target.value) })}
      />

      <label>Max Tokens</label>
      <input
        type="number"
        step="1"
        min="1"
        max="65536"
        value={config.maxTokens}
        onChange={(e) => update({ maxTokens: Number(e.target.value) })}
      />

      <div className="info-row">
        <div>Selected: <code>{selectedModel}</code></div>
        <div>Estimated cost (mock): ${estimatedCost} per inference</div>
      </div>

      <div className="actions">
        <button onClick={save}>Save</button>
        <button
          onClick={() => {
            setConfig(DEFAULT_CONFIG);
            setMessage(null);
            localStorage.removeItem("bot_editor_config");
          }}
        >
          Reset
        </button>
      </div>

      {message && (
        <div className={`message ${message.type}`}>{message.text}</div>
      )}
    </div>
  );
}
