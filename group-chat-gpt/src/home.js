import React, { useEffect, useState } from 'react';
import NavBar from './navbar';
import './home.css'

function Home() {
  const [user, setUser] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [roomName, setRoomName] = useState('');
  const [users, setUsers] = useState('');

  useEffect(() => {
    fetchRooms();
  }, []);


  const handleRoomCreation = (event) => {
    event.preventDefault();

    const newRoom = {
      creatorId: localStorage.getItem('userId'),
      name: roomName,
      description: ''
    };

    fetch('http://192.168.1.162:8000/create-room', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newRoom),
    })
    .then(response => response.json())
    .then(data => {
      setRooms([...rooms, data]);
      
    })
    .catch(error => {
      console.error('There was a problem creating the room:', error);
    });
  };


  const fetchRooms = () => {
    fetch('http://192.168.1.162:8000/rooms')
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
    fetch('http://192.168.1.162:8000/delete-room/' + roomId, {
     method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      }
    }
    )
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

  function selectRoom(room_id){
    localStorage.setItem('selectedRoomId', room_id)
    window.location.href = './room'
  }

  return (
    <div>
      <NavBar />

      <div id="roomCreation">
        <h1>Create a Room</h1>
        <form onSubmit={handleRoomCreation} id = "roomCreationForm">
          <label htmlFor="roomName">Room Name:</label>
          <input type="text" id="roomName" name="roomName" value={roomName} onChange={(e) => setRoomName(e.target.value)} required />
          <label htmlFor="users">Users</label>
          <input type="text" id="users" name="users" value={users} onChange={(e) => setUsers(e.target.value)} />
          <button type="submit">Create Room</button>
        </form>
      </div>

      <div id="roomList">
        <h1>Room List</h1>
        <ul id="rooms">
          {rooms.length === 0 ? <p>No rooms available.</p> :
            rooms.map(room => (
              <div key={room.id} id = "room">
                <button className="room-delete-button" onClick={() => deleteRoom(room.id)}>X</button>
                <div  onClick={()=> {
                localStorage.setItem('selectedRoomId', room.id)
                window.location.href = './room';
              }
            }>
                <h3 id="roomName"> {room.name}</h3>
                <p id="roomCreator">Owner:{room.creator.username}</p>
                <p id="roomUsers">Users: {Object.values(room.users).map(user => user.username).join(', ')}</p>
                </div>
                
              </div>
            ))
          }
        </ul>
      </div>
    </div>
  );
}

export default Home;
