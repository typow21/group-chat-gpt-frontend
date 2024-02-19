import React, { useState } from 'react';

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
        fetch('http://192.168.1.162:8000/login', {
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
        <div>
            <h2>User Login</h2>
            <form>
                <label htmlFor="username">Username:</label>
                <input type="text" id="username" value={username} onChange={handleUsernameChange} required /><br />

                <label htmlFor="password">Password:</label>
                <input type="password" id="password" value={password} onChange={handlePasswordChange} required /><br />

                <button type="button" onClick={handleLogin}>Login</button>
            </form>
            <button onClick={() => window.location.href = './signup.html'}>Sign up</button>
        </div>
    );
}

export default LoginForm;
