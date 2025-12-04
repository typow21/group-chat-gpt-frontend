import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from "react-router-dom";
import './quickBots.css';
import { checkAuth } from "./navbar";
import { authFetch } from './api';

// Prebuilt bots
const PREBUILT_BOTS = [
  {
    name: "CodeHelper",
    instructions: "You are CodeHelper, a friendly expert in Python, JavaScript, and web development. Always answer with clear code examples and explanations.",
    emoji: "💻",
    color: "#4ade80"
  },
  {
    name: "SpanishTutor",
    instructions: "You are SpanishTutor, a native Spanish teacher. Only reply in Spanish and help users learn the language.",
    emoji: "🇪🇸",
    color: "#f59e0b"
  },
  {
    name: "JokeBot",
    instructions: "You are JokeBot, a witty comedian. Always reply with a joke or humorous comment, but keep it appropriate.",
    emoji: "😂",
    color: "#ec4899"
  },
  {
    name: "Motivator",
    instructions: "You are Motivator, a positive coach. Encourage users and provide motivational advice in every response.",
    emoji: "💪",
    color: "#8b5cf6"
  },
  {
    name: "TravelGuide",
    instructions: "You are TravelGuide, an expert in world travel. Provide tips, destination ideas, and travel advice.",
    emoji: "🌍",
    color: "#06b6d4"
  },
  {
    name: "MarkdownMaster",
    instructions: "You are MarkdownMaster. Always format your replies in markdown, using lists, code blocks, and headings where helpful.",
    emoji: "📝",
    color: "#64748b"
  }
];

