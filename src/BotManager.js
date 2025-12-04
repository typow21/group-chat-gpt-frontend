import React, { useState, useEffect, useCallback } from 'react';
import { authFetch } from './api';
import './botManager.css';

const PRESET_MODELS = [
    // GPT-5 Series (Latest)
    { value: "gpt-5", label: "GPT-5 (Latest Flagship)" },
    { value: "gpt-5-mini", label: "GPT-5 Mini (Fast & Affordable)" },
    { value: "gpt-5-nano", label: "GPT-5 Nano (Ultra-Fast)" },
    { value: "gpt-5-codex", label: "GPT-5 Codex (Code Specialist)" },

    // GPT-4.1 Series
    { value: "gpt-4.1", label: "GPT-4.1" },
    { value: "gpt-4.1-mini", label: "GPT-4.1 Mini (Fast)" },
    { value: "gpt-4.1-nano", label: "GPT-4.1 Nano (Ultra-Fast)" },

    // GPT-4o Series
    { value: "gpt-4o", label: "GPT-4o" },
    { value: "gpt-4o-mini", label: "GPT-4o Mini" },

    // o-Series (Reasoning Models)
    { value: "o4-mini", label: "o4-mini (Fast Reasoning)" },
    { value: "o3", label: "o3 (Advanced Reasoning)" },
    { value: "o3-mini", label: "o3-mini (Reasoning)" },
    { value: "o1-mini", label: "o1-mini (Reasoning)" },

    // Legacy
    { value: "gpt-3.5-turbo", label: "GPT-3.5 Turbo (Legacy)" },
];

const PREBUILT_BOTS = [
    {
        name: "CodeHelper",
        instructions: "You are CodeHelper, a friendly expert in Python, JavaScript, and web development. Always answer with clear code examples and explanations."
    },
    {
        name: "SpanishTutor",
        instructions: "You are SpanishTutor, a native Spanish teacher. Only reply in Spanish and help users learn the language."
    },
    {
        name: "JokeBot",
        instructions: "You are JokeBot, a witty comedian. Always reply with a joke or humorous comment, but keep it appropriate."
    },
    {
        name: "Motivator",
        instructions: "You are Motivator, a positive coach. Encourage users and provide motivational advice in every response."
    },
    {
        name: "MarkdownMaster",
        instructions: "You are MarkdownMaster. Always format your replies in markdown, using lists, code blocks, and headings where helpful."
    }
];

