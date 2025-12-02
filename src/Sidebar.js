import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from "react-router-dom";
import './home.css';
import './sidebar.css';

function Sidebar({ isOpen, onClose }) {
    const navigate = useNavigate();
    const location = useLocation();
    const [rooms, setRooms] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        fetchRooms();
    }, []);

    // Refresh rooms list if we navigate to root (optional, but good for sync)
    useEffect(() => {
        if (location.pathname === '/') {
            fetchRooms();
        }
    }, [location.pathname]);

    const createInstantRoom = () => {
        const newRoom = {
            creatorId: localStorage.getItem('userId'),
            name: 'New Chat',
            description: '',
            users: []
        };

        fetch(process.env.REACT_APP_ENDPOINT + '/create-room', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(newRoom),
        })
            .then(response => response.json())
            .then(data => {
                setRooms([...rooms, data]);
                navigate("/room/" + data.id);
                if (onClose) onClose(); // Close sidebar on mobile after selection
            })
            .catch(error => {
                console.error('There was a problem creating the room:', error);
            });
    };

    const fetchRooms = () => {
        setIsLoading(true);
        const userId = localStorage.getItem('userId');
        fetch(process.env.REACT_APP_ENDPOINT + '/rooms/user/' + userId)
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
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
    };

    const deleteRoom = (e, roomId) => {
        e.stopPropagation();
        // if (!window.confirm('Are you sure you want to delete this room?')) return;

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
                    <span>+</span> New Chat
                </button>
            </div>

            <div className="sidebar-content">
                {isLoading ? (
                    <div className="loading-state">Loading...</div>
                ) : (
                    <ul className="room-list">
                        {rooms.length === 0 ? (
                            <div className="empty-state-sidebar">
                                <p>No chats.</p>
                            </div>
                        ) : (
                            rooms.map(room => (
                                <li
                                    key={room.id}
                                    className={`room-item ${location.pathname === `/room/${room.id}` ? 'active' : ''}`}
                                    onClick={() => {
                                        navigate(`/room/${room.id}`);
                                        if (onClose) onClose();
                                    }}
                                >
                                    <div className="room-item-content">
                                        <span className="room-name">{room.name}</span>
                                    </div>
                                    <button
                                        className="room-delete-button-small"
                                        onClick={(e) => deleteRoom(e, room.id)}
                                        title="Delete Room"
                                    >
                                        ×
                                    </button>
                                </li>
                            ))
                        )}
                    </ul>
                )}
            </div>
        </div>
    );
}

export default Sidebar;
