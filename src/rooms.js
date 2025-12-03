import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import './home.css';
import { checkAuth } from "./navbar";
import { authFetch } from './api';

function Rooms() {
  checkAuth();
  const navigate = useNavigate();
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const userId = localStorage.getItem('userId');

  useEffect(() => {
    const fetchRooms = async () => {
      try {
        const roomsRes = await authFetch(`${process.env.REACT_APP_ENDPOINT}/rooms/user/${userId}`);
        if (roomsRes.ok) {
          const roomsData = await roomsRes.json();
          // Sort by most recent message
          const sorted = (roomsData || []).sort((a, b) => {
            const aLast = a.messages?.length ? a.messages[a.messages.length - 1] : null;
            const bLast = b.messages?.length ? b.messages[b.messages.length - 1] : null;
            return (bLast?.id || 0) - (aLast?.id || 0);
          });
          setRooms(sorted);
        }
      } catch (error) {
        console.error('Error fetching rooms:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchRooms();
    } else {
      setLoading(false);
    }
  }, [userId]);

  const createInstantRoom = () => {
    const newRoom = {
      creatorId: localStorage.getItem('userId'),
      name: 'New Chat',
      description: '',
      users: []
    };

    authFetch(process.env.REACT_APP_ENDPOINT + '/create-room', {
      method: 'POST',
      body: JSON.stringify(newRoom),
    })
      .then(async (response) => {
        if (!response.ok) {
          const text = await response.text().catch(() => '');
          throw new Error(text || `Request failed: ${response.status}`);
        }
        return response.json();
      })
      .then(data => {
        navigate("/room/" + data.id);
      })
      .catch(error => {
        console.error('There was a problem creating the room:', error);
      });
  };

  const deleteRoom = (e, roomId) => {
    e.stopPropagation();

    authFetch(process.env.REACT_APP_ENDPOINT + '/delete-room/' + roomId, {
      method: 'DELETE',
    })
      .then(async (response) => {
        if (!response.ok) {
          const text = await response.text().catch(() => '');
          throw new Error(text || `Request failed: ${response.status}`);
        }
        return response.json();
      })
      .then(() => {
        setRooms(rooms.filter(room => room.id !== roomId));
      })
      .catch(error => {
        console.error('There was a problem deleting the room:', error);
      });
  };

  return (
    <div className="home-page">
      <div className="home-content">
        {/* Header */}
        <div className="home-hero" style={{ marginBottom: '1rem' }}>
          <div className="hero-greeting">
            <h1>All Conversations</h1>
            <p>Browse and manage all your chat rooms</p>
          </div>
        </div>

        {/* Quick Action */}
        <div className="quick-actions" style={{ marginBottom: '2rem' }}>
          <button className="action-card primary" onClick={createInstantRoom}>
            <div className="action-icon">💬</div>
            <div className="action-text">
              <h3>New Chat</h3>
              <p>Start a fresh conversation</p>
            </div>
          </button>
        </div>

        {/* Rooms List */}
        <div className="home-section">
          <div className="section-header">
            <h2>Your Conversations ({rooms.length})</h2>
          </div>
          {loading ? (
            <div className="loading-placeholder">Loading...</div>
          ) : rooms.length > 0 ? (
            <div className="recent-rooms-list">
              {rooms.map(room => (
                <div 
                  key={room.id} 
                  className="recent-room-card"
                  onClick={() => navigate(`/room/${room.id}`)}
                >
                  <div className="room-avatar">
                    {room.name?.charAt(0)?.toUpperCase() || '💬'}
                  </div>
                  <div className="room-info">
                    <h4>{room.name || 'Unnamed Chat'}</h4>
                    <p>{Object.keys(room.users || {}).length} members • {room.messages?.length || 0} messages</p>
                  </div>
                  <button 
                    className="room-delete-btn"
                    onClick={(e) => deleteRoom(e, room.id)}
                    title="Delete Room"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <p>No conversations yet</p>
              <button onClick={createInstantRoom}>Start your first chat</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Rooms;
