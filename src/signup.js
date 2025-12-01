import React, { useState } from 'react';
import './signup.css'; // Import CSS file for styling
import Logo from './LogoComponent';

function SignupForm() {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        username: '',
        password: '',
        email: '',
        phoneNumber: ''
    });
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (event) => {
        const { id, value } = event.target;
        setFormData(prevState => ({
            ...prevState,
            [id]: value
        }));
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setIsLoading(true);

        try {
            const response = await fetch(process.env.REACT_APP_ENDPOINT + '/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(formData)
            });

            if (!response.ok) {
                throw new Error('Network response was not ok');
            }

            const data = await response.json();
            localStorage.setItem('userId', data.id);
            localStorage.setItem('user', JSON.stringify(data));
            window.location.href = "./";
        } catch (error) {
            console.error('There was a problem with the fetch operation:', error);
            alert('Signup failed. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="signup-page">
            <div className="signup-form-container glass-panel fade-in">
                <div className="signup-header">
                    <Logo style={{ width: '64px', height: '64px', color: 'var(--primary-color)', marginBottom: '1rem' }} />
                    <h1 className="text-gradient">Join GroupChatGPT</h1>
                    <p>Create your account to start chatting</p>
                </div>

                <form className="signup-form" onSubmit={handleSubmit}>
                    <div className="form-row">
                        <div className="form-group">
                            <label htmlFor="firstName">First Name</label>
                            <input
                                type="text"
                                id="firstName"
                                value={formData.firstName}
                                onChange={handleChange}
                                required
                                autoComplete="given-name"
                            />
                        </div>
                        <div className="form-group">
                            <label htmlFor="lastName">Last Name</label>
                            <input
                                type="text"
                                id="lastName"
                                value={formData.lastName}
                                onChange={handleChange}
                                required
                                autoComplete="family-name"
                            />
                        </div>
                    </div>

                    <div className="form-group">
                        <label htmlFor="username">Username</label>
                        <input
                            type="text"
                            id="username"
                            value={formData.username}
                            onChange={handleChange}
                            required
                            autoComplete="username"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="email">Email</label>
                        <input
                            type="email"
                            id="email"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            autoComplete="email"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="phoneNumber">Phone Number</label>
                        <input
                            type="tel"
                            id="phoneNumber"
                            value={formData.phoneNumber}
                            onChange={handleChange}
                            required
                            autoComplete="tel"
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="password">Password</label>
                        <input
                            type="password"
                            id="password"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            autoComplete="new-password"
                        />
                    </div>

                    <button
                        type="submit"
                        className="submit-btn"
                        disabled={isLoading}
                    >
                        {isLoading ? 'Creating Account...' : 'Sign Up'}
                    </button>

                    <div className="form-footer">
                        <p>Already have an account? <a href="./login">Log in</a></p>
                    </div>
                </form>
            </div>
        </div>
    );
}

export default SignupForm;
