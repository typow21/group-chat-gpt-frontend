import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './profile.css';
import { checkAuth } from './navbar';
import { authFetch } from './api';

function Profile() {
  checkAuth();
  const navigate = useNavigate();
  
  // Get userId from localStorage - fallback to username from user object
  const getUserId = () => {
    const storedUserId = localStorage.getItem('userId');
    if (storedUserId) return storedUserId;
    
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        return user.id || user.username;
      } catch (e) {
        return null;
      }
    }
    return null;
  };
  
  const userId = getUserId();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [error, setError] = useState(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phoneNumber: ''
  });
  const [stats, setStats] = useState({
    roomCount: 0,
    friendCount: 0
  });
  const [tokenUsage, setTokenUsage] = useState({
    used_tokens: 0,
    token_limit: 100000,
    percentage_used: 0,
    remaining_tokens: 100000
  });

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) {
        setError('No user ID found. Please log in again.');
        setLoading(false);
        return;
      }
      
      // Get localStorage data for fallback/merge
      let localUser = {};
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          localUser = JSON.parse(storedUser);
        } catch (e) {
          console.error('Error parsing stored user:', e);
        }
      }
      
      try {
        // Get profile from backend
        const response = await authFetch(`${process.env.REACT_APP_ENDPOINT}/profile/${userId}`);
        if (response.ok) {
          const data = await response.json();
          console.log('Profile data received:', data);
          setProfile(data);
          
          // Merge API data with localStorage - use API data if available, else localStorage
          setFormData({
            firstName: data.contact?.first_name || localUser.first_name || '',
            lastName: data.contact?.last_name || localUser.last_name || '',
            email: data.real_contact?.email || localUser.email || '',
            phoneNumber: data.real_contact?.phone_number || localUser.phone_number || ''
          });
          
          // Get stats
          const roomCount = data.user_context?.rooms?.length || 0;
          const friendCount = data.user_context?.friends?.length || 0;
          setStats({ roomCount, friendCount });
          setError(null);
          
          // Fetch token usage
          try {
            const tokenResponse = await authFetch(`${process.env.REACT_APP_ENDPOINT}/profile/${userId}/token-usage`);
            if (tokenResponse.ok) {
              const tokenData = await tokenResponse.json();
              setTokenUsage(tokenData);
            }
          } catch (tokenError) {
            console.error('Error fetching token usage:', tokenError);
          }
        } else {
          const errorText = await response.text();
          console.error('Profile fetch failed:', response.status, errorText);
          setError('Failed to load profile. Please try again.');
          // Fallback to localStorage
          loadFromLocalStorage(localUser);
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        setError('Could not connect to server. Showing cached data.');
        // Fallback to localStorage
        loadFromLocalStorage(localUser);
      } finally {
        setLoading(false);
      }
    };
    
    const loadFromLocalStorage = (user) => {
      if (user && Object.keys(user).length > 0) {
        setFormData({
          firstName: user.first_name || '',
          lastName: user.last_name || '',
          email: user.email || '',
          phoneNumber: user.phone_number || ''
        });
        // Create a minimal profile from localStorage
        setProfile({
          contact: {
            first_name: user.first_name || '',
            last_name: user.last_name || '',
            username: user.username || userId,
            id: user.id || userId
          },
          auth_info: { username: user.username || userId }
        });
      }
    };

    fetchProfile();
  }, [userId]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSave = async () => {
    try {
      setSaveSuccess(false);
      const response = await authFetch(`${process.env.REACT_APP_ENDPOINT}/profile/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          first_name: formData.firstName,
          last_name: formData.lastName,
          email: formData.email,
          phone_number: formData.phoneNumber
        })
      });
      
      if (response.ok) {
        const updatedProfile = await response.json();
        setProfile(updatedProfile);
        setEditing(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
        
        // Update localStorage
        const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
        storedUser.first_name = formData.firstName;
        storedUser.last_name = formData.lastName;
        localStorage.setItem('user', JSON.stringify(storedUser));
        localStorage.setItem('firstName', formData.firstName);
      } else {
        const errorText = await response.text();
        console.error('Save failed:', errorText);
        setError('Failed to save profile. Please try again.');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      setError('Failed to save profile. Please try again.');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate('/login');
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="profile-loading">Loading profile...</div>
      </div>
    );
  }

  const username = profile?.contact?.username || profile?.auth_info?.username || userId || 'User';

  return (
    <div className="profile-page">
      <div className="profile-content">
        {/* Error/Success Messages */}
        {error && (
          <div className="profile-alert profile-alert-error">
            {error}
          </div>
        )}
        {saveSuccess && (
          <div className="profile-alert profile-alert-success">
            Profile updated successfully!
          </div>
        )}
        
        {/* Profile Header */}
        <div className="profile-header">
          <div className="profile-avatar">
            {formData.firstName?.charAt(0)?.toUpperCase() || username?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="profile-title">
            <h1>{formData.firstName || username} {formData.lastName}</h1>
            <p className="username">@{username}</p>
          </div>
        </div>

        {/* Stats */}
        <div className="profile-stats">
          <div className="stat-card" onClick={() => navigate('/rooms')}>
            <span className="stat-value">{stats.roomCount}</span>
            <span className="stat-label">Chats</span>
          </div>
          <div className="stat-card" onClick={() => navigate('/friends')}>
            <span className="stat-value">{stats.friendCount}</span>
            <span className="stat-label">Friends</span>
          </div>
        </div>

        {/* Token Usage */}
        <div className="profile-section token-usage-section">
          <h2>🤖 AI Token Usage</h2>
          <div className="token-usage-container">
            <div className="token-progress-bar">
              <div 
                className="token-progress-fill" 
                style={{ 
                  width: `${Math.min(tokenUsage.percentage_used, 100)}%`,
                  backgroundColor: tokenUsage.percentage_used > 80 ? '#ef4444' : 
                                   tokenUsage.percentage_used > 50 ? '#f59e0b' : '#22c55e'
                }}
              ></div>
            </div>
            <div className="token-stats">
              <div className="token-stat">
                <span className="token-stat-value">{tokenUsage.used_tokens.toLocaleString()}</span>
                <span className="token-stat-label">Used</span>
              </div>
              <div className="token-stat">
                <span className="token-stat-value">{tokenUsage.percentage_used}%</span>
                <span className="token-stat-label">of Limit</span>
              </div>
              <div className="token-stat">
                <span className="token-stat-value">{tokenUsage.remaining_tokens.toLocaleString()}</span>
                <span className="token-stat-label">Remaining</span>
              </div>
            </div>
            <p className="token-limit-info">
              Monthly limit: {tokenUsage.token_limit.toLocaleString()} tokens
            </p>
          </div>
        </div>

        {/* Profile Info */}
        <div className="profile-section">
          <div className="section-header">
            <h2>Profile Information</h2>
            {!editing ? (
              <button className="edit-btn" onClick={() => setEditing(true)}>
                Edit
              </button>
            ) : (
              <div className="edit-actions">
                <button className="cancel-btn" onClick={() => setEditing(false)}>
                  Cancel
                </button>
                <button className="save-btn" onClick={handleSave}>
                  Save
                </button>
              </div>
            )}
          </div>

          <div className="profile-form">
            <div className="form-row">
              <div className="form-group">
                <label>First Name</label>
                {editing ? (
                  <input
                    type="text"
                    name="firstName"
                    value={formData.firstName}
                    onChange={handleChange}
                    placeholder="First name"
                  />
                ) : (
                  <p>{formData.firstName || '-'}</p>
                )}
              </div>
              <div className="form-group">
                <label>Last Name</label>
                {editing ? (
                  <input
                    type="text"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleChange}
                    placeholder="Last name"
                  />
                ) : (
                  <p>{formData.lastName || '-'}</p>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label>Email</label>
                {editing ? (
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    placeholder="Email address"
                  />
                ) : (
                  <p>{formData.email || '-'}</p>
                )}
              </div>
              <div className="form-group">
                <label>Phone</label>
                {editing ? (
                  <input
                    type="tel"
                    name="phoneNumber"
                    value={formData.phoneNumber}
                    onChange={handleChange}
                    placeholder="Phone number"
                  />
                ) : (
                  <p>{formData.phoneNumber || '-'}</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Account Section */}
        <div className="profile-section">
          <h2>Account</h2>
          <div className="account-info">
            <div className="account-row">
              <span className="account-label">Username</span>
              <span className="account-value">@{username}</span>
            </div>
            <div className="account-row">
              <span className="account-label">User ID</span>
              <span className="account-value account-id">{userId}</span>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="profile-section danger-zone">
          <h2>Session</h2>
          <button className="logout-btn" onClick={handleLogout}>
            <span>🚪</span> Log Out
          </button>
        </div>
      </div>
    </div>
  );
}

export default Profile;
