import React, { useState } from "react";
import { CopyToClipboard } from "react-copy-to-clipboard";
import { FiCopy } from "react-icons/fi"; // Assuming FiCopy is imported from react-icons

const CodeBlock = ({ language, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 3500);
  };

  return (
    <div className="code-block-container">
      <br></br>
      <div className="code-block-header">
        <div className="language-display">{language}</div>
        <CopyToClipboard text={code} onCopy={handleCopy}>
          <div className="copy-button">
            <FiCopy /> {/* Use FiCopy icon */}
          </div>
        </CopyToClipboard>
      </div>
      {copied && <div className="copied-label">Copied!</div>}
      <div className={`code-block language-${language}`}>
        <pre className="line-numbers">
          <code className={`language-${language}`}>{code}</code>
        </pre>
      </div>
      
    </div>
  );
};

export default CodeBlock;