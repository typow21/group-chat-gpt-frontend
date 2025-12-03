import React, { useState, useEffect } from 'react';
import { authFetch } from './api';

function RoomDetails() {
    const [roomId, setRoomId] = useState(null);
    const [myTypingInd, setMyTypingInd] = useState(false);
    const [isInRoom, setIsInRoom] = useState(null);
    const [socket, setSocket] = useState(null);

    useEffect(() => {
        const userId = localStorage.getItem('userId');
        const selectedRoomId = localStorage.getItem('selectedRoomId');

        const newSocket = new WebSocket(`ws://0.0.0.0:8000/ws/${userId}/${selectedRoomId}`);
        setSocket(newSocket);

        setRoomId(selectedRoomId);
        setMyTypingInd(false);
        setIsInRoom(localStorage.getItem('isInRoom'));
        fetchRoomDetails();

        return () => {
            newSocket.close();
        };
    }, []);

    useEffect(() => {
        if (!socket) return;

        const handleInput = (event) => {
            if (!myTypingInd) {
                const body = JSON.stringify({ roomId, username: localStorage.getItem('userId'), message: 'typing...' });
                socket.send(body);
            }
            setMyTypingInd(true);
            if (event.data.includes('@')) {
                document.getElementById('messageInput').value = '@chatgpt ';
            }
        };

        document.getElementById('messageInput').addEventListener('input', handleInput);

        return () => {
            document.getElementById('messageInput').removeEventListener('input', handleInput);
        };
    }, [socket, myTypingInd, roomId]);

    useEffect(() => {
        const ws = new WebSocket(`ws://0.0.0.0:8000/graphql`);

        ws.addEventListener('open', (event) => {
            const subscriptionQuery = `
                subscription Chat {
                    messages(roomId: "${localStorage.getItem('selectedRoomId')}") {
                        id
                        message
                        username
                    }
                }
            `;

            ws.send(JSON.stringify({ type: 'subscription_start', payload: { query: subscriptionQuery } }));

            setIsInRoom(localStorage.getItem('isInRoom'));
            if (!isInRoom) {
                const username = localStorage.getItem('userId') || prompt('Enter your username:');
                localStorage.setItem('username', username);
                socket.send(JSON.stringify({ roomId, username, message: 'joined the chat.' }));
            }
            localStorage.setItem('isInRoom', true);
        });

        ws.addEventListener('message', (event) => {
            const messagesDiv = document.getElementById('messages');
            const typingIndicator = document.getElementById('typingIndicator');
            const data = JSON.parse(event.data);
            const message = data.message;
            const username = data.username;
            const isSentByMe = data.username === localStorage.getItem('userId');
            const isTyping = data.message.includes('typing...');

            if (isTyping && isSentByMe) return;

            if (isTyping) {
                typingIndicator.textContent = `${username} is typing...`;
                return;
            }

            if (isSentByMe) {
                addSentMessageToScreen(message);
            } else {
                addMessageDivToScreen(`<div class="received-user"><p>${username}</p></div><div class="received-message"><p>${message}</p></div>`);
            }
        });

        ws.addEventListener('close', (event) => {
            console.log('WebSocket closed:', event);
        });

        return () => {
            ws.close();
        };
    }, [socket, isInRoom]);

    const handleKeyPress = (event) => {
        if (event.key === 'Enter') {
            sendMessage();
        }
    };

    const addMessageDivToScreen = (messageDiv) => {
        const messagesDiv = document.getElementById('messages');
        messagesDiv.innerHTML += `${messageDiv}`;
        messagesDiv.innerHTML += `<div class="message"></div>`;
        messagesDiv.scrollTop = messagesDiv.scrollHeight;
        document.getElementById('typingIndicator').textContent = '';
        const existingSpacer = document.querySelector('.message-spacer');
        if (existingSpacer) {
            existingSpacer.remove();
        }

        const spacerElement = document.createElement('div');
        spacerElement.className = 'message-spacer';
        messagesDiv.appendChild(spacerElement);
    };

    const addSentMessageToScreen = (message) => {
        addMessageDivToScreen(`<div class="sent-message"><p>${message}</p></div>`);
    };

    const sendMessage = () => {
        const selectedRoomId = localStorage.getItem('selectedRoomId');
        if (!selectedRoomId) {
            console.error('Room ID not found in local storage.');
            return;
        }

        let senderId = localStorage.getItem('userId');
        if (!senderId) {
            console.error('User ID not found in local storage.');
            senderId = prompt('Enter your user ID:');
        }

        if (!senderId) {
            console.error('User ID is required.');
            return;
        }

        const content = document.getElementById('messageInput').value.trim();
        if (!content) {
            console.error('Message content is required.');
            return;
        }

        document.getElementById('messageInput').value = '';

        const payload = {
            roomId: selectedRoomId,
            senderId: senderId,
            content: content,
        };

        setMyTypingInd(false);
        socket.send(JSON.stringify({ roomId: localStorage.getItem('selectedRoomId'), username: senderId, message: content }));
    };

    const fetchRoomDetails = () => {
        const selectedRoomId = localStorage.getItem('selectedRoomId');
        if (!selectedRoomId) {
            console.error('Room ID not found in local storage.');
            return;
        }

        authFetch(`${process.env.REACT_APP_ENDPOINT}/room/${selectedRoomId}`)
            .then(async (response) => {
                if (!response.ok) {
                    const text = await response.text().catch(() => '');
                    throw new Error(text || `Request failed: ${response.status}`);
                }
                return response.json();
            })
            .then((data) => {
                displayRoomDetails(data);
            })
            .catch((error) => {
                console.error('There was a problem with the fetch operation:', error);
            });
    };

    const displayRoomDetails = (room) => {
        const detailsDiv = document.getElementById('details');
        const descriptionDiv = document.getElementById('description');
        const creatorDiv = document.getElementById('creator');
        const usersDiv = document.getElementById('users');
        const assistantsDiv = document.getElementById('assistants');

        detailsDiv.innerHTML = '<strong>Name:</strong> ' + room.name + '<br><strong>Description:</strong> ' + room.description + '<br><strong>Creator:</strong> ' + room.creator.username + '<br><strong>Users:</strong> ' + Object.values(room.users)
            .map((user) => user.username)
            .join(', ');

        descriptionDiv.textContent = 'Description: ' + room.description;
        creatorDiv.textContent = 'Creator: ' + room.creator.username;
        usersDiv.textContent = 'Users: ' + Object.values(room.users)
            .map((user) => user.username)
            .join(', ');
        assistantsDiv.textContent = 'assistants: ' + room.assistants.join(', ');

        if (room.messages.length > 0) {
            const messagesHtml = document.getElementById('messages');
            room.messages.forEach((message) => {
                if (message.sender === localStorage.getItem('userId')) {
                    addSentMessageToScreen(message.content);
                } else {
                    addMessageDivToScreen(`<div class="received"><div class="received-user"><p>${message.sender}</p></div><div class="received-message"><p>${message.content}</p></div></div>`);
                }
            });
        }
    };

    const toggleRoomDetailsIcon = () => {
        const details = document.getElementById('details');
        const description = document.getElementById('description');
        const creator = document.getElementById('creator');
        const users = document.getElementById('users');
        const icon = document.getElementById('roomDetailsIcon');

        if (details.style.display === 'none') {
            const roomDetails = document.getElementById('roomDetails').className = 'roomHighlighted';
            details.style.display = 'block';
            description.style.display = 'block';
            creator.style.display = 'block';
            users.style.display = 'block';
            icon.innerHTML = '❌';
        } else {
            const roomDetails = document.getElementById('roomDetails').className = '';
            details.style.display = 'none';
            description.style.display = 'none';
            creator.style.display = 'none';
            users.style.display = 'none';
            icon.innerHTML = 'ℹ️';
        }
    };

    const addUserToChat = () => {
        const selectedRoomId = localStorage.getItem('selectedRoomId');
        if (!selectedRoomId) {
            console.error('Room ID not found in local storage.');
            return;
        }

        const username = prompt('Enter the username to add to the chat:');
        if (!username) {
            console.error('Username is required.');
            return;
        }

        const payload = {
            username: username,
            roomId: selectedRoomId,
        };

        authFetch(`${process.env.REACT_APP_ENDPOINT}/share-room`, {
            method: 'POST',
            body: JSON.stringify(payload),
        })
            .then(async (response) => {
                if (!response.ok) {
                    const text = await response.text().catch(() => '');
                    throw new Error(text || `Request failed: ${response.status}`);
                }
                return response.json();
            })
            .then((data) => {
                if (data.error) {
                    console.error('Share room error:', data.error);
                    if (data.redirect) {
                        window.location.href = data.redirect;
                    }
                } else {
                    fetchRoomDetails();
                }
            })
            .catch((error) => {
                console.error('There was a problem with the fetch operation:', error);
            });
    };

    const logout = () => {
        // Implement your logout logic here
    };

    return (
        <div>
            <div id="roomDetails">
                <div className="title" onClick={() => window.location.href = './index.html'}>Group Chat GPT</div>
                <button id="addUserButton" onClick={addUserToChat}>Add User to Chat</button>
                <div id="details"></div>
                <p id="description"></p>
                <p id="creator"></p>
                <p id="users"></p>
                <p id="assistants"></p>
                <div className="user-info">
                    <span id="username">Username</span>
                    <button id="logoutButton" onClick={logout}>Logout</button>
                </div>
            </div>
            <div className="container">
                <div id="messages"></div>
                <div id="input-container">
                    <p id="typingIndicator"></p>
                    <div id="messageInputContainer">
                        <input type="text" id="messageInput" placeholder="Add @chatgpt to interact with ChatGPT" style={{ borderStyle: 'none', borderColor: 'Transparent', overflow: 'auto' }} />
                        <button id="sendMessageButton" onClick={sendMessage}>Send Message</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default RoomDetails;
