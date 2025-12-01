import React, { useState, useEffect, useCallback } from 'react';
import NavBar from './navbar';
import './friends.css';
import checkAuth from "./navbar";

function Friends() {
  checkAuth();
  const [friends, setFriends] = useState([]);
  const [requests, setRequests] = useState([]);
  const [userSearch, setUserSearch] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [activeTab, setActiveTab] = useState('friends'); // 'friends', 'requests', 'add'
  const userId = localStorage.getItem('userId');

  const fetchFriends = useCallback(() => {
    fetch(`${process.env.REACT_APP_ENDPOINT}/friends/${userId}`)
      .then(res => {
        if (!res.ok) {
          throw new Error('Failed to fetch friends');
        }
        return res.json();
      })
      .then(data => setFriends(Array.isArray(data) ? data : []))
      .catch(err => {
        console.error(err);
        setFriends([]);
      });
  }, [userId]);

  const fetchRequests = useCallback(() => {
    fetch(`${process.env.REACT_APP_ENDPOINT}/friend-requests/${userId}`)
      .then(res => {
        if (!res.ok) {
          throw new Error('Failed to fetch requests');
        }
        return res.json();
      })
      .then(data => setRequests(Array.isArray(data) ? data : []))
      .catch(err => {
        console.error(err);
        setRequests([]);
      });
  }, [userId]);

  useEffect(() => {
    fetchFriends();
    fetchRequests();
  }, [fetchFriends, fetchRequests]);

  const handleSearch = (value) => {
    setUserSearch(value);
    if (value.trim() === '') {
      setSearchResults([]);
      return;
    }

    fetch(`${process.env.REACT_APP_ENDPOINT}/profiles/${value}`)
      .then(res => res.json())
      .then(data => {
        // Filter out self and existing friends
        const filtered = data.filter(u =>
          u.id !== userId &&
          !friends.find(f => f.id === u.id)
        );
        setSearchResults(filtered);
      })
      .catch(err => console.error(err));
  };

  const sendRequest = (toUser) => {
    fetch(`${process.env.REACT_APP_ENDPOINT}/friend-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from_user: userId, to_user: toUser })
    })
      .then(res => res.json())
      .then(data => {
        alert(data.message);
        handleSearch(userSearch); // Refresh search results
      })
      .catch(err => console.error(err));
  };

  const acceptRequest = (fromUser) => {
    fetch(`${process.env.REACT_APP_ENDPOINT}/accept-friend-request`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ from_user: fromUser, to_user: userId })
    })
      .then(res => res.json())
      .then(data => {
        fetchFriends();
        fetchRequests();
        // Trigger notification refresh
        window.dispatchEvent(new CustomEvent('refreshNotifications'));
      })
      .catch(err => console.error(err));
  };

  return (
    <div className="friends-page">
      <NavBar />
      <div className="friends-container">
        <div className="friends-header">
          <h1>Friends</h1>
          <div className="tabs">
            <button
              className={activeTab === 'friends' ? 'active' : ''}
              onClick={() => setActiveTab('friends')}
            >
              My Friends ({friends.length})
            </button>
            <button
              className={activeTab === 'requests' ? 'active' : ''}
              onClick={() => setActiveTab('requests')}
            >
              Requests ({requests.length})
            </button>
            <button
              className={activeTab === 'add' ? 'active' : ''}
              onClick={() => setActiveTab('add')}
            >
              Add Friend
            </button>
          </div>
        </div>

        <div className="friends-content">
          {activeTab === 'friends' && (
            <div className="friends-list">
              {friends.length === 0 ? (
                <p className="empty-state">You haven't added any friends yet.</p>
              ) : (
                friends.map(friend => (
                  <div key={friend.id} className="friend-card">
                    <div className="avatar">
                      {friend.first_name?.[0] || '?'}{friend.last_name?.[0] || '?'}
                    </div>
                    <div className="info">
                      <h3>{friend.first_name} {friend.last_name}</h3>
                      <p>@{friend.username}</p>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'requests' && (
            <div className="requests-list">
              {requests.length === 0 ? (
                <p className="empty-state">No pending friend requests.</p>
              ) : (
                requests.map(req => (
                  <div key={req.id} className="friend-card request-card">
                    <div className="avatar">
                      {req.first_name?.[0] || '?'}{req.last_name?.[0] || '?'}
                    </div>
                    <div className="info">
                      <h3>{req.first_name} {req.last_name}</h3>
                      <p>@{req.username}</p>
                    </div>
                    <button onClick={() => acceptRequest(req.id)} className="accept-btn">
                      Accept
                    </button>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'add' && (
            <div className="add-friend-section">
              <input
                type="text"
                placeholder="Search users by name or username..."
                value={userSearch}
                onChange={(e) => handleSearch(e.target.value)}
                className="search-input"
              />
              <div className="search-results">
                {searchResults.map(user => (
                  <div key={user.id} className="friend-card">
                    <div className="avatar">
                      {user.first_name?.[0] || '?'}{user.last_name?.[0] || '?'}
                    </div>
                    <div className="info">
                      <h3>{user.first_name} {user.last_name}</h3>
                      <p>@{user.username}</p>
                    </div>
                    <button onClick={() => sendRequest(user.id)} className="add-btn">
                      Add Friend
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Friends;
