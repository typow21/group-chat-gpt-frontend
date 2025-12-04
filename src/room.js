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
import { useParams, useNavigate } from "react-router-dom";
import { authFetch } from "./api";
import BotManager from "./BotManager";
import { encryptMessage, decryptMessage, decryptMessages, isEncryptionSupported, shareRoomKeyWithServer } from "./crypto";

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

const TYPING_SUB = function (room_id, user_id) {
  return gql`
    subscription Typing {
      typing(roomId: "${room_id}", userId: "${user_id}") {
        userId
        username
        isTyping
      }
    }
  `;
};

const Room = function () {
  checkAuth();
  let { room_id } = useParams();
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [room, setRoom] = useState(null);
  const [isLoadingRoom, setIsLoadingRoom] = useState(true);
  const [shareRoomUsername, setShareRoomUsername] = useState("");
  const [sendMessageText, setSendMessageText] = useState("");
  const [showSharePopup, setShowSharePopup] = useState(false);
  const [showUsersPopup, setShowUsersPopup] = useState(false);
  const [showBotsPopup, setShowBotsPopup] = useState(false);
  // Sticky Ask AI state placed with other state hooks to satisfy rules-of-hooks
  const [aiSticky, setAiSticky] = useState(false);
  // Mention autocomplete state
  const [showMentionPopup, setShowMentionPopup] = useState(false);
  const [mentionSuggestions, setMentionSuggestions] = useState([]);
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);
  const [mentionDebounceId, setMentionDebounceId] = useState(null);
  // Room name generation state
  const [isGeneratingName, setIsGeneratingName] = useState(false);
  // Typing indicator state
  const [typingUsers, setTypingUsers] = useState({});
  // Encryption status
  const [encryptionEnabled] = useState(isEncryptionSupported());
  // Bot management state moved to BotManager component
  const typingTimeoutRef = useRef(null);
  const lastTypingStatusRef = useRef(false);
  let userId = localStorage.getItem("userId");
  // Get username - handle both string and JSON object storage
  const getUsername = () => {
    const stored = localStorage.getItem("user");
    if (!stored) return userId;
    try {
      const parsed = JSON.parse(stored);
      return parsed.username || parsed.name || userId;
    } catch {
      // Not JSON, use as-is
      return stored;
    }
  };
  const username = getUsername();
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
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Network response was not ok");
        }
        return response.json();
      })
      .then(async (data) => {
        // Update local room state with returned room data so new user appears immediately
        if (data) {
          setRoom(data);
          // If messages are included, decrypt them when encryption is enabled
          if (encryptionEnabled && data.messages) {
            try {
              const decrypted = await decryptMessages(room_id, data.messages);
              setMessages(decrypted);
            } catch (e) {
              console.warn('Failed to decrypt messages after sharing room:', e);
              setMessages([...data.messages]);
            }
          } else if (data.messages) {
            setMessages([...data.messages]);
          }
        }
        setShareRoomUsername("");
        toggleSharePopup();
      })
      .catch((err) => {
        console.error('Failed to share room:', err);
        // Keep popup open so user can retry
      });
  };

  useEffect(() => {
    // Clear previous room data immediately when switching rooms
    setMessages([]);
    setRoom(null);
    setIsLoadingRoom(true);
    setTypingUsers({});
    setSendMessageText("");

    const fetchRoom = () => {
      authFetch(process.env.REACT_APP_ENDPOINT + "/room/" + room_id)
        .then((response) => {
          if (!response.ok) {
            throw new Error("Network response was not ok");
          }
          return response.json();
        })
        .then(async (data) => {
          setRoom(data);
          // Share room key with server for AI decryption
          if (encryptionEnabled) {
            shareRoomKeyWithServer(room_id, process.env.REACT_APP_ENDPOINT);
          }
          // Decrypt messages if encryption is supported
          if (encryptionEnabled && data.messages) {
            const decrypted = await decryptMessages(room_id, data.messages);
            setMessages(decrypted);
          } else {
            setMessages([...data.messages]);
          }
          setIsLoadingRoom(false);
          // Enable sticky Ask AI for two-party rooms with a bot
          // No automatic mentions; star button adds @chatgpt on demand
        })
        .catch((error) => {
          console.error("There was a problem with the fetch operation:", error);
          setIsLoadingRoom(false);
        });
    };
    fetchRoom();
  }, [room_id, encryptionEnabled]);

  const { loading_ws, error_ws } = useSubscription(MESSAGE_SUB(room_id, userId), {
    onSubscriptionData: async (subscriptionResult) => {
      const newMessage = subscriptionResult?.subscriptionData?.data?.messages;
      if (newMessage) {
        // Decrypt the incoming message if encryption is enabled
        let messageContent = newMessage.content;
        if (encryptionEnabled && newMessage.content) {
          messageContent = await decryptMessage(room_id, newMessage.content);
        }

        setMessages((prevMessages) => {
          // Remove any pending/temp messages from the same sender to avoid duplicates
          const filtered = prevMessages.filter(m =>
            !m.id?.toString().startsWith('temp-') || m.sender !== newMessage.sender
          );
          return [...filtered, { ...newMessage, content: messageContent }];
        });
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

  // Typing indicator subscription
  useSubscription(TYPING_SUB(room_id, userId), {
    onSubscriptionData: (subscriptionResult) => {
      const typingData = subscriptionResult?.subscriptionData?.data?.typing;
      if (typingData) {
        const { userId: typingUserId, username: typingUsername, isTyping } = typingData;
        setTypingUsers(prev => {
          const updated = { ...prev };
          if (isTyping) {
            updated[typingUserId] = { username: typingUsername, timestamp: Date.now() };
          } else {
            delete updated[typingUserId];
          }
          return updated;
        });
      }
    },
  });

  // Clear stale typing indicators after 3 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setTypingUsers(prev => {
        const now = Date.now();
        const updated = {};
        for (const [uid, data] of Object.entries(prev)) {
          if (now - data.timestamp < 3000) {
            updated[uid] = data;
          }
        }
        return updated;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);



  // Function to emit typing status
  const emitTypingStatus = (isTyping) => {
    if (lastTypingStatusRef.current === isTyping) return;
    lastTypingStatusRef.current = isTyping;

    authFetch(process.env.REACT_APP_ENDPOINT + "/typing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        roomId: room_id,
        userId: userId,
        username: username,
        isTyping: isTyping
      }),
    }).catch(err => console.warn("Failed to emit typing status:", err));
  };

  if (loading_ws) return <div className="loading-state">Connecting to chat...</div>;
  if (error_ws) return <div className="error-state">Error: {error_ws.message}</div>;

  // Show minimal loading state while switching rooms
  if (isLoadingRoom) {
    return (
      <div className="room-page">
        <div className="room-header-bar">
          <div className="room-info">
            <h3 id="roomName">Loading...</h3>
          </div>
        </div>
        <div className="room-container">
          <div className="chat-container">
            <div className="messages">
              <div className="loading-state" style={{ margin: 'auto' }}>Loading messages...</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Bot detection helpers

  // Removed bot room helper (unused)

  // Removed: isTwoPartyWithBot (no longer used)

  // Removed: ensurePrefix (no longer used)

  function addAI() {
    // Cycle through available bots or use first bot
    const bots = room?.assistants || [{ name: 'ChatGPT' }];
    const firstBot = bots[0].name;

    // Insert a single leading bot mention on demand
    setSendMessageText(prev => {
      const botPattern = new RegExp(`\\B@(${bots.map(b => b.name).join('|')})\\b`, 'i');
      const hasMention = botPattern.test(prev);
      if (hasMention) {
        const stripped = prev.replace(new RegExp(`\\s*\\B@(${bots.map(b => b.name).join('|')})\\b\\s*`, 'ig'), ' ');
        return `@${firstBot} ${stripped}`.trim();
      }
      return `@${firstBot} ${prev}`.trim();
    });
    setAiSticky(true);
    document.getElementById("sendMsgInput")?.focus();
  }

  const sendMessage = async () => {
    if (sendMessageText === "") {
      return;
    }

    // Stop typing indicator when sending a message
    emitTypingStatus(false);
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    // Store original message for optimistic update
    const originalMessage = sendMessageText;
    const tempId = `temp-${Date.now()}`;

    // Optimistic update - show message immediately
    setMessages((prevMessages) => [
      ...prevMessages,
      { id: tempId, content: originalMessage, sender: userId, pending: true }
    ]);
    setSendMessageText("");

    // Send exactly what the user typed; no automatic mentions
    let contentToSend = originalMessage;
    // Parse unique @mentions from the content (before encryption)
    const mentionMatches = Array.from(contentToSend.matchAll(/@([A-Za-z0-9._-]+)/g));
    const mentionedUsers = Array.from(new Set(mentionMatches.map(m => m[1])));

    // Encrypt all messages - backend will decrypt for AI processing
    if (encryptionEnabled) {
      contentToSend = await encryptMessage(room_id, contentToSend);
    }

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
          // Remove optimistic message on error
          setMessages((prevMessages) => prevMessages.filter(m => m.id !== tempId));
          setSendMessageText(originalMessage); // Restore the message
        } else {
          // WebSocket subscription will handle adding the real message and removing temp

          // Check if room was auto-renamed
          if (data.newRoomName) {
            setRoom(prevRoom => ({
              ...prevRoom,
              name: data.newRoomName
            }));
            // Dispatch event to update sidebar
            window.dispatchEvent(new CustomEvent('roomRenamed', {
              detail: { roomId: room_id, name: data.newRoomName }
            }));
          }

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

    // Include all bots from the room
    const bots = room.assistants?.map(a => a.name) || ['chatgpt'];
    const allSuggestions = [...bots, ...users];

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

    // Emit typing status with debounce
    if (val.trim()) {
      emitTypingStatus(true);
      // Clear previous timeout and set new one to stop typing after 2 seconds of inactivity
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      typingTimeoutRef.current = setTimeout(() => {
        emitTypingStatus(false);
      }, 2000);
    } else {
      emitTypingStatus(false);
    }

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

  // Generate room name from conversation
  const generateRoomName = () => {
    if (isGeneratingName) return;
    setIsGeneratingName(true);

    authFetch(process.env.REACT_APP_ENDPOINT + "/generate-room-name/" + room_id, {
      method: "POST",
    })
      .then((response) => response.json())
      .then((data) => {
        if (data.success && data.name) {
          setRoom(prevRoom => ({ ...prevRoom, name: data.name }));
          window.dispatchEvent(new CustomEvent('roomRenamed', {
            detail: { roomId: room_id, name: data.name }
          }));
        } else if (data.error) {
          console.warn('Could not generate name:', data.error);
        }
      })
      .catch((error) => {
        console.error("Error generating room name:", error);
      })
      .finally(() => setIsGeneratingName(false));
  };



  return (
    <div className="room-page">
      <div className="room-header-bar">
        <div className="room-info">
          <h3 id="roomName">{room != null ? (room.name || "Untitled Chat") : "Loading..."}</h3>
          {room && (
            <span className="room-meta">
              {Object.keys(room.users).length} members
              {encryptionEnabled && (
                <span className="encryption-badge" title="End-to-end encrypted">
                  🔒
                </span>
              )}
            </span>
          )}
        </div>
        <div className="room-actions">
          <button
            className="action-btn"
            onClick={generateRoomName}
            title="Generate Name from Conversation"
            disabled={isGeneratingName}
          >
            <i className={`fas fa-magic ${isGeneratingName ? 'fa-spin' : ''}`}></i>
          </button>
          <button className="action-btn" onClick={() => setShowBotsPopup(!showBotsPopup)} title="Manage Bots">
            <i className="fas fa-robot"></i>
          </button>
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

      {showBotsPopup && (
        <BotManager
          roomId={room_id}
          userId={userId}
          currentBots={room?.assistants || []}
          onRoomUpdate={(newRoom) => setRoom(newRoom)}
          onClose={() => setShowBotsPopup(false)}
          onNavigate={navigate}
        />
      )}



      <div className="room-container">
        <div className="chat-container">
          <div className="messages">
            {messages.map((message) => {
              const bots = room?.assistants || [{ name: 'ChatGPT' }];
              const botNames = bots.map(b => b.name.toLowerCase());
              const isBotMessage = botNames.includes(message.sender.toLowerCase());
              const bot = isBotMessage ? bots.find(b => b.name.toLowerCase() === message.sender.toLowerCase()) : null;
              const isOwnMessage = message.sender === userId;
              const senderUsername = room?.users?.[message.sender]?.username || message.sender;
              const isPending = message.pending;

              return (
                <div
                  key={message.id}
                  className={`message ${isBotMessage ? 'chatgpt-message' : ''} ${isPending ? 'pending' : ''}`}
                  id={isOwnMessage ? "sent" : "recieved"}
                  style={isBotMessage && bot?.color ? { '--bot-glow-color': bot.color } : {}}
                >
                  {renderMessageContent(message.content)}
                  <span className="message-sender">
                    {isBotMessage ? message.sender : (isOwnMessage ? 'You' : `@${senderUsername}`)}
                  </span>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Typing Indicator */}
          {Object.keys(typingUsers).length > 0 && (
            <div className="typing-indicator">
              <div className="typing-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <span className="typing-text">
                {(() => {
                  const names = Object.values(typingUsers).map(u => {
                    // Handle case where username might be an object or string
                    if (typeof u.username === 'string') return u.username;
                    if (typeof u.username === 'object' && u.username?.username) return u.username.username;
                    if (typeof u === 'string') return u;
                    return 'Someone';
                  });
                  if (names.length === 1) {
                    return `${names[0]} is typing...`;
                  } else if (names.length === 2) {
                    return `${names[0]} and ${names[1]} are typing...`;
                  } else {
                    return `${names.slice(0, 2).join(', ')} and ${names.length - 2} more are typing...`;
                  }
                })()}
              </span>
            </div>
          )}

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
                    const bots = room?.assistants || [{ name: 'ChatGPT' }];
                    const botNames = bots.map(b => b.name.toLowerCase());
                    const isAI = botNames.includes(name.toLowerCase());
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
