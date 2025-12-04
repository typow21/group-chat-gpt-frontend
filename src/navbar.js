import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import './navbar.css';
import { useTheme } from './ThemeContext';
import Notifications from './notifications';
import Logo from './LogoComponent';

export function logout() {
    localStorage.clear();
    window.location.href = '/login';
}

export function checkAuth() {
    const user = localStorage.getItem("user");
    if (!user) {
        logout();
    }
}

function Navbar({ onToggleSidebar }) {
    checkAuth();
    const { isDarkMode, toggleTheme } = useTheme();
    const userId = localStorage.getItem('userId');
    const [user, setUser] = useState(null);
    const [activeDropdown, setActiveDropdown] = useState(null); // 'notifications', 'user', or null
    const menuRef = useRef(null);
    const notifRef = useRef(null);

    useEffect(() => {
        const userStr = localStorage.getItem('user');
        if (userStr) {
            try {
                setUser(JSON.parse(userStr));
            } catch (e) {
                console.error("Error parsing user data", e);
            }
        }

        const handleClickOutside = (event) => {
            // Check if click is outside user menu
            const outsideUserMenu = menuRef.current && !menuRef.current.contains(event.target);
            // Check if click is outside notifications (we need to wrap notifications or assume it handles its own outside clicks, 
            // but since we are lifting state, we should probably handle it here or let the components handle it.
            // However, Notifications component has its own structure. 
            // A simple way is to check if we clicked outside both.

            // Note: Notifications component renders a button and a dropdown. 
            // We can't easily get a ref to the internal structure of Notifications without forwarding ref.
            // But we can wrap it in a div here.

            const outsideNotif = notifRef.current && !notifRef.current.contains(event.target);

            if (outsideUserMenu && outsideNotif) {
                setActiveDropdown(null);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const toggleDropdown = (name) => {
        setActiveDropdown(prev => prev === name ? null : name);
    };

    const getInitials = () => {
        if (user && user.first_name && user.last_name) {
            return `${user.first_name[0]}${user.last_name[0]}`.toUpperCase();
        }
        return userId ? userId.substring(0, 2).toUpperCase() : '??';
    };

    const getDisplayName = () => {
        if (user && user.first_name && user.last_name) {
            return `${user.first_name} ${user.last_name}`;
        }
        return userId;
    };

    return (
        <nav className="navbar">
            <div className="navbar-brand">
                <button className="sidebar-toggle" onClick={onToggleSidebar}>
                    <i className="fas fa-bars"></i>
                </button>
                <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <Logo className="w-8 h-8" style={{ width: '32px', height: '32px', color: 'var(--primary-color)' }} />
                    <span>GroupChatGPT</span>
                </Link>
            </div>
            <div className="navbar-links">
                <button onClick={toggleTheme} className="theme-toggle" title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}>
                    {isDarkMode ? '☀️' : '🌙'}
                </button>

                <div ref={notifRef}>
                    <Notifications
                        userId={userId}
                        isOpen={activeDropdown === 'notifications'}
                        onToggle={() => toggleDropdown('notifications')}
                    />
                </div>

                <div className="user-menu" ref={menuRef}>
                    <button
                        className="user-menu-btn"
                        onClick={() => toggleDropdown('user')}
                    >
                        <div className="user-avatar">
                            {getInitials()}
                        </div>
                        <span style={{ fontWeight: 500 }}>{getDisplayName()}</span>
                        <span style={{ fontSize: '0.8rem' }}>▼</span>
                    </button>

                    {activeDropdown === 'user' && (
                        <div className="user-dropdown">
                            <div className="user-dropdown-header">
                                <p>{getDisplayName()}</p>
                                <span>@{user?.username || userId}</span>
                            </div>
                            <Link to="/profile" className="dropdown-item" onClick={() => setActiveDropdown(null)}>
                                👤 Profile
                            </Link>
                            <Link to="/friends" className="dropdown-item" onClick={() => setActiveDropdown(null)}>
                                👥 Friends
                            </Link>
                            <div className="dropdown-divider" style={{ height: '1px', background: 'var(--glass-border)', margin: '0.5rem 0' }}></div>
                            <button onClick={logout} className="dropdown-item danger">
                                🚪 Logout
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </nav>
    );
}

export default Navbar;
