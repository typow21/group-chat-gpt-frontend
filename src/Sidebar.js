import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useLocation } from "react-router-dom";
import './home.css';
import './sidebar.css';
import { authFetch } from './api';

function Sidebar({ isOpen, onClose }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [rooms, setRooms] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchRooms = useCallback(() => {
        setIsLoading(true);
        const userId = localStorage.getItem('userId');
        authFetch(process.env.REACT_APP_ENDPOINT + '/rooms/user/' + userId)
            .then(async (response) => {
                if (!response.ok) {
                    const text = await response.text().catch(() => '');
                    throw new Error(text || `Request failed: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                setRooms(data);
            })
            .catch(error => {
                console.error('There was a problem with the fetch operation:', error);
            })
            .finally(() => setIsLoading(false));
    }, []);

    useEffect(() => {
        fetchRooms();
    }, [fetchRooms]);

    // Refresh rooms list if we navigate to root (optional, but good for sync)
    useEffect(() => {
        if (location.pathname === '/') {
            fetchRooms();
        }
    }, [location.pathname, fetchRooms]);

    // Listen for room rename events
    useEffect(() => {
        const handleRoomRenamed = (event) => {
            const { roomId, name } = event.detail;
            setRooms(prevRooms => 
                prevRooms.map(room => 
                    room.id === roomId ? { ...room, name } : room
                )
            );
        };
        
        window.addEventListener('roomRenamed', handleRoomRenamed);
        return () => window.removeEventListener('roomRenamed', handleRoomRenamed);
    }, []);

    const createInstantRoom = () => {
        const newRoom = {
            creatorId: localStorage.getItem('userId'),
            name: '',
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
                setRooms([...rooms, data]);
                navigate("/room/" + data.id);
                if (onClose) onClose(); // Close sidebar on mobile after selection
            })
            .catch(error => {
                console.error('There was a problem creating the room:', error);
            });
    };

    const deleteRoom = (e, roomId) => {
        e.stopPropagation();
        // if (!window.confirm('Are you sure you want to delete this room?')) return;

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
            .then(data => {
                // Refetch rooms for current user after deletion
                fetchRooms();
                if (location.pathname === `/room/${roomId}`) {
                    navigate('/');
                }
            })
            .catch(error => {
                console.error('There was a problem with the fetch operation:', error);
            });
    };

    return (
        <div className={`sidebar ${isOpen ? 'open' : ''}`}>
            <div className="sidebar-header">
                <button className="create-room-button" onClick={createInstantRoom}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="12" y1="5" x2="12" y2="19"></line>
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                    </svg>
                    New Chat
                </button>
            </div>

            <div className="sidebar-content">
                {isLoading ? (
                    <div className="loading-state">Loading chats...</div>
                ) : (
                    <ul className="room-list">
                        {rooms.length === 0 ? (
                            <div className="empty-state-sidebar">
                                <p>No conversations yet</p>
                                <p style={{fontSize: '0.8rem', marginTop: '0.5rem'}}>Start a new chat to begin</p>
                            </div>
                        ) : (
                            rooms.map(room => {
                                // Generate a display name - use room name, first message preview, or fallback
                                const getDisplayName = () => {
                                    if (room.name && room.name.trim() && room.name !== 'New Chat') {
                                        return room.name;
                                    }
                                    // Try to use first message content as preview
                                    if (room.messages && room.messages.length > 0) {
                                        const firstUserMsg = room.messages.find(m => m.sender !== 'assistant' && m.sender !== 'system');
                                        if (firstUserMsg && firstUserMsg.content) {
                                            const preview = firstUserMsg.content.substring(0, 30);
                                            return preview + (firstUserMsg.content.length > 30 ? '...' : '');
                                        }
                                    }
                                    return 'Untitled Chat';
                                };
                                const displayName = getDisplayName();
                                
                                return (
                                    <li
                                        key={room.id}
                                        className={`room-item ${location.pathname === `/room/${room.id}` ? 'active' : ''}`}
                                        onClick={() => {
                                            navigate(`/room/${room.id}`);
                                            if (onClose) onClose();
                                        }}
                                    >
                                        <div className="room-item-icon">
                                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                            </svg>
                                        </div>
                                        <div className="room-item-content">
                                            <span className="room-name" title={displayName}>{displayName}</span>
                                        </div>
                                        <button
                                            className="room-delete-button-small"
                                            onClick={(e) => deleteRoom(e, room.id)}
                                            title="Delete Chat"
                                        >
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="3 6 5 6 21 6"></polyline>
                                                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                            </svg>
                                        </button>
                                    </li>
                                );
                            })
                        )}
                    </ul>
                )}
            </div>
        </div>
    );
}

export default Sidebar;