const BotManager = ({ roomId, userId, currentBots = [], onRoomUpdate, onClose }) => {
    const [activeTab, setActiveTab] = useState('active'); // active, create, library
    const [editingBot, setEditingBot] = useState(null);

    // Create Bot State
    const [newBotName, setNewBotName] = useState('');
    const [newBotInstructions, setNewBotInstructions] = useState('');
    const [newBotColor, setNewBotColor] = useState('#8b5cf6');
    const [newBotModel, setNewBotModel] = useState('gpt-4o-mini');
    const [newBotTemperature, setNewBotTemperature] = useState(0.7);
    const [newBotMaxTokens, setNewBotMaxTokens] = useState(512);
    const [isAdding, setIsAdding] = useState(false);

    // Library State
    const [botsFromOtherRooms, setBotsFromOtherRooms] = useState([]);
    const [loadingOtherBots, setLoadingOtherBots] = useState(false);
    const [hasLoadedLibrary, setHasLoadedLibrary] = useState(false);

    // Edit State
    const [editModel, setEditModel] = useState('gpt-4o-mini');
    const [editTemperature, setEditTemperature] = useState(0.7);
    const [editMaxTokens, setEditMaxTokens] = useState(512);
    const [editName, setEditName] = useState('');
    const [editInstructions, setEditInstructions] = useState('');
    const [editColor, setEditColor] = useState('#8b5cf6');

    const fetchBotsFromOtherRooms = useCallback(async () => {
        setLoadingOtherBots(true);
        try {
            const response = await authFetch(process.env.REACT_APP_ENDPOINT + `/user/${userId}/all-bots`);
            const data = await response.json();
            if (data.success) {
                const currentBotNames = currentBots.map(b => b.name.toLowerCase());
                const filtered = data.bots.filter(b =>
                    !currentBotNames.includes(b.name.toLowerCase()) &&
                    b.sourceRoomId !== roomId
                );
                setBotsFromOtherRooms(filtered);
                setHasLoadedLibrary(true);
            }
        } catch (error) {
            console.error("Error fetching bots:", error);
        } finally {
            setLoadingOtherBots(false);
        }
    }, [userId, currentBots, roomId]);

    useEffect(() => {
        if (activeTab === 'library' && !hasLoadedLibrary) {
            fetchBotsFromOtherRooms();
        }
    }, [activeTab, hasLoadedLibrary, fetchBotsFromOtherRooms]);

    useEffect(() => {
        if (editingBot) {
            setEditName(editingBot.name);
            setEditInstructions(editingBot.custom_instructions || editingBot.customInstructions || '');
            setEditModel(editingBot.model || 'gpt-4o-mini');
            setEditTemperature(editingBot.temperature ?? 0.7);
            setEditMaxTokens(editingBot.max_tokens || editingBot.maxTokens || 512);
            setEditColor(editingBot.color || BOT_COLORS[0].value);
        }
    }, [editingBot]);
    useEffect(() => {
        if (editingBot) {
            setEditName(editingBot.name);
            setEditInstructions(editingBot.custom_instructions || editingBot.customInstructions || '');
            setEditModel(editingBot.model || 'gpt-4o-mini');
            setEditTemperature(editingBot.temperature ?? 0.7);
            setEditMaxTokens(editingBot.max_tokens || editingBot.maxTokens || 512);
            setEditColor(editingBot.color || '#8b5cf6');
        }
    }, [editingBot]);

    const addBot = async (name, instructions) => {
        if (!name.trim()) return;
        setIsAdding(true);

        try {
            const response = await authFetch(process.env.REACT_APP_ENDPOINT + "/add-bot", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    roomId,
                    botName: name.trim(),
                    customInstructions: instructions?.trim() || null,
                    color: newBotColor,
                    model: newBotModel,
                    temperature: newBotTemperature,
                    max_tokens: newBotMaxTokens
                }),
            });
            const data = await response.json();
            if (data.success) {
                onRoomUpdate(data.room);
                setNewBotName('');
                setNewBotInstructions('');
                setNewBotColor('#8b5cf6');
                setNewBotModel('gpt-4o-mini');
                setNewBotTemperature(0.7);
                setNewBotMaxTokens(512);
                setActiveTab('active');
            } else if (data.error) {) => {
        if (!window.confirm(`Remove ${botName}?`)) return;

        try {
            const response = await authFetch(process.env.REACT_APP_ENDPOINT + "/remove-bot", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ roomId, botName }),
            });
            const data = await response.json();
            if (data.success) {
                onRoomUpdate(data.room);
            } else if (data.error) {
                alert(data.error);
            }
        } catch (error) {
            console.error("Error removing bot:", error);
        }
    };

    const updateBot = async () => {
        if (!editingBot) return;

        try {
            const response = await authFetch(process.env.REACT_APP_ENDPOINT + "/update-bot", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    roomId,
                    botName: editingBot.name,
                    newName: editName !== editingBot.name ? editName.trim() : null,
                    customInstructions: editInstructions?.trim() || null,
                    model: editModel,
                    temperature: editTemperature,
                    max_tokens: editMaxTokens,
                    color: editColor
                }),
            });
            const data = await response.json();
            if (data.success) {
                onRoomUpdate(data.room);
                setEditingBot(null);
            } else if (data.error) {
                alert(data.error);
            }
        } catch (error) {
            console.error("Error updating bot:", error);
        }
    };



    const copyBotToRoom = async (bot) => {
        try {
            const response = await authFetch(process.env.REACT_APP_ENDPOINT + "/add-bot", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    roomId,
                    botName: bot.name,
                    customInstructions: bot.customInstructions || null,
                    color: bot.color || BOT_COLORS[0].value
    const copyBotToRoom = async (bot) => {
        try {
            const response = await authFetch(process.env.REACT_APP_ENDPOINT + "/add-bot", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    roomId,
                    botName: bot.name,
                    customInstructions: bot.customInstructions || null,
                    color: bot.color || '#8b5cf6'
                }),
            });
            const data = await response.json();
            if (data.success) {
                onRoomUpdate(data.room);
                setBotsFromOtherRooms(prev => prev.filter(b => b.name.toLowerCase() !== bot.name.toLowerCase()));
                setActiveTab('active');
            } else if (data.error) {
                alert(data.error);
            }
        } catch (error) {
            console.error("Error copying bot:", error);
        }
    };                      <label className="form-label">Bot Name</label>
                            <input
                                className="form-input"
                                value={editName}
                                onChange={(e) => setEditName(e.target.value)}
                                placeholder="Bot Name"
                            />
                        </div>
                        <div className="form-group">
                            <label className="form-label">Instructions</label>
                            <textarea
                                className="form-textarea"
                                value={editInstructions}
                                onChange={(e) => setEditInstructions(e.target.value)}
                                placeholder="Custom instructions..."
                            />
                        </div>

                        <div className="form-group">
                            <label className="form-label">Bot Color</label>
                            <div className="color-picker-container">
                                <input
                                    type="color"
                                    className="form-color-input"
                                    value={editColor}
                                    onChange={(e) => setEditColor(e.target.value)}
                                />
                                <span className="color-value">{editColor}</span>
                            </div>
                        </div>

                        <div className="settings-divider">
                            <h4>Model Settings</h4>
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
                                    onChange={(e) => setEditMaxTokens(parseInt(e.target.value))}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bot-manager-footer">
                        <button className="btn-secondary" onClick={() => setEditingBot(null)}>
                            Cancel
                        </button>
                        <button className="btn-primary" onClick={updateBot}>
                            Save Changes
                        </button>
                    </div>
                </div>
            </div>

        );
    }                   </button>
                    </div>
                </div>
            </div>

        );
    }

    return (
        <div className="bot-manager-overlay" onClick={onClose}>
            <div className="bot-manager-modal" onClick={e => e.stopPropagation()}>
                <div className="bot-manager-header">
                    <h3 className="bot-manager-title">
                        <i className="fas fa-robot"></i> Manage Bots
                    </h3>
                    <button className="bot-manager-close" onClick={onClose}>
                        <i className="fas fa-times"></i>
                    </button>
                </div>

                <div className="bot-manager-tabs">
                    <button
                        className={`bot-tab ${activeTab === 'active' ? 'active' : ''}`}
                        onClick={() => setActiveTab('active')}
                    >
                        Active Bots ({currentBots.length})
                    </button>
                    <button
                        className={`bot-tab ${activeTab === 'create' ? 'active' : ''}`}
                        onClick={() => setActiveTab('create')}
                    >
                        Create New
                    </button>
                    <button
                        className={`bot-tab ${activeTab === 'library' ? 'active' : ''}`}
                        onClick={() => setActiveTab('library')}
                    >
                        Bot Library
                    </button>
                </div>

                <div className="bot-manager-content">
                    {activeTab === 'active' && (
                        <div className="bot-list-grid">
                            {currentBots.map(bot => (
                                <div key={bot.name} className="bot-card">
                                    <div className="bot-card-header">
                                        <div className="bot-name">
                                            {bot.name}
                                        </div>
                                        <span className="bot-model-badge" style={{
                                            borderColor: bot.color || '#64b5f6',
                                            color: bot.color || '#64b5f6',
                                            background: `${bot.color || '#64b5f6'}20`
                                        }}>
                                            {bot.model || 'gpt-4o-mini'}
                                        </span>
                                    </div>
                                    <div style={{
                                        width: '100%',
                                        height: '4px',
                                        background: bot.color || '#8b5cf6',
                                        borderRadius: '2px',
                                        marginBottom: '0.75rem',
                                        opacity: 0.5
                                    }} />
                                    <div className="bot-desc">
                                        {bot.custom_instructions || bot.customInstructions || "No custom instructions set."}
                                    </div>
                                    <div className="bot-actions">
                                        <button className="btn-icon" onClick={() => setEditingBot(bot)}>
                                            <i className="fas fa-edit"></i> Edit
                                        </button>
                                        <button className="btn-icon btn-delete" onClick={() => removeBot(bot.name)}>
                                            <i className="fas fa-trash"></i> Remove
                                        </button>
                                    </div>
                                </div>
                            ))}
                            {currentBots.length === 0 && (
                                <div className="empty-state">
                                    <div className="empty-icon">🤖</div>
                                    <p>No bots in this room yet.</p>
                                    <button className="btn-primary" onClick={() => setActiveTab('create')} style={{ marginTop: '1rem', width: 'auto' }}>
                                        Create One
                                    </button>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'create' && (
                        <div style={{ maxWidth: '600px', margin: '0 auto' }}>
                            <div className="form-group">
                                <label className="form-label">Bot Name</label>
                                <input
                                    className="form-input"
                                    value={newBotName}
                                    onChange={(e) => setNewBotName(e.target.value)}
                                    placeholder="e.g., CodeHelper"
                                />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Instructions</label>
                                <textarea
                            <div className="form-group">
                                <label className="form-label">Bot Color</label>
                            <div className="form-group">
                                <label className="form-label">Bot Color</label>
                                <div className="color-picker-container">
                                    <input
                                        type="color"
                                        className="form-color-input"
                                        value={newBotColor}
                                        onChange={(e) => setNewBotColor(e.target.value)}
                                    />
                                    <span className="color-value">{newBotColor}</span>
                                </div>
                            </div>lassName="form-group">
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
                                        onChange={(e) => setNewBotMaxTokens(parseInt(e.target.value))}
                                    />
                                </div>
                            </div>

                            <button
                                className="btn-primary"
                                onClick={() => addBot(newBotName, newBotInstructions)}
                                disabled={isAdding}
                            >
                                {isAdding ? 'Creating...' : 'Create Bot'}
                            </button>
                                className="btn-primary"
                                onClick={() => addBot(newBotName, newBotInstructions)}
                                disabled={isAdding}
                            >
                                {isAdding ? 'Creating...' : 'Create Bot'}
                            </button>
                        </div>
                    )}

                    {activeTab === 'library' && (
                        <div>
                            <div className="library-section">
                                <h4 className="section-title">Prebuilt Bots</h4>
                                <div className="bot-list-grid">
                                    {PREBUILT_BOTS.map(bot => (
                                        <div key={bot.name} className="bot-card">
                                            <div className="bot-card-header">
                                                <div className="bot-name">✨ {bot.name}</div>
                                            </div>
                                            <div className="bot-desc">{bot.instructions}</div>
                                            <button className="btn-primary" onClick={() => {
                                                setNewBotName(bot.name);
                                                setNewBotInstructions(bot.instructions);
                                                setActiveTab('create');
                                            }}>
                                                Use Template
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            <div className="library-section">
                                <h4 className="section-title">From Your Other Rooms</h4>
                                {loadingOtherBots ? (
                                    <div className="empty-state">Loading...</div>
                                ) : (
                                    <div className="bot-list-grid">
                                        {botsFromOtherRooms.map(bot => (
                                            <div key={`${bot.sourceRoomId}-${bot.name}`} className="bot-card">
                                                <div className="bot-card-header">
                                                    <div className="bot-name">🔄 {bot.name}</div>
                                                </div>
                                                <div className="bot-desc">
                                                    From: {bot.sourceRoomName}
                                                </div>
                                                <button className="btn-primary" onClick={() => copyBotToRoom(bot)}>
                                                    Import
                                                </button>
                                            </div>
                                        ))}
                                        {botsFromOtherRooms.length === 0 && (
                                            <div className="empty-state">
                                                <p>No other bots found.</p>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
};

export default BotManager;
