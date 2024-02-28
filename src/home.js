import React, { useEffect, useState } from 'react';
import NavBar from './navbar';
import './home.css';
import { useNavigate } from "react-router-dom";
import checkAuth from "./navbar"

function Home() {
  checkAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [roomName, setRoomName] = useState('');
  const [users, setUsers] = useState('');
  const [showPopup, setShowPopup] = useState(false);

  useEffect(() => {
    fetchRooms();
  }, []);

  const togglePopup = () => {
    setShowPopup(!showPopup);
  };

  const handleRoomCreation = (event) => {
    event.preventDefault();

    const newRoom = {
      creatorId: localStorage.getItem('userId'),
      name: roomName,
      description: ''
    };

    fetch(process.env.REACT_APP_ENDPOINT + '/create-room', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newRoom),
    })
    .then(response => response.json())
    .then(data => {
      setRooms([...rooms, data]);
      togglePopup(); // Close the popup after room creation
    })
    .catch(error => {
      console.error('There was a problem creating the room:', error);
    });
  };

  const fetchRooms = () => {
    fetch(process.env.REACT_APP_ENDPOINT + '/rooms')
      .then(response => {
        if (!response.ok) {
          throw new Error('Network response was not ok');
        }
        return response.json();
      })
      .then(data => {
        const userId = localStorage.getItem('userId');
        const filteredRooms = data.filter(room => room.users.hasOwnProperty(userId));
        setRooms(filteredRooms);
      })
      .catch(error => {
        console.error('There was a problem with the fetch operation:', error);
      });
  };

  const deleteRoom = (roomId) => {
    fetch(process.env.REACT_APP_ENDPOINT + '/delete-room/' + roomId, {
     method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      }
    })
    .then(response => {
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      return response.json();
    })
    .then(data => {
      const userId = localStorage.getItem('userId');
      const filteredRooms = data.filter(room => room.users.hasOwnProperty(userId));
      setRooms(filteredRooms);
    })
    .catch(error => {
      console.error('There was a problem with the fetch operation:', error);
    });
  };

  
  return (
    <div>
      <NavBar />
      <div id="roomList">
        <h1>Room List</h1>
        <button className="create-room-button" onClick={togglePopup}>Create Room</button>
        <ul id="rooms">
          {rooms.length === 0 ? <p>No rooms available.</p> :
            rooms.map(room => (
              <div key={room.id} id="room">
                <button className="room-delete-button" onClick={() => deleteRoom(room.id)}>X</button>
                <div onClick={()=> {
                  navigate(`/room/${room.id}`);       
                  }}>
                  <h3 id="roomName">{room.name}</h3>
                  <p id="roomCreator">Owner:{room.creator.username}</p>
                  <p id="roomUsers">Users: {Object.values(room.users).map(user => user.username).join(', ')}</p>
                </div>
              </div>
            ))
          }
        </ul>
      </div>

      {showPopup && (
        <div className="popup-background">
          <div className="popup">
            <h2>Create a Room</h2>
            <form onSubmit={handleRoomCreation} id="roomCreationForm">
              <label htmlFor="roomName">Room Name:</label>
              <input type="text" id="roomName" name="roomName" value={roomName} onChange={(e) => setRoomName(e.target.value)} required />
              <label htmlFor="users">Users:</label>
              <input type="text" id="users" name="users" value={users} onChange={(e) => setUsers(e.target.value)} />
              <div className="button-group">
                <button type="submit" className='submit-button'>Create Room</button>
                <button className="close-button" onClick={togglePopup}>Close</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
