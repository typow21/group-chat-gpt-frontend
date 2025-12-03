import React, { useState } from 'react';
import './login.css'; // Import CSS file for styling
import Logo from './LogoComponent';

function LoginForm() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleUsernameChange = (event) => {
        setUsername(event.target.value);
    };

    const handlePasswordChange = (event) => {
        setPassword(event.target.value);
    };

    const handleLogin = async (e) => {
        if (e) e.preventDefault();
        setIsLoading(true);

        try {
            const response = await fetch(process.env.REACT_APP_ENDPOINT + '/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password })
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();

            if ("error" in data) {
                setError(data.error);
            } else {
                // Expect backend: { user: {...}, token: "..." }
                const { user, token } = data || {};
                if (!token) {
                    console.warn('Login succeeded but no token returned.');
                }
                // Store userId - use id from user object, or username as fallback
                const userId = user?.id || user?.username || username;
                localStorage.setItem('userId', userId);
                localStorage.setItem('user', JSON.stringify({ ...user, token }));
                localStorage.setItem('firstName', user?.first_name || '');
                if (token) {
                    localStorage.setItem('token', token);
                }
                window.location.href = './';
            }
        } catch (error) {
            console.error('There was a problem with the fetch operation:', error);
            setError('Login failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-form-container glass-panel fade-in">
                <div className="login-header">
                    <Logo style={{ width: '64px', height: '64px', color: 'var(--primary-color)', marginBottom: '1rem' }} />
                    <h1 className="text-gradient">GroupChatGPT</h1>
                    <p>Enter your credentials to access the chat</p>
                </div>

                <form className="login-form" onSubmit={handleLogin}>
                    {error && <div className="auth-error">{error}</div>}
                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={handleUsernameChange}
                            placeholder="Enter your username"
                            required
                            autoComplete="username"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={password}
                            onChange={handlePasswordChange}
                            placeholder="Enter your password"
                            required
                            autoComplete="current-password"
                        />
                    </div>

                    <button
                        id="login-btn"
                        type="submit"
                        disabled={isLoading}
                        className={isLoading ? 'loading' : ''}
                    >
                        {isLoading ? 'Logging in...' : 'Login'}
                    </button>

                    <div className="divider">
                        <span>or</span>
                    </div>

                    <button
                        id="signup-btn"
                        type="button"
                        onClick={() => window.location.href = './signup'}
                    >
                        Create an account
                    </button>
                </form>
            </div>
        </div>
    );
}

export default LoginForm;
