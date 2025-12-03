import React, { useState, useEffect, useRef } from "react";
import { gql, useSubscription } from "@apollo/client";
// ...existing code...
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import "./room.css";
import "./navbar.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { checkAuth } from "./navbar";
import UserInput from "./userInput";
import { useParams } from "react-router-dom";
import { authFetch } from "./api";

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
  // Sticky Ask AI state placed with other state hooks to satisfy rules-of-hooks
  const [aiSticky, setAiSticky] = useState(false);
  // Mention autocomplete state
  const [showMentionPopup, setShowMentionPopup] = useState(false);
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);
  const [mentionDebounceId, setMentionDebounceId] = useState(null);
  let userId = localStorage.getItem("userId");
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);


  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const shareRoom = () => {
    authFetch(process.env.REACT_APP_ENDPOINT + "/share-room", {
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
      authFetch(process.env.REACT_APP_ENDPOINT + "/room/" + room_id)
        .then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }
          return response.json();
        })
        .then((data) => {
          setRoom(data);
          setMessages([...data.messages]);
          // Enable sticky Ask AI for two-party rooms with a bot
          // No automatic mentions; star button adds @chatgpt on demand
        })
        .catch((error) => {
          console.error("There was a problem with the fetch operation:", error);
        });
    };
    fetchRoom();
  }, [room_id]);

  const { loading_ws, error_ws } = useSubscription(MESSAGE_SUB(room_id, userId), {
    onSubscriptionData: (subscriptionResult) => {
      const newMessage = subscriptionResult?.subscriptionData?.data?.messages;
      if (newMessage) {
        setMessages((prevMessages) => [...prevMessages, newMessage]);
      }
    },
  });

  useSubscription(ROOM_NOTIFICATION_SUB(room_id), {
    onSubscriptionData: (subscriptionResult) => {
      const message = subscriptionResult?.subscriptionData?.data?.roomNotif?.message;
      if (message) {
        setMessages((prevMessages) => [...prevMessages, message]);
      }
    },
  });

  if (loading_ws) return <div className="loading-state">Connecting to chat...</div>;
  if (error_ws) return <div className="error-state">Error: {error_ws.message}</div>;

  // Bot detection helpers

  // Removed bot room helper (unused)

  // Removed: isTwoPartyWithBot (no longer used)

  // Removed: ensurePrefix (no longer used)

  function addAI() {
    // Insert a single leading @chatgpt mention on demand
    setSendMessageText(prev => {
      const hasMention = /\B@chatgpt\b/i.test(prev);
      if (hasMention) {
        const stripped = prev.replace(/\s*\B@chatgpt\b\s*/ig, ' ');
        return `@chatgpt ${stripped}`.trim();
      }
      return `@chatgpt ${prev}`.trim();
    });
    setAiSticky(true);
    document.getElementById("sendMsgInput")?.focus();
  }

  const sendMessage = () => {
    if (sendMessageText === "") {
      return;
    }
    // Send exactly what the user typed; no automatic mentions
    let contentToSend = sendMessageText;
    // Parse unique @mentions from the content
    const mentionMatches = Array.from(contentToSend.matchAll(/@([A-Za-z0-9._-]+)/g));
    const mentionedUsers = Array.from(new Set(mentionMatches.map(m => m[1])));

    authFetch(process.env.REACT_APP_ENDPOINT + "/send-message", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        senderId: userId,
        roomId: room_id,
        content: contentToSend,
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
          console.error('Send message error:', data.error);
        } else {
          // Don't manually add message - WebSocket subscription will handle it
          setSendMessageText("");
          // Notify mentioned users (best-effort; ignore failures)
          const messageId = data?.message?.id || data?.id; // adapt if backend returns message
          mentionedUsers.forEach((username) => {
            const url = (process.env.REACT_APP_ENDPOINT || '').replace(/\/$/, '') + "/notify-mention";
            authFetch(url, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ roomId: room_id, mentionedUser: username, messageId }),
            })
              .then((resp) => {
                if (!resp.ok) {
                  return resp.text().then((t) => { throw new Error(t || 'Notify failed'); });
                }
                // Refresh notifications badge if component is mounted elsewhere
                window.dispatchEvent(new CustomEvent('refreshNotifications'));
              })
              .catch((err) => {
                console.warn('[notify-mention] Failed', { username, err: String(err) });
              });
          });
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

  const handleKeyDown = (event) => {
    // Arrow keys and Enter for mention navigation
    if (showMentionPopup && mentionSuggestions.length > 0) {
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setMentionSelectedIndex(prev => 
          prev < mentionSuggestions.length - 1 ? prev + 1 : 0
        );
        return;
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setMentionSelectedIndex(prev => 
          prev > 0 ? prev - 1 : mentionSuggestions.length - 1
        );
        return;
      }
      if (event.key === "Enter") {
        event.preventDefault();
        insertMention(mentionSuggestions[mentionSelectedIndex]);
        return;
      }
      if (event.key === "Tab") {
        event.preventDefault();
        insertMention(mentionSuggestions[mentionSelectedIndex]);
        return;
      }
      if (event.key === "Escape") {
        event.preventDefault();
        setShowMentionPopup(false);
        return;
      }
    }
  };

  const toggleSharePopup = () => {
    setShowSharePopup(!showSharePopup);
  };

  const toggleUsersPopup = () => {
    setShowUsersPopup(!showUsersPopup);
  };

  const renderMessageContent = (content) => {
    return (
      <div className="message-text">
        <ReactMarkdown
          remarkPlugins={[remarkGfm, remarkBreaks]}
          components={{
            table: ({ node, ...props }) => (
              <table className="markdown-table" {...props} />
            ),
            thead: ({ node, ...props }) => <thead {...props} />,
            tbody: ({ node, ...props }) => <tbody {...props} />,
            tr: ({ node, ...props }) => <tr {...props} />,
            th: ({ node, ...props }) => <th {...props} />,
            td: ({ node, ...props }) => <td {...props} />,
            // eslint-disable-next-line jsx-a11y/heading-has-content
            h1: ({ node, ...props }) => <h1 className="markdown-heading" {...props} />,
            // eslint-disable-next-line jsx-a11y/heading-has-content
            h2: ({ node, ...props }) => <h2 className="markdown-heading" {...props} />,
            // eslint-disable-next-line jsx-a11y/heading-has-content
            h3: ({ node, ...props }) => <h3 className="markdown-heading" {...props} />,
            // eslint-disable-next-line jsx-a11y/heading-has-content
            h4: ({ node, ...props }) => <h4 className="markdown-heading" {...props} />,
            // eslint-disable-next-line jsx-a11y/heading-has-content
            h5: ({ node, ...props }) => <h5 className="markdown-heading" {...props} />,
            // eslint-disable-next-line jsx-a11y/heading-has-content
            h6: ({ node, ...props }) => <h6 className="markdown-heading" {...props} />,
          }}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  };

  const handleSelection = (username) => {
    setShareRoomUsername(username);
  };

  // Override message input onChange to honor sticky
  const handleInputChange = (value) => {
    setShareRoomUsername(value);
  };

  // Mentions: detect '@' and show user suggestions from room
  const updateMentionSuggestions = (query) => {
    if (!room || !room.users) {
      setMentionSuggestions([]);
      return;
    }
    // Get current user's username to exclude from suggestions
    const currentUsername = room.users[userId]?.username?.toLowerCase();
    
    // Get room users excluding current user
    const users = Object.values(room.users)
      .map(u => u.username)
      .filter(name => name && name.toLowerCase() !== currentUsername);
    
    // Always include chatgpt as an option
    const allSuggestions = ['chatgpt', ...users];
    
    const q = query.toLowerCase();
    const filtered = allSuggestions
      .filter(name => name.toLowerCase().includes(q))
      .filter((name, idx, arr) => arr.indexOf(name) === idx) // dedupe
      .slice(0, 8);
    setMentionSuggestions(filtered);
  };

  const onMessageInputChange = (e) => {
    const val = e.target.value;
    setSendMessageText(val);
    // Caret-aware detection: use current cursor to find mention token
    const el = inputRef.current;
    const caret = el ? el.selectionStart : val.length;
    const textBeforeCaret = val.slice(0, caret);
    const textAfterCaret = val.slice(caret);
    // Only trigger suggestions if caret is within or right after an @token
    // Find the last whitespace-separated token before caret
    const tokenMatch = /(^|\s)(@[\w\-_.]*)$/.exec(textBeforeCaret);
    if (tokenMatch && (textAfterCaret === '' || /^\s|[,.!?)]/.test(textAfterCaret[0]))) {
      const token = tokenMatch[2] || '';
      const q = token.replace(/^@/, '');
      // Debounce suggestions to avoid rapid filtering while typing
      if (mentionDebounceId) {
        clearTimeout(mentionDebounceId);
      }
      const tid = setTimeout(() => {
        updateMentionSuggestions(q);
        setMentionSelectedIndex(0); // Reset selection when suggestions update
      }, 150);
      setMentionDebounceId(tid);
      setShowMentionPopup(true);
    } else {
      setShowMentionPopup(false);
      setMentionSelectedIndex(0);
    }
  };

  const insertMention = (username) => {
    // Replace the @query around the caret with @username and a space
    const el = inputRef.current;
    const caret = el ? el.selectionStart : sendMessageText.length;
    const before = sendMessageText.slice(0, caret);
    const after = sendMessageText.slice(caret);
    const replacedBefore = before.replace(/(^|\s)@([\w\-_.]*)$/,
      (m, pre) => `${pre}@${username} `);
    const newText = replacedBefore + after;
    setSendMessageText(newText);
    setShowMentionPopup(false);
    setMentionSelectedIndex(0);
    
    // Restore focus and move caret to end of inserted mention
    if (inputRef.current) {
      inputRef.current.focus();
      const newCaret = replacedBefore.length;
      inputRef.current.setSelectionRange(newCaret, newCaret);
    }
  };

  return (
    <div className="room-page">
      <div className="room-header-bar">
        <div className="room-info">
          <h3 id="roomName">{room != null ? room.name : "Loading..."}</h3>
          {room && (
            <span className="room-meta">
              {Object.keys(room.users).length} members
            </span>
          )}
        </div>
        <div className="room-actions">
          <button className="action-btn" onClick={toggleSharePopup} title="Invite User">
            <i className="fas fa-user-plus"></i>
          </button>
          <button className="action-btn" onClick={toggleUsersPopup} title="View Members">
            <i className="fas fa-users"></i>
          </button>
        </div>
      </div>

      {showSharePopup && (
        <div className="popup-background" onClick={toggleSharePopup}>
          <div className="popup" onClick={e => e.stopPropagation()}>
            <h3>Invite to Chat</h3>
            <p className="popup-description">
              Search for a friend to invite them to this conversation.
              <br />
              <small style={{ color: 'var(--text-secondary)', display: 'block', marginTop: '0.5rem' }}>
                <strong>Note:</strong> You can only invite users who are already your friends.
              </small>
            </p>
            <UserInput
              value={shareRoomUsername}
              onChange={handleInputChange}
              onSelect={handleSelection}
              placeholder="Search friends..."
            />
            <div style={{ marginTop: '0.5rem', textAlign: 'center', color: 'var(--text-secondary)' }}>
              Only friends will appear here.
              <button
                onClick={() => window.location.href = '/friends'}
                className="close-button"
                style={{ marginLeft: '0.5rem' }}
              >
                Manage friends
              </button>
            </div>
            <div className="button-group">
              <button onClick={toggleSharePopup} className="close-button">
                Cancel
              </button>
              <button onClick={shareRoom} className="submit-button">
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
              <i onClick={addAI} id="ai-btn" title="Ask AI" className={aiSticky ? 'sticky-active' : ''}>✨</i>
              <input
                type="text"
                id="sendMsgInput"
                placeholder="Type a message..."
                value={sendMessageText}
                onChange={onMessageInputChange}
                onKeyPress={handleKeyPress}
                onKeyDown={handleKeyDown}
                autoComplete="off"
                ref={inputRef}
              />
              {showMentionPopup && mentionSuggestions.length > 0 && (
                <div className="mention-popup">
                  <div className="mention-popup-header">Mention someone</div>
                  {mentionSuggestions.map((name, index) => {
                    const isAI = name.toLowerCase() === 'chatgpt';
                    const initial = isAI ? '✨' : name.charAt(0).toUpperCase();
                    const isSelected = index === mentionSelectedIndex;
                    return (
                      <div
                        key={name}
                        className={`mention-item ${isAI ? 'mention-ai' : ''} ${isSelected ? 'mention-selected' : ''}`}
                        onClick={() => insertMention(name)}
                        onMouseEnter={() => setMentionSelectedIndex(index)}
                      >
                        <span className="mention-item-avatar">{initial}</span>
                        <span className="mention-item-name">@{name}</span>
                        {isSelected && <span className="mention-item-hint">↵</span>}
                      </div>
                    );
                  })}
                </div>
              )}
              <i onClick={sendMessage} id="send-btn" className="fas fa-paper-plane" title="Send"></i>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Room;
