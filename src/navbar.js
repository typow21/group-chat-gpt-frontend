import React from 'react';
import './navbar.css'; // Import the CSS file

function logout(){
    localStorage.clear()
    window.location.href = './login'
}
function checkAuth(){
    let user = localStorage.getItem("user");
    if(user != null){
        return;
    }
    else{
        logout();
    }
}

function Navbar() {
    checkAuth();
    return (
        <nav className="navbar">
            <div className="navbar-brand" onClick={() => window.location.href = './' }>GroupChat GPT</div>
            <div className="navbar-links">
                <a><b>{localStorage.getItem('userId')}</b></a>
                <a onClick={logout}>Logout</a>
            </div>
        </nav>
    );
}

export default Navbar;
