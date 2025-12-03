import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './notifications.css';
import { authFetch } from './api';

function Notifications({ userId }) {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showDropdown, setShowDropdown] = useState(false);
    const [toast, setToast] = useState(null);
    const prevUnreadCountRef = useRef(0);
    const navigate = useNavigate();

    const fetchNotifications = useCallback(async () => {
        try {
            const response = await authFetch(`${process.env.REACT_APP_ENDPOINT}/notifications/${userId}`);
            if (!response.ok) {
                console.error('Failed to fetch notifications:', response.status);
                setNotifications([]);
                return;
            }
            const data = await response.json();
            setNotifications(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Error fetching notifications:', error);
            setNotifications([]);
        }
    }, [userId]);

    const fetchUnreadCount = useCallback(async () => {
        try {
            const response = await authFetch(`${process.env.REACT_APP_ENDPOINT}/notifications/${userId}/count`);
            if (!response.ok) {
                console.error('Failed to fetch unread count:', response.status);
                setUnreadCount(0);
                return;
            }
            const data = await response.json();
            const newCount = data.count || 0;
            
            // Show toast if we have new notifications (count increased)
            if (newCount > prevUnreadCountRef.current && prevUnreadCountRef.current !== 0) {
                // Fetch the latest notification to show in toast
                const notifResponse = await authFetch(`${process.env.REACT_APP_ENDPOINT}/notifications/${userId}`);
                if (notifResponse.ok) {
                    const notifData = await notifResponse.json();
                    const latestUnread = notifData.find(n => !n.read);
                    if (latestUnread) {
                        setToast(latestUnread);
                        // Auto-dismiss after 4 seconds
                        setTimeout(() => setToast(null), 4000);
                    }
                }
            }
            prevUnreadCountRef.current = newCount;
            setUnreadCount(newCount);
        } catch (error) {
            console.error('Error fetching unread count:', error);
            setUnreadCount(0);
        }
    }, [userId]);

    useEffect(() => {
        if (userId) {
            fetchNotifications();
            fetchUnreadCount();

            // Poll for new notifications every 3 seconds
            const interval = setInterval(() => {
                fetchUnreadCount();
                if (showDropdown) {
                    fetchNotifications();
                }
            }, 3000);

            // Listen for manual refresh events
            const handleRefresh = () => {
                fetchNotifications();
                fetchUnreadCount();
            };
            window.addEventListener('refreshNotifications', handleRefresh);

            return () => {
                clearInterval(interval);
                window.removeEventListener('refreshNotifications', handleRefresh);
            };
        }
    }, [userId, showDropdown, fetchNotifications, fetchUnreadCount]);

    const markAsRead = async (notificationId) => {
        try {
            await authFetch(`${process.env.REACT_APP_ENDPOINT}/notifications/${notificationId}/mark-read?user_id=${userId}`, {
                method: 'POST'
            });
            fetchNotifications();
            fetchUnreadCount();
        } catch (error) {
            console.error('Error marking notification as read:', error);
        }
    };

    const deleteNotification = async (notificationId) => {
        try {
            await authFetch(`${process.env.REACT_APP_ENDPOINT}/notifications/${notificationId}?user_id=${userId}`, {
                method: 'DELETE'
            });
            fetchNotifications();
            fetchUnreadCount();
        } catch (error) {
            console.error('Error deleting notification:', error);
        }
    };

    const toggleDropdown = () => {
        setShowDropdown(!showDropdown);
    };

    const acceptFriendRequest = async (notif) => {
        try {
            const fromUserId = notif.from_user_id;
            if (!fromUserId) {
                console.error('No from_user_id in notification');
                return;
            }
            const response = await authFetch(`${process.env.REACT_APP_ENDPOINT}/accept-friend-request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ from_user: fromUserId, to_user: userId })
            });
            if (response.ok) {
                await deleteNotification(notif.id);
                fetchNotifications();
                fetchUnreadCount();
            }
        } catch (error) {
            console.error('Error accepting friend request:', error);
        }
    };

    const denyFriendRequest = async (notif) => {
        try {
            const fromUserId = notif.from_user_id;
            if (!fromUserId) {
                console.error('No from_user_id in notification');
                return;
            }
            const response = await authFetch(`${process.env.REACT_APP_ENDPOINT}/deny-friend-request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ from_user: fromUserId, to_user: userId })
            });
            if (response.ok) {
                await deleteNotification(notif.id);
                fetchNotifications();
                fetchUnreadCount();
            }
        } catch (error) {
            console.error('Error denying friend request:', error);
        }
    };

    const goToRoom = async (notif) => {
        const roomId = notif.metadata?.room_id;
        if (roomId) {
            // Delete the notification when clicking the link
            await deleteNotification(notif.id);
            setShowDropdown(false);
            navigate(`/room/${roomId}`);
        }
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'friend_request':
                return '👤';
            case 'friend_accepted':
                return '🤝';
            case 'room_invite':
                return '💬';
            case 'message_mention':
                return '📣';
            default:
                return '🔔';
        }
    };

    const formatTime = (dateString) => {
        const date = new Date(dateString);
        const now = new Date();
        const diffMs = now - date;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    return (
        <div className="notifications-container">
            {/* Toast notification popup */}
            {toast && (
                <div className="notification-toast" onClick={() => {
                    setShowDropdown(true);
                    setToast(null);
                }}>
                    <div className="toast-icon">{getNotificationIcon(toast.type)}</div>
                    <div className="toast-content">
                        <strong>{toast.title}</strong>
                        <p>{toast.message}</p>
                    </div>
                    <button 
                        className="toast-close" 
                        onClick={(e) => {
                            e.stopPropagation();
                            setToast(null);
                        }}
                    >
                        ×
                    </button>
                </div>
            )}
            
            <button className="notification-bell" onClick={toggleDropdown} aria-label="Notifications">
                🔔
                {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
            </button>

            {showDropdown && (
                <div className="notifications-dropdown">
                    <div className="notifications-header">
                        <h3>Notifications</h3>
                        <button onClick={toggleDropdown} className="close-btn" aria-label="Close">×</button>
                    </div>

                    <div className="notifications-list">
                        {notifications.length === 0 ? (
                            <div className="empty-notifications">
                                <div className="empty-notifications-icon">🔔</div>
                                <p>You're all caught up!</p>
                            </div>
                        ) : (
                            notifications.map(notif => (
                                <div
                                    key={notif.id}
                                    className={`notification-item ${notif.read ? 'read' : 'unread'}`}
                                >
                                    <div className="notification-icon">{getNotificationIcon(notif.type)}</div>
                                    <div className="notification-content">
                                        <h4>{notif.title}</h4>
                                        <p>{notif.message}</p>
                                        {(notif.type === 'message_mention' || notif.type === 'room_invite') && notif.metadata?.room_id && (
                                            <button
                                                onClick={() => goToRoom(notif)}
                                                className="go-to-room-btn"
                                            >
                                                View chat →
                                            </button>
                                        )}
                                        <span className="notification-time">
                                            {formatTime(notif.created_at)}
                                        </span>
                                    </div>
                                    <div className="notification-actions">
                                        {notif.type === 'friend_request' && !notif.read && (
                                            <>
                                                <button
                                                    onClick={() => acceptFriendRequest(notif)}
                                                    className="accept-btn"
                                                    title="Accept"
                                                >
                                                    ✓
                                                </button>
                                                <button
                                                    onClick={() => denyFriendRequest(notif)}
                                                    className="deny-btn"
                                                    title="Decline"
                                                >
                                                    ✕
                                                </button>
                                            </>
                                        )}
                                        {notif.type !== 'friend_request' && !notif.read && (
                                            <button
                                                onClick={() => markAsRead(notif.id)}
                                                className="mark-read-btn"
                                                title="Mark as read"
                                            >
                                                ✓
                                            </button>
                                        )}
                                        <button
                                            onClick={() => deleteNotification(notif.id)}
                                            className="delete-btn"
                                            title="Dismiss"
                                        >
                                            ×
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

export default Notifications;
