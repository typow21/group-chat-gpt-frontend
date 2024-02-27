import React, { useState } from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";

const CodeBlock = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="code-block-container">
      <CopyToClipboard text={code} onCopy={handleCopy}>
        <button className="copy-button">{copied ? "Copied!" : "Copy"}</button>
      </CopyToClipboard>
      <div className="code-block">
        <pre>
          <code className={`language-${language}`}>{code}</code>
        </pre>
      </div>
    </div>
  );
};

export default CodeBlock;
