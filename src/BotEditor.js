import React from "react";
import ModelSelector from "./ModelSelector";
import "./modelSelector.css";

export default function BotEditor() {
  return (
    <div className="bot-editor-root">
      <h2>Bot Editor</h2>
      <p className="muted">Configure the bot and select the model it will use.</p>
      <ModelSelector />
    </div>
  );
}
