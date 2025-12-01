import React, { useState, useEffect, useRef } from "react";
import { gql, useSubscription } from "@apollo/client";
import CodeBlock from "./codeBlock";
import "./room.css";
import "./navbar.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { Link } from "react-router-dom";
import checkAuth from "./navbar";
import { useTheme } from './ThemeContext';
import UserInput from "./userInput";
import { useParams } from "react-router-dom";

const MESSAGE_SUB = function (room_id, user_id) {
  return gql`
    subscription Chat {
      messages(roomId: "${room_id}", userId: "${user_id}") {
          id
          content
          sender
      }
    }
`;
};

const ROOM_NOTIFICATION_SUB = function (room_id) {
  return gql`
  subscription RoomNotification {
    roomNotif(roomId: "${room_id}") {
      message
    }
  }
`;
};

const Room = function () {
  checkAuth();
  let { room_id } = useParams();
  const [messages, setMessages] = useState([]);
  const [room, setRoom] = useState();
  const [shareRoomUsername, setShareRoomUsername] = useState("");
  const [sendMessageText, setSendMessageText] = useState("");
  const [showSharePopup, setShowSharePopup] = useState(false);
  const [showUsersPopup, setShowUsersPopup] = useState(false);
  let userId = localStorage.getItem("userId");
  const [profiles, setProfiles] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const messagesEndRef = useRef(null);
  const { isDarkMode, toggleTheme } = useTheme();
  const [friends, setFriends] = useState([]);

  useEffect(() => {
    fetchFriends();
  }, []);

  const fetchFriends = () => {
    fetch(`${process.env.REACT_APP_ENDPOINT}/friends/${userId}`)
      .then(res => res.json())
      .then(data => setFriends(data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const shareRoom = () => {
    fetch(process.env.REACT_APP_ENDPOINT + "/share-room", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username: shareRoomUsername, roomId: room_id }),
    }).then((response) => {
      if (!response.ok) {
        throw new Error("Network response was not ok");
      }
      toggleSharePopup();
      return response.json();
    });
  };

  useEffect(() => {
    const fetchRoom = () => {
      fetch(process.env.REACT_APP_ENDPOINT + "/room/" + room_id)
        .then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }
          return response.json();
        })
        .then((data) => {
          setRoom(data);
          setMessages([...data.messages]);
        })
        .catch((error) => {
          console.error("There was a problem with the fetch operation:", error);
        });
    };
    fetchRoom();
  }, [room_id]);

  const { loading_ws, error_ws, data_ws } = useSubscription(MESSAGE_SUB(room_id, userId), {
    onSubscriptionData: (data_ws) => {
      if (data_ws?.subscriptionData?.data?.messages) {
        setMessages([...messages, data_ws?.subscriptionData?.data?.messages]);
      }
    },
  });

  const { rn_data_ws } = useSubscription(ROOM_NOTIFICATION_SUB(room_id), {
    onSubscriptionData: (data_ws) => {
      let message = rn_data_ws?.subscriptionData?.data?.message;
      if (message) {
        setMessages([...messages, message]);
      }
    },
  });

  useEffect(() => {
    if (data_ws?.subscriptionData?.data?.messages) {
      setMessages([data_ws.subscriptionData.data.messages]);
    }
  }, [data_ws]);

  if (loading_ws) return <div className="loading-state">Connecting to chat...</div>;
  if (error_ws) return <div className="error-state">Error: {error_ws.message}</div>;

  const sendMessage = () => {
    if (sendMessageText === "") {
      return;
    }
    fetch(process.env.REACT_APP_ENDPOINT + "/send-message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        senderId: userId,
        roomId: room_id,
        content: sendMessageText,
      }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => {
        if ("error" in data) {
          alert(data.error);
        } else {
          setMessages([...messages, data]);
          setSendMessageText("");
        }
      })
      .catch((error) => {
        console.error("There was a problem with the fetch operation:", error);
      });
  };

  const handleKeyPress = (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      sendMessage();
    }
  };

  const toggleSharePopup = () => {
    setShowSharePopup(!showSharePopup);
  };

  const toggleUsersPopup = () => {
    setShowUsersPopup(!showUsersPopup);
  };

  const renderMessageContent = (content) => {
    // Split by code blocks first
    const segments = content.split(/(```[\s\S]*?```)/);

    return (
      <>
        {segments.map((segment, index) => {
          if (segment.startsWith("```")) {
            // Handle code blocks
            const match = segment.match(/^```(\w+)?\n?([\s\S]*?)\n?```$/);
            if (match) {
              const language = match[1] || 'javascript';
              const code = match[2].trim();
              return <CodeBlock key={index} language={language} code={code} />;
            }
          } else if (segment.trim().length > 0) {
            // Parse markdown: bold, italic, inline code, lists, mentions
            return parseMarkdown(segment, index);
          }
          return null;
        })}
      </>
    );
  };

  const parseMarkdown = (text, index) => {
    const lines = text.split('\n');
    const elements = [];
    let i = 0;

    while (i < lines.length) {
      const line = lines[i];
      const trimmed = line.trim();

      // Skip empty lines
      if (!trimmed) {
        i++;
        continue;
      }

      // Check for tables (markdown table starts with |)
      if (trimmed.startsWith('|')) {
        const tableLines = [];
        while (i < lines.length && lines[i].trim().startsWith('|')) {
          tableLines.push(lines[i].trim());
          i++;
        }
        if (tableLines.length >= 2) {
          // Verify it's a valid table (has separator row)
          const isSeparatorRow = tableLines[1].split('|').slice(1, -1).every(cell => /^[\s\-:]*$/.test(cell));
          if (isSeparatorRow) {
            elements.push(renderTable(tableLines, `table-${index}-${i}`));
            continue;
          }
        }
        // If not a valid table, treat as regular text
        i = i - tableLines.length;
      }

      // List items
      if (trimmed.match(/^[-*+]\s+/)) {
        const listItems = [];
        while (i < lines.length && lines[i].trim().match(/^[-*+]\s+/)) {
          const content = lines[i].trim().replace(/^[-*+]\s+/, '');
          listItems.push(
            <li key={i}>{parseInlineMarkdown(content)}</li>
          );
          i++;
        }
        elements.push(<ul key={`list-${index}-${i}`}>{listItems}</ul>);
        continue;
      }

      // Headers
      if (trimmed.match(/^#+\s+/)) {
        const level = trimmed.match(/^#+/)[0].length;
        const headerText = trimmed.replace(/^#+\s+/, '');
        const HeadingTag = `h${Math.min(level + 2, 6)}`;
        elements.push(
          React.createElement(HeadingTag, { key: `heading-${index}-${i}`, className: 'markdown-heading' }, parseInlineMarkdown(headerText))
        );
        i++;
        continue;
      }

      // Regular paragraph
      elements.push(
        <p key={`para-${index}-${i}`}>{parseInlineMarkdown(trimmed)}</p>
      );
      i++;
    }

    return <div key={`markdown-${index}`}>{elements}</div>;
  };

  const renderTable = (tableLines, key) => {
    const rows = tableLines.map(line =>
      line.split('|').slice(1, -1).map(cell => cell.trim())
    );

    if (rows.length < 2) return null;

    const headers = rows[0];
    const bodyRows = rows.slice(2); // Skip separator row

    return (
      <table key={key} className="markdown-table">
        <thead>
          <tr>
            {headers.map((header, i) => (
              <th key={i}>{parseInlineMarkdown(header)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bodyRows.map((row, rowIdx) => (
            <tr key={rowIdx}>
              {row.map((cell, cellIdx) => (
                <td key={cellIdx}>{parseInlineMarkdown(cell)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const parseInlineMarkdown = (text) => {
    const parts = [];
    let lastIndex = 0;

    // Pattern to match: **bold**, *italic*, _italic_, `code`, @mention
    const pattern = /\*\*(.+?)\*\*|\*(.+?)\*|_(.+?)_|`(.+?)`|(@\w+)/g;
    let match;

    while ((match = pattern.exec(text)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }

      // Add matched element
      if (match[1]) {
        // Bold
        parts.push(<strong key={`bold-${match.index}`}>{match[1]}</strong>);
      } else if (match[2]) {
        // Italic (*)
        parts.push(<em key={`italic-${match.index}`}>{match[2]}</em>);
      } else if (match[3]) {
        // Italic (_)
        parts.push(<em key={`italic2-${match.index}`}>{match[3]}</em>);
      } else if (match[4]) {
        // Inline code
        parts.push(<code key={`code-${match.index}`} className="inline-code">{match[4]}</code>);
      } else if (match[5]) {
        // @mention
        parts.push(<span key={`mention-${match.index}`} className="chatgpt-mention">{match[5]}</span>);
      }

      lastIndex = pattern.lastIndex;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  const fetchProfiles = () => {
    fetch(`${process.env.REACT_APP_ENDPOINT}/profiles/${shareRoomUsername}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then((data) => {
        setProfiles(data);
        setShowDropdown(true);
      })
      .catch((error) => {
        console.error("There was a problem with the fetch operation:", error);
      });
  };

  const handleSelection = (username) => {
    setShareRoomUsername(username);
    setShowDropdown(false);
  };

  const handleInputChange = (value) => {
    setShareRoomUsername(value);
  };

  function addAI() {
    setSendMessageText(prev => prev + "@chatgpt ");
    document.getElementById("sendMsgInput")?.focus();
  }


  return (
    <div className="room-page">
      <nav className="navbar">
        <div className="navbar-brand">
          <Link id="home" to="/">
            <i className="fas fa-chevron-left"></i> Back
          </Link>
        </div>
        <div className="navbar-links">
          <button onClick={toggleTheme} className="theme-toggle" title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}>
            {isDarkMode ? '☀️' : '🌙'}
          </button>
          <div id="roomHeader">
            <h3 id="roomName">{room != null ? room.name : "Loading..."}</h3>
            <div className="button-group-inline">
              <button
                id="inviteBtn"
                type="button"
                className="icon-btn share-room-btn"
                onClick={toggleSharePopup}
                title="Invite User"
                aria-label="Invite User"
                aria-expanded={showSharePopup}
              >
                <i className="fas fa-user-plus" aria-hidden="true"></i>
                <span className="button-label">Invite</span>
              </button>
              <button
                id="viewMembersBtn"
                type="button"
                className="icon-btn share-room-btn"
                onClick={toggleUsersPopup}
                title="View Members"
                aria-label="View Members"
                aria-expanded={showUsersPopup}
              >
                <i className="fas fa-users" aria-hidden="true"></i>
                <span className="button-label">Members</span>
              </button>
            </div>
          </div>
        </div>
      </nav>



      {showSharePopup && (
        <div className="popup-background" onClick={toggleSharePopup}>
          <div className="popup" onClick={e => e.stopPropagation()}>
            <h3>Invite User</h3>
            <UserInput
              value={shareRoomUsername}
              onChange={handleInputChange}
              friends={friends}
              profiles={profiles}
              showDropdown={showDropdown}
              onSelect={handleSelection}
              setShareRoomUsername={setShareRoomUsername}
            />
            <div className="button-group">
              <button onClick={toggleSharePopup} className="close-button">
                Cancel
              </button>
              <button onClick={shareRoom} className="submit-button" disabled={shareRoomUsername.trim() === ""} aria-disabled={shareRoomUsername.trim() === ""}>
                Invite
              </button>
            </div>
          </div>
        </div>
      )}

      {showUsersPopup && (
        <div className="popup-background" onClick={toggleUsersPopup}>
          <div className="popup" onClick={e => e.stopPropagation()}>
            <h3>Room Members</h3>
            <div className="users">
              {room && Object.keys(room.users).map((key) => (
                <div key={room.users[key].id}>
                  <p>
                    {room.users[key].first_name} {room.users[key].last_name}
                    <br />
                    <small>@{room.users[key].username}</small>
                  </p>
                  <b>{room.creator.id === key ? "Admin" : "Member"}</b>
                </div>
              ))}
            </div>
            <button onClick={toggleUsersPopup} className="close-button full-width">
              Close
            </button>
          </div>
        </div>
      )}

      <div className="room-container">
        <div className="chat-container">
          <div className="messages">
            {messages.map((message) => {
              const isChatGPT = message.sender.toLowerCase().includes('chatgpt');
              return (
                <div
                  key={message.id}
                  className={`message ${isChatGPT ? 'chatgpt-message' : ''}`}
                  id={message.sender === userId ? "sent" : "recieved"}
                >
                  {renderMessageContent(message.content)}
                  <span>{message.sender}</span>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          <div className="fade-overlay"></div>

          <div className="input-container">
            <div className="input-wrapper">
              <i onClick={addAI} id="ai-btn" title="Ask AI">✨</i>
              <input
                type="text"
                id="sendMsgInput"
                placeholder="Type a message..."
                value={sendMessageText}
                onChange={(e) => setSendMessageText(e.target.value)}
                onKeyPress={handleKeyPress}
                autoComplete="off"
              />
              <i onClick={sendMessage} id="send-btn" className="fas fa-paper-plane" title="Send"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Room;
