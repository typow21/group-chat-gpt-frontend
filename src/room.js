import { useQuery, gql, useSubscription } from "@apollo/client";
import { useEffect, useState , useRef} from "react";
import NavBar from './navbar'
import './room.css'

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
}

const Room = function () {
  const [messages, setMessages] = useState([]);
  const [room, setRoom] = useState()
  const [sendMessageText, setSendMessageText] = useState("");
  const [shareRoomUsername, setShareRoomUsername] = useState("");
  let room_id = localStorage.getItem('selectedRoomId');
  let userId = localStorage.getItem('userId')
  console.log("roomId", room_id)

  const messagesEndRef = useRef(null); // Create a ref for messages container

  // Add useEffect to scroll to the bottom when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  useEffect(() => {
    fetchRoom();
  }, []);

  const shareRoom = () => {
    fetch('http://' + process.env.REACT_APP_BASE_IP + ':8000/share-room', {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ "username": shareRoomUsername, "roomId": room_id })
    })
  }
  const fetchRoom = () => {
    fetch('http://' + process.env.REACT_APP_BASE_IP + ':8000/room/' + room_id)
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        console.log("roomdata:", data)
        setRoom(data);
        setMessages([...messages, ...data.messages])
      })
      .catch(error => {
        console.error('There was a problem with the fetch operation:', error);
      });
  };

  // setting subscription
  const { loading_ws, error_ws, data_ws } = useSubscription(

    MESSAGE_SUB(room_id),
    {
      onSubscriptionData: (data_ws) => {
        if (data_ws?.subscriptionData?.data?.messages) {
          console.log("data", data_ws?.subscriptionData?.data?.messages)
          setMessages([...messages, data_ws?.subscriptionData?.data?.messages])
          console.log("msgs", messages)
        }
      },
    }
  );

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
  let message_html = messages.map(({ id, content, sender }) => (
    <div>
      {
        id === userId ?
          <div id="recieved-msg"><p>{sender}: {content}</p></div>:
          <div id="sent-msg"><p>{content}</p></div>  
      }


    </div>
  ));
  if (messages.length === 0) {
    message_html = (<p>No messages yet.</p>)
  }


  const sendMessage = () => {
    if (sendMessageText === ""){
      return;
    }
    fetch('http://' + process.env.REACT_APP_BASE_IP + ':8000/send-message', {
      method: "POST",
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ "senderId": userId, "roomId": room_id, "content": sendMessageText })
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }

        return response.json();
      })
      .then(data => {
        if ("error" in data) {
          alert(data.error);
        } else {
          
          setMessages([...messages, data])
          console.log("data 112", data);
          document.getElementById("sendMsgInput").value = ""
        }
      })
      .catch(error => {
        console.error('There was a problem with the fetch operation:', error);
      });
  };

  return (
    <div className="room-container">
      <NavBar />
      <div className="chat-container">
        <div className="sidebar">
          <div className="room-details">
            <h1>Room Details</h1>
           <div>
           <input
              type="text"
              id = "shareRoomUsername"
              placeholder="type username here"
              value={shareRoomUsername}
              onChange={(e) => setShareRoomUsername(e.target.value)}
            />
            <button onClick={shareRoom}>Send</button>
           </div>
          </div>
        </div>
        <div className="chat">
          <div className="messages">
            {messages.map((message) => (
              <div key={message.id} className="message" id = {message.sender ==userId ? "sent": "recieved" }>
                
                <p>{message.content}</p>
                <span>{message.sender}</span>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          <div id = "message-spacer"></div>
          <div className="input-container">
            <input
              type="text"
              id = "sendMsgInput"
              placeholder="Type your message..."
              value={sendMessageText}
              onChange={(e) => setSendMessageText(e.target.value)}
              
            />
            <button onClick={sendMessage}>Send</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Room;
