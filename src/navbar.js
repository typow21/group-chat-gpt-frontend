import React from 'react';
import { Link } from 'react-router-dom';
import './navbar.css';
import { useTheme } from './ThemeContext';
import Notifications from './notifications';

function logout() {
    localStorage.clear();
    window.location.href = '/login';
}

function checkAuth() {
    const user = localStorage.getItem("user");
    if (!user) {
        logout();
    }
}

function Navbar() {
    checkAuth();
    const { isDarkMode, toggleTheme } = useTheme();
    const userId = localStorage.getItem('userId');

    return (
        <nav className="navbar">
            <div className="navbar-brand">
                <Link to="/">GroupGPT</Link>
            </div>
            <div className="navbar-links">
                <button onClick={toggleTheme} className="theme-toggle" title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}>
                    {isDarkMode ? '☀️' : '🌙'}
                </button>
                <Notifications userId={userId} />
                <Link to="/friends" className="nav-link">Friends</Link>
                <p><b>{userId}</b></p>
                <button onClick={logout}>Logout</button>
            </div>
        </nav>
    );
}

export default Navbar;
