import React, { useEffect, useState, useRef } from 'react';
import NavBar from './navbar';
import './home.css';
import { useNavigate } from "react-router-dom";
import checkAuth from "./navbar"

function Home() {
  checkAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [roomName, setRoomName] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showPopup, setShowPopup] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [profiles, setProfiles] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const debounceTimer = useRef(null);
  const containerRef = useRef(null);

  const [friends, setFriends] = useState([]);

  useEffect(() => {
    fetchRooms();
    fetchFriends();
  }, []);

  const fetchFriends = () => {
    const userId = localStorage.getItem('userId');
    fetch(`${process.env.REACT_APP_ENDPOINT}/friends/${userId}`)
      .then(res => res.json())
      .then(data => setFriends(data))
      .catch(err => console.error(err));
  };

  const togglePopup = () => {
    setShowPopup(!showPopup);
    if (showPopup) {
      setRoomName('');
      setUserSearch('');
      setSelectedUsers([]);
      setProfiles([]);
      setShowDropdown(false);
    }
  };

  const handleRoomCreation = (event) => {
    event.preventDefault();
    console.log('handleRoomCreation called');
    console.log('Room name:', roomName);
    console.log('Selected users:', selectedUsers);

    const newRoom = {
      creatorId: localStorage.getItem('userId'),
      name: roomName,
      description: '',
      users: selectedUsers.map(user => user.id)
    };

    console.log('Creating room with:', newRoom);
    console.log('Endpoint:', process.env.REACT_APP_ENDPOINT + '/create-room');

    fetch(process.env.REACT_APP_ENDPOINT + '/create-room', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(newRoom),
    })
      .then(response => response.json())
      .then(data => {
        console.log('Room created:', data);
        setRooms([...rooms, data]);
        togglePopup();
        navigate("room/" + data.id)
      })
      .catch(error => {
        console.error('There was a problem creating the room:', error);
      });
  };

  const handleUserSearch = (value) => {
    setUserSearch(value);
    setSelectedIndex(-1);

    if (value.trim() === '') {
      setProfiles([]);
      setShowDropdown(false);
      return;
    }

    const filteredFriends = friends.filter(friend =>
      (friend.username.toLowerCase().includes(value.toLowerCase()) ||
        friend.first_name.toLowerCase().includes(value.toLowerCase()) ||
        friend.last_name.toLowerCase().includes(value.toLowerCase())) &&
      !selectedUsers.find(su => su.id === friend.id)
    );

    setProfiles(filteredFriends);
    setShowDropdown(true);
  };

  const handleSelectUser = (user) => {
    if (!selectedUsers.find(u => u.id === user.id)) {
      setSelectedUsers([...selectedUsers, user]);
    }
    setUserSearch('');
    setProfiles([]);
    setShowDropdown(false);
  };

  const handleRemoveUser = (userId) => {
    setSelectedUsers(selectedUsers.filter(u => u.id !== userId));
  };

  const handleKeyDown = (e) => {
    if (!showDropdown || profiles.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev =>
          prev < profiles.length - 1 ? prev + 1 : prev
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0) {
          handleSelectUser(profiles[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowDropdown(false);
        break;
      default:
        break;
    }
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, []);

  const fetchRooms = () => {
    setIsLoading(true);
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
      })
      .finally(() => setIsLoading(false));
  };

  const deleteRoom = (e, roomId) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this room?')) return;

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
    <div className="home-page">
      <NavBar />
      <div id="roomList" className="fade-in">
        <div className="room-header">
          <h1>Your Conversations</h1>
          <button className="create-room-button" onClick={togglePopup}>
            <span>+</span> New Chat
          </button>
        </div>

        {isLoading ? (
          <div className="loading-state">Loading chats...</div>
        ) : (
          <ul id="rooms">
            {rooms.length === 0 ? (
              <div className="empty-state">
                <p>No active chats found.</p>
                <button onClick={togglePopup}>Start a new conversation</button>
              </div>
            ) : (
              rooms.map(room => (
                <div key={room.id} id="room" onClick={() => navigate(`/room/${room.id}`)}>
                  <button
                    className="room-delete-button"
                    onClick={(e) => deleteRoom(e, room.id)}
                    title="Delete Room"
                  >
                    ×
                  </button>
                  <div className="room-content">
                    <h3 id="roomName">{room.name}</h3>
                    <p id="roomCreator">Owner: {room.creator.username}</p>
                    <p id="roomUsers">
                      {Object.values(room.users).length} Participants
                    </p>
                  </div>
                </div>
              ))
            )}
          </ul>
        )}
      </div>

      {showPopup && (
        <div className="popup-background" onClick={togglePopup}>
          <div className="popup" onClick={e => e.stopPropagation()}>
            <h2>Start a New Chat</h2>
            <form onSubmit={handleRoomCreation} id="roomCreationForm">
              <label htmlFor="roomName">Room Name</label>
              <input
                type="text"
                id="roomName"
                name="roomName"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="e.g. Project Discussion"
                required
                autoFocus
              />

              <label htmlFor="userSearch">Add Users (optional)</label>
              <div className="user-search-container" ref={containerRef}>
                <div className="selected-users-container">
                  {selectedUsers.map(user => (
                    <div key={user.id} className="user-pill">
                      <span>{user.username}</span>
                      <button
                        type="button"
                        className="pill-remove-btn"
                        onClick={() => handleRemoveUser(user.id)}
                        title="Remove user"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  <input
                    type="text"
                    id="userSearch"
                    value={userSearch}
                    onChange={(e) => handleUserSearch(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onFocus={() => userSearch && setShowDropdown(true)}
                    placeholder="Search and add users..."
                    autoComplete="off"
                  />
                </div>

                {showDropdown && profiles.length > 0 && (
                  <div className="user-dropdown">
                    <div className="dropdown-header">
                      {profiles.length} {profiles.length === 1 ? 'user' : 'users'} found
                    </div>
                    <div className="dropdown-results">
                      {profiles.map((user, index) => (
                        <div
                          key={user.id}
                          className={`dropdown-option ${index === selectedIndex ? 'selected' : ''}`}
                          onClick={() => handleSelectUser(user)}
                          onMouseEnter={() => setSelectedIndex(index)}
                        >
                          <div className="option-avatar">
                            {user.first_name?.[0]?.toUpperCase()}{user.last_name?.[0]?.toUpperCase()}
                          </div>
                          <div className="option-info">
                            <div className="option-username">{user.username}</div>
                            <div className="option-name">{user.first_name} {user.last_name}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {showDropdown && userSearch && profiles.length === 0 && (
                  <div className="user-dropdown">
                    <div className="no-results">No users found for "{userSearch}"</div>
                  </div>
                )}
              </div>

              <div className="button-group">
                <button type="button" className="close-button" onClick={togglePopup}>Cancel</button>
                <button
                  type="submit"
                  className='submit-button'
                  onClick={(e) => {
                    console.log('Submit button clicked');
                    console.log('Room name:', roomName);
                    console.log('Selected users:', selectedUsers);
                  }}
                >
                  Create Room
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default Home;
