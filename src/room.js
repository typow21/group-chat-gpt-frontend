import React, { useState, useEffect, useRef } from "react";
import { gql, useSubscription } from "@apollo/client";
import CodeBlock from "./codeBlock";
import "./room.css";
import "./navbar.css";
import "@fortawesome/fontawesome-free/css/all.min.css";
import { checkAuth } from "./navbar";
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
  // Sticky Ask AI state placed with other state hooks to satisfy rules-of-hooks
  const [aiSticky, setAiSticky] = useState(true);
  let userId = localStorage.getItem("userId");
  const messagesEndRef = useRef(null);


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
          // Enable sticky Ask AI for two-party rooms with a bot
          if (isTwoPartyWithBotRoom(data)) {
            setAiSticky(true);
          }
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

  // Bot detection helpers

  const isTwoPartyWithBotRoom = (roomObj) => {
    if (!roomObj || !roomObj.users) return false;
    const userList = Object.values(roomObj.users);
    if (userList.length !== 2) return false;
    const botNames = Object.values(roomObj.users)
      .map(u => (u.username || '').toLowerCase())
      .filter(name => name.includes('chatgpt') || name.includes('bot'));
    return botNames.length > 0;
  };

  const isTwoPartyWithBot = () => isTwoPartyWithBotRoom(room);

  // messageLooksFromBot helper not required currently; can reintroduce if used later

  // Removed useEffect to satisfy rules-of-hooks; set sticky during room fetch

  const ensurePrefix = (text) => {
    // Ensure a single @chatgpt mention at start if sticky is enabled
    if (!aiSticky) return text;
    const hasMention = /\B@chatgpt\b/i.test(text);
    if (hasMention) {
      // Normalize to single leading mention
      const stripped = text.replace(/\s*\B@chatgpt\b\s*/ig, ' ').trim();
      return `@chatgpt ${stripped}`.trim();
    }
    return `@chatgpt ${text}`.trim();
  };

  function addAI() {
    // Toggle sticky mode when clicking ✨
    setAiSticky(prev => !prev);
    // Apply immediately to current input
    setSendMessageText(prev => ensurePrefix(prev));
    document.getElementById("sendMsgInput")?.focus();
  }

  const sendMessage = () => {
    if (sendMessageText === "") {
      return;
    }
    // Build content with sticky prefix or two-party bot rule
    let contentToSend = sendMessageText;
    const needsAuto = (isTwoPartyWithBot() || aiSticky);
    if (needsAuto) {
      contentToSend = ensurePrefix(contentToSend);
    }

    fetch(process.env.REACT_APP_ENDPOINT + "/send-message", {
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
          alert(data.error);
        } else {
          // Don't manually add message - WebSocket subscription will handle it
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
    const segments = content.split(/(```\w+\n[\s\S]+?\n```)/);

    return (
      <>
        {segments.map((segment, index) => {
          if (segment.startsWith("```")) {
            const language = segment.match(/^```(\w+)\n/)[1];
            const code = segment.replace(/^```(\w+)\n/, "").replace(/```$/, "");
            return <CodeBlock key={index} language={language} code={code} />;
          } else {
            // Split by @chatgpt mentions and wrap them
            const parts = segment.split(/(@chatgpt)/gi);
            return (
              <p key={index}>
                {parts.map((part, i) => {
                  if (part.toLowerCase() === '@chatgpt') {
                    return <span key={i} className="chatgpt-mention">{part}</span>;
                  }
                  return part;
                })}
              </p>
            );
          }
        })}
      </>
    );
  };

  const handleSelection = (username) => {
    setShareRoomUsername(username);
  };

  // Override message input onChange to honor sticky
  const handleInputChange = (value) => {
    setShareRoomUsername(value);
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
                onChange={(e) => setSendMessageText(aiSticky ? ensurePrefix(e.target.value) : e.target.value)}
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
