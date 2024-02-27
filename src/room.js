import React, { useState, useEffect, useRef } from "react";
import {gql, useSubscription } from "@apollo/client";
import { useLocation } from 'react-router-dom';

import "./room.css";
import "./navbar.css"
import '@fortawesome/fontawesome-free/css/all.min.css'; // Import the whole Font Awesome library
import { Link } from 'react-router-dom';

const MESSAGE_SUB = function (room_id) {
  return gql`
    subscription Chat {
      messages(roomId: "${room_id}") {
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
}

const Room = function () {
  let location = useLocation();
  console.log("props", location.state)
  let room_id = location.state.room_id
  const [messages, setMessages] = useState([]);
  const [room, setRoom] = useState();
  const [sendMessageText, setSendMessageText] = useState("");
  const [shareRoomUsername, setShareRoomUsername] = useState("");
  const [showPopup, setShowPopup] = useState(false);
  let userId = localStorage.getItem("userId");

  const messagesEndRef = useRef(null); // Create a ref for messages container

  // Add useEffect to scroll to the bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "auto" });
    }
  }, [messages]);



  const shareRoom = () => {
    fetch(process.env.REACT_APP_ENDPOINT + "/share-room", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ username: shareRoomUsername, roomId: room_id }),
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
          console.log("roomdata:", data);
          setMessages([...data.messages]);
         
        })
        .catch((error) => {
          console.error("There was a problem with the fetch operation:", error);
        });
    };
    fetchRoom();
  }, [room_id]); // Assuming fetchRoom is stable and doesn't change
  

  // setting subscription
  const { loading_ws, error_ws, data_ws } = useSubscription(MESSAGE_SUB(room_id), {
    onSubscriptionData: (data_ws) => {
      if (data_ws?.subscriptionData?.data?.messages) {
        console.log("data", data_ws?.subscriptionData?.data?.messages);
        setMessages([...messages, data_ws?.subscriptionData?.data?.messages]);
        console.log("msgs", messages);
      }
    },
  });

  const {rn_data_ws } = useSubscription(ROOM_NOTIFICATION_SUB(room_id), {
    onSubscriptionData: (data_ws) => {
      let message = rn_data_ws?.subscriptionData?.data?.message
      if (message) {
        console.log("data", message);
        setMessages([...messages, message]);
        console.log("msg", message);
      }
    },
  });

  // setting up trigger for data change
  useEffect(() => {
    console.log("35:", data_ws);
    if (data_ws?.subscriptionData?.data?.messages) {
      setMessages([data_ws.subscriptionData.data.messages]);
    }
  }, [data_ws]);

  // this.LatestBlogs({ chatroom: "newBlog" });

  if (loading_ws) return <p>Loading...</p>;
  if (error_ws) return <p>Error : {error_ws.message}</p>;

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
          setSendMessageText(""); // Clear input field after sending message
          console.log("data 112", data);
        }
      })
      .catch((error) => {
        console.error("There was a problem with the fetch operation:", error);
      });
  };

  // Handle Enter key press
  const handleKeyPress = (event) => {
    if (event.key === "Enter") {
      event.preventDefault(); // Prevent form submission
      sendMessage();
    }
  };

  const togglePopup = () => {
    setShowPopup(!showPopup);
  };


  return (
    <div>
      <nav className="navbar">
        <div className="navbar-brand">

              <Link id = "home" to="/">Home</Link>
              </div>
              <div id="roomDetails">
        <h3 id="roomName">{room != null ? room.name : "No room name"}</h3>
        <button id="shareRoomBnt" onClick={togglePopup}><i className="fas fa-user-plus"></i></button>
      </div>
      </nav>
      {showPopup && (
        <div className="popup-background">
          <div className="popup">
              <h3>Invite user</h3>
              <input
                type="text"
                id="shareRoomUsername"
                placeholder="type username here"
                value={shareRoomUsername}
                onChange={(e) => setShareRoomUsername(e.target.value)}
              />
              <button onClick={shareRoom} className="submit-button">Submit</button>
              <button onClick={togglePopup} className="close-button">Close</button>
          </div>
        </div>
      )}
      <div className="room-container">


        <div className="chat-container">

          <div className="chat">
            <div className="messages">
              {messages.map((message) => (
                <div key={message.id} className="message" id={message.sender === userId ? "sent" : "recieved"}>
                  <p>{message.content}</p>
                  <span>{message.sender}</span>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <div id="message-spacer">
              
            </div>
            <div className="input-container">
              {/* <div>✨</div> */}
              <input
                type="text"
                id="sendMsgInput"
                placeholder="Type '@chatgpt' to prompt ChatGPT!"
                value={sendMessageText}
                onChange={(e) => setSendMessageText(e.target.value)}
                onKeyPress={handleKeyPress} // Call handleKeyPress function on key press
              />
              
              <i onClick={sendMessage} id ="send-btn" className="fa fa-arrow-up"></i>
              
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Room;
