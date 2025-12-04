import React, { useState, useEffect } from 'react';
import { useNavigate } from "react-router-dom";
import './home.css';
import { checkAuth } from "./navbar"
import { authFetch } from './api';

// Prebuilt bots for quick chat (same as BotManager)
const QUICK_CHAT_BOTS = [
  {
    name: "CodeHelper",
    instructions: "You are CodeHelper, a friendly expert in Python, JavaScript, and web development. Always answer with clear code examples and explanations.",
    emoji: "💻"
  },
  {
    name: "SpanishTutor",
    instructions: "You are SpanishTutor, a native Spanish teacher. Only reply in Spanish and help users learn the language.",
    emoji: "🇪🇸"
  },
  {
    name: "JokeBot",
    instructions: "You are JokeBot, a witty comedian. Always reply with a joke or humorous comment, but keep it appropriate.",
    emoji: "😂"
  },
  {
    name: "Motivator",
    instructions: "You are Motivator, a positive coach. Encourage users and provide motivational advice in every response.",
    emoji: "💪"
  },
   {
    name: "TravelGuide",
    instructions: "You are TravelGuide, an expert in world travel. Provide tips, destination ideas, and travel advice.",
    emoji: "🌍"
  }
];

function Home() {
  checkAuth();
  const navigate = useNavigate();
  const [recentRooms, setRecentRooms] = useState([]);
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingBotChat, setCreatingBotChat] = useState(null);
  const userId = localStorage.getItem('userId');
  const userName = localStorage.getItem('firstName') || 'there';

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch recent rooms
        const roomsRes = await authFetch(`${process.env.REACT_APP_ENDPOINT}/rooms/user/${userId}`);
        if (roomsRes.ok) {
          const roomsData = await roomsRes.json();
          // Sort by most recent message and take top 3
          const sorted = (roomsData || [])
            .sort((a, b) => {
              const aLast = a.messages?.length ? a.messages[a.messages.length - 1] : null;
              const bLast = b.messages?.length ? b.messages[b.messages.length - 1] : null;
              return (bLast?.id || 0) - (aLast?.id || 0);
            })
            .slice(0, 3);
          setRecentRooms(sorted);
        }

        // Fetch friends
        const friendsRes = await authFetch(`${process.env.REACT_APP_ENDPOINT}/friends/${userId}`);
        if (friendsRes.ok) {
          const friendsData = await friendsRes.json();
          setFriends((friendsData || []).slice(0, 5));
        }
      } catch (error) {
        console.error('Error fetching home data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchData();
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

  const createRoomWithFriend = (friend) => {
    const newRoom = {
      creatorId: userId,
      name: '',
      description: '',
      users: [friend.id]
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

  // Create a new chat room with only the selected bot (no default ChatGPT)
  const createRoomWithBot = async (bot) => {
    if (creatingBotChat) return;
    setCreatingBotChat(bot.name);
    
    try {
      const newRoom = {
        creatorId: userId,
        name: `Chat with ${bot.name}`,
        description: '',
        users: [],
        assistants: [{
          name: bot.name,
          custom_instructions: bot.instructions || null,
        }]
      };

      const response = await authFetch(process.env.REACT_APP_ENDPOINT + '/create-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRoom),
      });

      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(text || `Request failed: ${response.status}`);
      }

      const data = await response.json();
      navigate("/room/" + data.id);
    } catch (error) {
      console.error('Error starting chat with bot:', error);
    } finally {
      setCreatingBotChat(null);
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 18) return 'Good afternoon';
    return 'Good evening';
  };

  return (
    <div className="home-page">
      <div className="home-content">
        {/* Hero Section */}
        <div className="home-hero">
          <div className="hero-greeting">
            <span className="greeting-emoji">👋</span>
            <h1>{getGreeting()}, {userName}!</h1>
            <p>Ready to chat? Start a conversation or continue where you left off.</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="quick-actions">
          <button className="action-card primary" onClick={createInstantRoom}>
            <div className="action-icon">💬</div>
            <div className="action-text">
              <h3>New Chat</h3>
              <p>Start a fresh conversation</p>
            </div>
          </button>
          <button className="action-card" onClick={() => navigate('/friends')}>
            <div className="action-icon">👥</div>
            <div className="action-text">
              <h3>Friends</h3>
              <p>Manage your connections</p>
            </div>
          </button>
          <button className="action-card" onClick={() => navigate('/profile')}>
            <div className="action-icon">⚙️</div>
            <div className="action-text">
              <h3>Settings</h3>
              <p>Update your profile</p>
            </div>
          </button>
        </div>

        {/* Main Content Grid */}
        <div className="home-grid">
          {/* Recent Conversations */}
          <div className="home-section">
            <div className="section-header">
              <h2>Recent Conversations</h2>
              <button className="see-all-btn" onClick={() => navigate('/rooms')}>See all →</button>
            </div>
            {loading ? (
              <div className="loading-placeholder">Loading...</div>
            ) : recentRooms.length > 0 ? (
              <div className="recent-rooms-list">
                {recentRooms.map(room => (
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
                      <p>{Object.keys(room.users || {}).length} members</p>
                    </div>
                    <div className="room-arrow">→</div>
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

          {/* Quick Chat with Friends */}
          <div className="home-section">
            <div className="section-header">
              <h2>Quick Chat</h2>
              <button className="see-all-btn" onClick={() => navigate('/friends')}>Add friends →</button>
            </div>
            {loading ? (
              <div className="loading-placeholder">Loading...</div>
            ) : friends.length > 0 ? (
              <div className="friends-quick-list">
                {friends.map(friend => (
                  <button 
                    key={friend.id} 
                    className="friend-quick-btn"
                    onClick={() => createRoomWithFriend(friend)}
                    title={`Chat with ${friend.first_name}`}
                  >
                    <div className="friend-avatar">
                      {friend.first_name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <span>{friend.first_name}</span>
                  </button>
                ))}
              </div>
            ) : (
              <div className="empty-state">
                <p>Add friends to quick chat</p>
                <button onClick={() => navigate('/friends')}>Find friends</button>
              </div>
            )}
          </div>

          {/* Quick Chat with Bots */}
          <div className="home-section">
            <div className="section-header">
              <h2>Quick Chat with Bot</h2>
            </div>
            <div className="friends-quick-list">
              {QUICK_CHAT_BOTS.map(bot => (
                <button 
                  key={bot.name} 
                  className="friend-quick-btn bot-quick-btn"
                  onClick={() => createRoomWithBot(bot)}
                  title={`Start chat with ${bot.name}`}
                  disabled={creatingBotChat === bot.name}
                >
                  <div className="friend-avatar bot-avatar">
                    {bot.emoji}
                  </div>
                  <span>{creatingBotChat === bot.name ? '...' : bot.name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tips Section */}
        <div className="tips-section">
          <div className="tip-card">
            <span className="tip-icon">✨</span>
            <div>
              <strong>Pro tip:</strong> Mention @bot_name in any conversation to get AI assistance! You can add multiple bots with custom personalities.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Home;