const PRESET_MODELS = [
  { value: "gpt-5", label: "GPT-5 (Latest Flagship)" },
  { value: "gpt-5-mini", label: "GPT-5 Mini (Fast & Affordable)" },
  { value: "gpt-4.1", label: "GPT-4.1" },
  { value: "gpt-4.1-mini", label: "GPT-4.1 Mini (Fast)" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4o-mini", label: "GPT-4o Mini" },
  { value: "o4-mini", label: "o4-mini (Fast Reasoning)" },
  { value: "o3", label: "o3 (Advanced Reasoning)" },
  { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo (Legacy)" },
];

function QuickBots() {
  checkAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('prebuilt'); // 'prebuilt', 'my-bots', 'create'
  const [userBots, setUserBots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creatingChat, setCreatingChat] = useState(null);
  const [editingBot, setEditingBot] = useState(null);
  const [toast, setToast] = useState('');
  const userId = localStorage.getItem('userId');

  // Create bot form state
  const [newBotName, setNewBotName] = useState('');
  const [newBotInstructions, setNewBotInstructions] = useState('');
  const [newBotEmoji, setNewBotEmoji] = useState('🤖');
  const [newBotColor, setNewBotColor] = useState('#8b5cf6');
  const [newBotModel, setNewBotModel] = useState('gpt-4o-mini');
  const [newBotTemperature, setNewBotTemperature] = useState(0.7);
  const [newBotMaxTokens, setNewBotMaxTokens] = useState(512);
  const [isCreating, setIsCreating] = useState(false);

  // Edit bot form state
  const [editName, setEditName] = useState('');
  const [editInstructions, setEditInstructions] = useState('');
  const [editEmoji, setEditEmoji] = useState('🤖');
  const [editColor, setEditColor] = useState('#8b5cf6');
  const [editModel, setEditModel] = useState('gpt-4o-mini');
  const [editTemperature, setEditTemperature] = useState(0.7);
  const [editMaxTokens, setEditMaxTokens] = useState(512);

  const showToast = (message) => {
    setToast(message);
    setTimeout(() => setToast(''), 3000);
  };

  const fetchUserBots = useCallback(async () => {
    try {
      const response = await authFetch(`${process.env.REACT_APP_ENDPOINT}/user/${userId}/quick-bots`);
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setUserBots(data.bots || []);
        }
      }
    } catch (error) {
      console.error('Error fetching user bots:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    if (userId) {
      fetchUserBots();
    } else {
      setLoading(false);
    }
  }, [userId, fetchUserBots]);

  useEffect(() => {
    if (editingBot) {
      setEditName(editingBot.name);
      setEditInstructions(editingBot.instructions || '');
      setEditEmoji(editingBot.emoji || '🤖');
      setEditColor(editingBot.color || '#8b5cf6');
      setEditModel(editingBot.model || 'gpt-4o-mini');
      setEditTemperature(editingBot.temperature ?? 0.7);
      setEditMaxTokens(editingBot.max_tokens || 512);
    }
  }, [editingBot]);

  const createRoomWithBot = async (bot) => {
    if (creatingChat) return;
    setCreatingChat(bot.name);

    try {
      const newRoom = {
        creatorId: userId,
        name: `Chat with ${bot.name}`,
        description: '',
        users: [],
        assistants: [{
          name: bot.name,
          custom_instructions: bot.instructions || null,
          model: bot.model || null,
          temperature: bot.temperature || null,
          max_tokens: bot.max_tokens || null,
          color: bot.color || null,
        }]
      };

      const response = await authFetch(process.env.REACT_APP_ENDPOINT + '/create-room', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newRoom),
      });

      if (!response.ok) {
        throw new Error('Failed to create room');
      }

      const data = await response.json();
      navigate(`/room/${data.id}`);
    } catch (error) {
      console.error('Error starting chat with bot:', error);
      showToast('Failed to start chat');
    } finally {
      setCreatingChat(null);
    }
  };

  const createUserBot = async () => {
    if (!newBotName.trim()) {
      showToast('Please enter a bot name');
      return;
    }
    setIsCreating(true);

    try {
      const response = await authFetch(`${process.env.REACT_APP_ENDPOINT}/user/${userId}/quick-bots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newBotName.trim(),
          instructions: newBotInstructions.trim() || null,
          emoji: newBotEmoji,
          color: newBotColor,
          model: newBotModel,
          temperature: newBotTemperature,
          max_tokens: newBotMaxTokens
        }),
      });

      const data = await response.json();
      if (data.success) {
        setUserBots(data.bots || []);
        setNewBotName('');
        setNewBotInstructions('');
        setNewBotEmoji('🤖');
        setNewBotColor('#8b5cf6');
        setNewBotModel('gpt-4o-mini');
        setNewBotTemperature(0.7);
        setNewBotMaxTokens(512);
        setActiveTab('my-bots');
        showToast('Bot created successfully!');
      } else {
        showToast(data.error || 'Failed to create bot');
      }
    } catch (error) {
      console.error('Error creating bot:', error);
      showToast('Failed to create bot');
    } finally {
      setIsCreating(false);
    }
  };

  const updateUserBot = async () => {
    if (!editingBot || !editName.trim()) return;

    try {
      const response = await authFetch(`${process.env.REACT_APP_ENDPOINT}/user/${userId}/quick-bots/${editingBot.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName.trim(),
          instructions: editInstructions.trim() || null,
          emoji: editEmoji,
          color: editColor,
          model: editModel,
          temperature: editTemperature,
          max_tokens: editMaxTokens
        }),
      });

      const data = await response.json();
      if (data.success) {
        setUserBots(data.bots || []);
        setEditingBot(null);
        showToast('Bot updated successfully!');
      } else {
        showToast(data.error || 'Failed to update bot');
      }
    } catch (error) {
      console.error('Error updating bot:', error);
      showToast('Failed to update bot');
    }
  };

  const deleteUserBot = async (botId) => {
    if (!window.confirm('Are you sure you want to delete this bot?')) return;

    try {
      const response = await authFetch(`${process.env.REACT_APP_ENDPOINT}/user/${userId}/quick-bots/${botId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      if (data.success) {
        setUserBots(data.bots || []);
        showToast('Bot deleted successfully!');
      } else {
        showToast(data.error || 'Failed to delete bot');
      }
    } catch (error) {
      console.error('Error deleting bot:', error);
      showToast('Failed to delete bot');
    }
  };

  const applyTemplate = (bot) => {
    setNewBotName(bot.name + ' Copy');
    setNewBotInstructions(bot.instructions || '');
    setNewBotEmoji(bot.emoji || '🤖');
    setNewBotColor(bot.color || '#8b5cf6');
    setNewBotModel(bot.model || 'gpt-4o-mini');
    setActiveTab('create');
  };

  // Edit modal
  if (editingBot) {
    return (
      <div className="quick-bots-page">
        {toast && <div className="quick-bots-toast">{toast}</div>}
        <div className="quick-bots-container">
          <div className="quick-bots-header">
            <h1>Edit Bot</h1>
            <button className="back-btn" onClick={() => setEditingBot(null)}>
              ← Back
            </button>
          </div>

          <div className="create-bot-form">
            <div className="form-group">
              <label className="form-label">Bot Name</label>
              <input
                className="form-input"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="e.g., MyHelper"
              />
            </div>

            <div className="form-group">
              <label className="form-label">Instructions</label>
              <textarea
                className="form-textarea"
                value={editInstructions}
                onChange={(e) => setEditInstructions(e.target.value)}
                placeholder="Describe how the bot should behave..."
                rows={4}
              />
            </div>

            <div className="form-row">
              <div className="form-group half">
                <label className="form-label">Emoji</label>
                <input
                  className="form-input"
                  value={editEmoji}
                  onChange={(e) => setEditEmoji(e.target.value)}
                  placeholder="🤖"
                  maxLength={4}
                />
              </div>
              <div className="form-group half">
                <label className="form-label">Color</label>
                <div className="color-picker-row">
                  <input
                    type="color"
                    className="form-color"
                    value={editColor}
                    onChange={(e) => setEditColor(e.target.value)}
                  />
                  <span className="color-value">{editColor}</span>
                </div>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Model</label>
              <select
                className="form-select"
                value={editModel}
                onChange={(e) => setEditModel(e.target.value)}
              >
                {PRESET_MODELS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            <div className="form-row">
              <div className="form-group half">
                <label className="form-label">Temperature: {editTemperature}</label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={editTemperature}
                  onChange={(e) => setEditTemperature(parseFloat(e.target.value))}
                  className="form-range"
                />
              </div>
              <div className="form-group half">
                <label className="form-label">Max Tokens</label>
                <input
                  type="number"
                  className="form-input"
                  value={editMaxTokens}
                  onChange={(e) => setEditMaxTokens(parseInt(e.target.value) || 512)}
                />
              </div>
            </div>

            <div className="form-actions">
              <button className="btn-secondary" onClick={() => setEditingBot(null)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={updateUserBot}>
                Save Changes
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="quick-bots-page">
      {toast && <div className="quick-bots-toast">{toast}</div>}
      <div className="quick-bots-container">
        {/* Header */}
        <div className="quick-bots-header">
          <h1>🤖 Quick Bots</h1>
          <p>Start instant conversations with AI bots</p>
        </div>

        {/* Tabs */}
        <div className="quick-bots-tabs">
          <button
            className={activeTab === 'prebuilt' ? 'active' : ''}
            onClick={() => setActiveTab('prebuilt')}
          >
            Prebuilt Bots
          </button>
          <button
            className={activeTab === 'my-bots' ? 'active' : ''}
            onClick={() => setActiveTab('my-bots')}
          >
            My Bots ({userBots.length})
          </button>
          <button
            className={activeTab === 'create' ? 'active' : ''}
            onClick={() => setActiveTab('create')}
          >
            Create New
          </button>
        </div>

        {/* Content */}
        <div className="quick-bots-content">
          {activeTab === 'prebuilt' && (
            <div className="bots-grid">
              {PREBUILT_BOTS.map(bot => (
                <div key={bot.name} className="bot-card" style={{ '--bot-color': bot.color }}>
                  <div className="bot-card-header">
                    <div className="bot-emoji">{bot.emoji}</div>
                    <div className="bot-name">{bot.name}</div>
                  </div>
                  <div className="bot-color-bar" style={{ background: bot.color }} />
                  <div className="bot-description">{bot.instructions}</div>
                  <div className="bot-card-actions">
                    <button
                      className="btn-primary"
                      onClick={() => createRoomWithBot(bot)}
                      disabled={creatingChat === bot.name}
                    >
                      {creatingChat === bot.name ? 'Starting...' : '💬 Start Chat'}
                    </button>
                    <button
                      className="btn-secondary"
                      onClick={() => applyTemplate(bot)}
                    >
                      Use as Template
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'my-bots' && (
            <div>
              {loading ? (
                <div className="loading-state">Loading your bots...</div>
              ) : userBots.length > 0 ? (
                <div className="bots-grid">
                  {userBots.map(bot => (
                    <div key={bot.id} className="bot-card" style={{ '--bot-color': bot.color || '#8b5cf6' }}>
                      <div className="bot-card-header">
                        <div className="bot-emoji">{bot.emoji || '🤖'}</div>
                        <div className="bot-name">{bot.name}</div>
                      </div>
                      <div className="bot-color-bar" style={{ background: bot.color || '#8b5cf6' }} />
                      <div className="bot-description">
                        {bot.instructions || 'No custom instructions'}
                      </div>
                      <div className="bot-meta">
                        <span className="bot-model">{bot.model || 'gpt-4o-mini'}</span>
                      </div>
                      <div className="bot-card-actions">
                        <button
                          className="btn-primary"
                          onClick={() => createRoomWithBot(bot)}
                          disabled={creatingChat === bot.name}
                        >
                          {creatingChat === bot.name ? 'Starting...' : '💬 Start Chat'}
                        </button>
                        <button
                          className="btn-icon"
                          onClick={() => setEditingBot(bot)}
                          title="Edit bot"
                        >
                          ✏️
                        </button>
                        <button
                          className="btn-icon btn-danger"
                          onClick={() => deleteUserBot(bot.id)}
                          title="Delete bot"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">🤖</div>
                  <h3>No custom bots yet</h3>
                  <p>Create your own bots with custom personalities!</p>
                  <button className="btn-primary" onClick={() => setActiveTab('create')}>
                    Create Your First Bot
                  </button>
                </div>
              )}
            </div>
          )}

          {activeTab === 'create' && (
            <div className="create-bot-form">
              <div className="form-group">
                <label className="form-label">Bot Name *</label>
                <input
                  className="form-input"
                  value={newBotName}
                  onChange={(e) => setNewBotName(e.target.value)}
                  placeholder="e.g., MyHelper"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Instructions</label>
                <textarea
                  className="form-textarea"
                  value={newBotInstructions}
                  onChange={(e) => setNewBotInstructions(e.target.value)}
                  placeholder="Describe how the bot should behave... (e.g., You are a helpful assistant that specializes in...)"
                  rows={4}
                />
              </div>

              <div className="form-row">
                <div className="form-group half">
                  <label className="form-label">Emoji</label>
                  <input
                    className="form-input"
                    value={newBotEmoji}
                    onChange={(e) => setNewBotEmoji(e.target.value)}
                    placeholder="🤖"
                    maxLength={4}
                  />
                </div>
                <div className="form-group half">
                  <label className="form-label">Color</label>
                  <div className="color-picker-row">
                    <input
                      type="color"
                      className="form-color"
                      value={newBotColor}
                      onChange={(e) => setNewBotColor(e.target.value)}
                    />
                    <span className="color-value">{newBotColor}</span>
                  </div>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Model</label>
                <select
                  className="form-select"
                  value={newBotModel}
                  onChange={(e) => setNewBotModel(e.target.value)}
                >
                  {PRESET_MODELS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group half">
                  <label className="form-label">Temperature: {newBotTemperature}</label>
                  <input
                    type="range"
                    min="0"
                    max="2"
                    step="0.1"
                    value={newBotTemperature}
                    onChange={(e) => setNewBotTemperature(parseFloat(e.target.value))}
                    className="form-range"
                  />
                </div>
                <div className="form-group half">
                  <label className="form-label">Max Tokens</label>
                  <input
                    type="number"
                    className="form-input"
                    value={newBotMaxTokens}
                    onChange={(e) => setNewBotMaxTokens(parseInt(e.target.value) || 512)}
                  />
                </div>
              </div>

              <button
                className="btn-primary btn-create"
                onClick={createUserBot}
                disabled={isCreating || !newBotName.trim()}
              >
                {isCreating ? 'Creating...' : 'Create Bot'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default QuickBots;
