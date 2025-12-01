import React, { useState, useEffect, useCallback } from 'react';
import './notifications.css';

function Notifications({ userId }) {
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);
    const [showDropdown, setShowDropdown] = useState(false);

    const fetchNotifications = useCallback(async () => {
        try {
            const response = await fetch(`${process.env.REACT_APP_ENDPOINT}/notifications/${userId}`);
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
            const response = await fetch(`${process.env.REACT_APP_ENDPOINT}/unread-count/${userId}`);
            if (!response.ok) {
                setUnreadCount(0);
                return;
            }
            const data = await response.json();
            setUnreadCount(data.count || 0);
        } catch (error) {
            console.error('Error fetching unread count:', error);
            setUnreadCount(0);
        }
    }, [userId]);

    useEffect(() => {
        if (userId) {
            fetchNotifications();
            fetchUnreadCount();

            // Poll for new notifications every 5 seconds
            const interval = setInterval(() => {
                fetchUnreadCount();
                if (showDropdown) {
                    fetchNotifications();
                }
            }, 1000);

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
            await fetch(`${process.env.REACT_APP_ENDPOINT}/notifications/${notificationId}/mark-read?user_id=${userId}`, {
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
            await fetch(`${process.env.REACT_APP_ENDPOINT}/notifications/${notificationId}?user_id=${userId}`, {
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
        if (!showDropdown) {
            fetchNotifications();
        }
    };

    const getNotificationIcon = (type) => {
        switch (type) {
            case 'friend_request':
                return '👥';
            case 'friend_accepted':
                return '✅';
            case 'room_invite':
                return '💬';
            case 'message_mention':
                return '@';
            default:
                return '🔔';
        }
    };

    return (
        <div className="notifications-container">
            <button className="notification-bell" onClick={toggleDropdown}>
                🔔
                {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                )}
            </button>

            {showDropdown && (
                <div className="notifications-dropdown">
                    <div className="notifications-header">
                        <h3>Notifications</h3>
                        <button onClick={toggleDropdown} className="close-btn">×</button>
                    </div>

                    <div className="notifications-list">
                        {notifications.length === 0 ? (
                            <div className="empty-notifications">
                                <p>No notifications</p>
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
                                        <span className="notification-time">
                                            {new Date(notif.created_at).toLocaleString()}
                                        </span>
                                    </div>
                                    <div className="notification-actions">
                                        {!notif.read && (
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
                                            title="Delete"
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
