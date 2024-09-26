import React, { useState, useEffect, useRef, useCallback } from 'react';
import PocketBase from 'pocketbase';
import './App.css';
import moment from 'moment';

const pb = new PocketBase('http://127.0.0.1:8090'); // PocketBase server URL

function App() {
    const [clientId, setClientId] = useState<string | null>(null);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoginForm, setIsLoginForm] = useState(true);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [sendMessageError, setSendMessageError] = useState<string | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<{ clientId: string, timestamp: string, messageType: string, content: string }[]>([]);
    const [connectionStatus, setConnectionStatus] = useState<string>('');
    const [connected, setConnected] = useState<boolean>(false);
    const [roomName, setRoomName] = useState('Room1');
    const [roomChanged, setRoomChanged] = useState<boolean>(false);
    const rooms = ['Room1', 'Room2', 'Room3', 'Room4', 'Room5'];
    const wsRef = useRef<WebSocket | null>(null);
    const retryInterval = useRef<NodeJS.Timeout | null>(null);
    const messagesContainerRef = useRef<HTMLDivElement | null>(null);
    const retryDelay = 5000;

    const connectWebSocket = useCallback(() => {
        const attemptReconnect = () => {
            retryInterval.current = setTimeout(() => {
                connectWebSocket();
            }, retryDelay);
        };

        if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
            return;
        }

        setConnectionStatus('Connecting to WebSocket...');
        const ws = new WebSocket('ws://localhost:8080/chat');
        wsRef.current = ws;

        ws.onopen = () => {
            setConnectionStatus('Connected');
            setConnected(true);

            if (clientId) {
                ws.send(`JOIN|${roomName}|${clientId}`);
            }

            if (roomChanged) {
                setMessages([]);
                setRoomChanged(false);
            }

            if (retryInterval.current) {
                clearTimeout(retryInterval.current);
                retryInterval.current = null;
            }

            setTimeout(() => {
                setConnectionStatus('');
            }, 5000);
        };

        ws.onmessage = (event) => {
            const data = event.data.split('|');
            if (data.length === 4) {
                const [clientId, timestamp, messageType, content] = data;
                setMessages((prevMessages) => [...prevMessages, { clientId, timestamp, messageType, content }]);
            }
        };

        ws.onerror = () => {
            setConnectionStatus('WebSocket error occurred');
            ws.close();
        };

        ws.onclose = () => {
            setConnectionStatus('WebSocket connection closed. Retrying in a few seconds...');
            setConnected(false);
            attemptReconnect();
        };
    }, [roomName, clientId, roomChanged]);

    useEffect(() => {
        connectWebSocket();

        return () => {
            if (wsRef.current) {
                wsRef.current.close();
            }
            if (retryInterval.current) {
                clearTimeout(retryInterval.current);
            }
        };
    }, [connectWebSocket]);

    const scrollToBottom = useCallback(() => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    }, []);

    useEffect(() => {
        scrollToBottom();
    }, [messages, scrollToBottom]);

    const containsEmoji = (message: string) => {
        const emojiRegex = /(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/gu;
        return emojiRegex.test(message);
    };

    const sendMessage = () => {
        if (!message.trim()) {
            setMessage('');
            return;
        }

        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && clientId) {
            const timestamp = moment().format('YYYY-MM-DD HH:mm:ss');
            const messageType = containsEmoji(message) ? 'EMOJI' : 'TEXT';

            const formattedMessage = `${clientId}|${timestamp}|${messageType}|${message}`;
            wsRef.current.send(formattedMessage);
        }

        setMessage('');
    };

    const handleJoinRoom = (room: string) => {
        setRoomName(room);
        setRoomChanged(true);

        if (clientId && wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
            wsRef.current.send(`JOIN|${room}|${clientId}`);
            setMessages([]);
        }
    };

    const registerUser = async () => {
        if (password.length < 8) {
            setErrorMessage('Password must be at least 8 characters long');
            return;
        }

        try {
            const user = await pb.collection('users').create({
                email,
                password,
                passwordConfirm: password,
            });
            setClientId(user.id);
            setIsLoggedIn(true);
        } catch (error) {
            console.error('Registration error:', error);
            setErrorMessage('Registration failed');
        }
    };

    const loginUser = async () => {
        if (password.length < 8) {
            setErrorMessage('Password must be at least 8 characters long');
            return;
        }

        try {
            const authData = await pb.collection('users').authWithPassword(email, password);
            setClientId(authData.record.id);
            setIsLoggedIn(true);
        } catch (error) {
            console.error('Login error:', error);
            setErrorMessage('Login failed');
        }
    };

    const toggleForm = () => {
        setIsLoginForm(!isLoginForm);
        setErrorMessage(null);
    };

    const handleMessageClick = (clickedClientId: string) => {
        if (clickedClientId !== clientId) {
            setMessage(`/msg ${clickedClientId} `);
        }
    };

    if (!isLoggedIn) {
        return (
            <div className="App">
                <div className="flex items-center justify-center min-h-screen bg-black">
                    <div className="w-96 bg-black border border-green-500 rounded-lg shadow-lg p-4">
                        <h1 className="text-green-500 text-center font-bold mb-4">{isLoginForm ? 'Login' : 'Register'}</h1>
                        <input
                            type="text"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full bg-black text-green-500 font-mono p-2 rounded-md focus:outline-none placeholder-green-500"
                            placeholder="Enter email..."
                        />
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-black text-green-500 font-mono p-2 rounded-md focus:outline-none placeholder-green-500 mt-2"
                            placeholder="Enter password..."
                        />
                        <button
                            onClick={isLoginForm ? loginUser : registerUser}
                            className="w-full bg-green-500 text-black p-2 rounded-md mt-4"
                        >
                            {isLoginForm ? 'Login' : 'Register'}
                        </button>
                        <button onClick={toggleForm} className="w-full text-green-500 mt-2">
                            {isLoginForm ? 'Need to register?' : 'Already have an account?'}
                        </button>
                        {errorMessage && <div className="text-red-500 mt-2">{errorMessage}</div>}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="App">
            <div className="flex items-center justify-center min-h-screen bg-black">
                <div className="flex flex-row w-[800px] h-[290px] bg-black border border-green-500 rounded-lg shadow-lg overflow-hidden relative">
                    <div className="flex-1 bg-black border-r border-green-500 flex flex-col">
                        <div className="bg-black text-green-500 text-center py-1 font-bold border-b border-green-500 flex justify-between items-center px-2">
                            <div className="flex gap-2 items-center">
                                <span>EDB Terminal v0.2</span>
                                <span
                                    className={`inline-block w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}
                                    title={connected ? 'Online' : 'Offline'}
                                ></span>
                            </div>
                        </div>

                        {connectionStatus && (
                            <div className={`text-center p-4 ${connected ? 'text-green-500' : 'text-red-500'}`}>
                                {connectionStatus}
                            </div>
                        )}

                        {sendMessageError && (
                            <div className="text-red-500 text-center p-2">
                                {sendMessageError}
                            </div>
                        )}

                        <div
                            className="flex-1 flex flex-col gap-4 p-4 overflow-y-auto text-green-500 font-mono text-sm bg-black custom-scrollbar"
                            ref={messagesContainerRef}
                        >
                            {messages.map((msg, index) => (
                                <div
                                    key={index}
                                    className="flex flex-col text-left cursor-pointer"
                                    onClick={() => handleMessageClick(msg.clientId)}
                                >
                                    <span className="text-green-300">{moment(msg.timestamp).format('YYYY-MM-DD HH:mm:ss')}</span>
                                    {/* Apply different colors for unicast vs regular messages */}
                                    {msg.messageType === 'unicast' ? (
                                        <span className="text-orange-500">
                                            <strong>{msg.content}</strong>
                                        </span>
                                    ) : (
                                        <span className="text-green-500">
                                            <strong>{msg.clientId}: </strong>{msg.content}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                        <div className="bg-black p-2 border-t border-green-500">
                            <input
                                type="text"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter') sendMessage();
                                }}
                                className="w-full bg-black text-green-500 font-mono p-2 rounded-md focus:outline-none placeholder-green-500"
                                placeholder="Enter message..."
                            />
                        </div>
                    </div>

                    <div className="w-48 bg-black max-h-[600px] border-l border-green-500 flex flex-col">
                        <div className="bg-black text-green-500 text-center py-1 font-bold border-b border-green-500">
                            <span>Rooms</span>
                        </div>
                        <div className="flex flex-col p-2 gap-2 flex-grow">
                            {rooms.map((room, index) => (
                                <button
                                    key={index}
                                    onClick={() => handleJoinRoom(room)}
                                    className={`text-left p-2 rounded-md ${
                                        room === roomName ? 'bg-green-500' : 'bg-black text-green-500 border border-green-500'
                                    }`}
                                >
                                    {room}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default App;
