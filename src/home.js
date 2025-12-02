import React from 'react';
import { useNavigate } from "react-router-dom";
import './home.css';
import { checkAuth } from "./navbar"
import { authFetch } from './api';

function Home() {
  checkAuth();
  const navigate = useNavigate();

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

  return (
    <div className="home-page default-view">
      <div className="welcome-container">
        <div className="welcome-icon">👋</div>
        <h1>Welcome to GroupChatGPT</h1>
        <p>Select a conversation from the sidebar or start a new one.</p>
        <button className="create-room-button" onClick={createInstantRoom} style={{ marginTop: '2rem', width: 'auto', display: 'inline-flex' }}>
          Start New Chat
        </button>
      </div>
    </div>
  );
}

export default Home;
