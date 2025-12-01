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
  const messagesEndRef = useRef(null);
  const { isDarkMode, toggleTheme } = useTheme();

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
          <div id="roomDetails">
          <h3 id="roomName">{room != null ? room.name : "Loading..."}</h3>
          <button id="shareRoomBnt" onClick={toggleSharePopup} title="Invite User">
            <i className="fas fa-user-plus"></i>
          </button>
          <button id="shareRoomBnt" onClick={toggleUsersPopup} title="View Members">
            <i className="fas fa-users"></i>
          </button>
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
              onSelect={handleSelection}
            />
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
