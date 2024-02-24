import React, { useState } from 'react';
import './signup.css'; // Import CSS file for styling

function SignupForm() {
    const [formData, setFormData] = useState({
        firstName: '',
        lastName: '',
        username: '',
        password: '',
        email: '',
        phoneNumber: ''
    });

    const handleChange = (event) => {
        const { id, value } = event.target;
        setFormData(prevState => ({
            ...prevState,
            [id]: value
        }));
    };

    const handleSubmit = (event) => {
        event.preventDefault(); // Prevent the default form submission

        // Perform a POST request using fetch with JSON data
        fetch(process.env.REACT_APP_ENDPOINT + '/signup', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(formData)
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            localStorage.setItem('userId', data.id);
            localStorage.setItem('user', JSON.stringify(data))
            window.location.href = "./";
            console.log(data); // Handle the response data as needed
            // You can redirect the user or perform other actions based on the response
        })
        .catch(error => {
            console.error('There was a problem with the fetch operation:', error);
        });
    };

    return (
        <div className="signup-form-container"> {/* Apply a class to style the container */}
            <h2>User Signup</h2>
            <form className="signup-form" onSubmit={handleSubmit}> {/* Apply a class to style the form */}
                <label htmlFor="firstName">First Name:</label>
                <input type="text" id="firstName" value={formData.firstName} onChange={handleChange} required /><br />

                <label htmlFor="lastName">Last Name:</label>
                <input type="text" id="lastName" value={formData.lastName} onChange={handleChange} required /><br />

                <label htmlFor="username">Username:</label>
                <input type="text" id="username" value={formData.username} onChange={handleChange} required /><br />

                <label htmlFor="password">Password:</label>
                <input type="password" id="password" value={formData.password} onChange={handleChange} required /><br />

                <label htmlFor="email">Email:</label>
                <input type="email" id="email" value={formData.email} onChange={handleChange} required /><br />

                <label htmlFor="phoneNumber">Phone Number:</label>
                <input type="text" id="phoneNumber" value={formData.phoneNumber} onChange={handleChange} required /><br />

                <button type="submit">Submit</button>
            </form>
        </div>
    );
}

export default SignupForm;
