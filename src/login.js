import React, { useState } from 'react';
import './login.css'; // Import CSS file for styling

function LoginForm() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');

    const handleUsernameChange = (event) => {
        setUsername(event.target.value);
    };

    const handlePasswordChange = (event) => {
        setPassword(event.target.value);
    };

    const handleLogin = () => {
        // Perform a POST request using fetch with JSON data
        fetch(process.env.REACT_APP_ENDPOINT + '/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if ("error" in data) {
                alert(data.error);
            } else {
                // Save the user ID to local storage
                localStorage.setItem('userId', data.id);
                localStorage.setItem('user', data);

                // Redirect to index.html
                window.location.href = './';
            }
        })
        .catch(error => {
            console.error('There was a problem with the fetch operation:', error);
        });
    };

    return (
        <div className="login-form-container"> {/* Apply a class to style the container */}
            <h2>User Login</h2>
            <form className="login-form"> {/* Apply a class to style the form */}
                <label htmlFor="username">Username:</label>
                <input type="text" id="username" value={username} onChange={handleUsernameChange} required /><br />

                <label htmlFor="password">Password:</label>
                <input type="password" id="password" value={password} onChange={handlePasswordChange} required /><br />

                <button id= "login-btn" type="button" onClick={handleLogin}>Login</button>
                <button id ="signup-btn" type="button" onClick={() => window.location.href = './signup'}>Sign up</button>
            </form>
            
        </div>
    );
}

export default LoginForm;
