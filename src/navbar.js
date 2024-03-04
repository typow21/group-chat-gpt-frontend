import React from 'react';
import { Link } from 'react-router-dom';
import './navbar.css'; // Import the CSS file

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

    return (
        <nav className="navbar">
            <div className="navbar-brand">
                <Link to="/">GroupGPT</Link>
            </div>
            <div className="navbar-links">
                <p><b>{localStorage.getItem('userId')}</b></p>
                <button onClick={logout}>Logout</button>
            </div>
        </nav>
    );
}

export default Navbar;
