import React, { useState, useEffect, useRef, useCallback } from 'react';
import { FiSettings, FiSave } from 'react-icons/fi';
import { AiOutlineClose } from 'react-icons/ai';
import './App.css';
import moment from 'moment';

function App() {
    const [displayName, setDisplayName] = useState<string | null>(null);
    const [tempDisplayName, setTempDisplayName] = useState('');
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<{ name: string, content: string, timestamp: string }[]>([]);
    const [connectionStatus, setConnectionStatus] = useState<string>(''); // Track connection messages
    const [showSettings, setShowSettings] = useState(false);
    const [nameSavedMessage, setNameSavedMessage] = useState<string | null>(null); // Name saved message
    const [connected, setConnected] = useState<boolean>(false); // Track connected status
    const [sendMessageError, setSendMessageError] = useState<string | null>(null); // Error for sending message
    const [roomName, setRoomName] = useState('DefaultRoom'); // Room name for joining a chat room
    const wsRef = useRef<WebSocket | null>(null);
    const retryInterval = useRef<NodeJS.Timeout | null>(null);
    const messagesContainerRef = useRef<HTMLDivElement | null>(null); // Ref for the messages container

    const retryDelay = 5000; // Delay in milliseconds between retry attempts

    const connectWebSocket = useCallback(() => {
        const attemptReconnect = () => {
            retryInterval.current = setTimeout(() => {
                connectWebSocket(); // Retry connection
            }, retryDelay);
        };

        if (wsRef.current && (wsRef.current.readyState === WebSocket.OPEN || wsRef.current.readyState === WebSocket.CONNECTING)) {
            return; // Don't reconnect if it's already open or connecting
        }

        setConnectionStatus('Connecting to WebSocket...');
        const ws = new WebSocket('ws://localhost:8080/chat');
        wsRef.current = ws;

        ws.onopen = () => {
            setConnectionStatus('Connected');
            setConnected(true);

            // Send the room join message once connected
            ws.send(`JOIN|${roomName}|${displayName}`);  // Send display name with room join

            // Clear the message log when joining a new room
            setMessages([]);  // Clear previous messages when joining a new room

            if (retryInterval.current) {
                clearTimeout(retryInterval.current); // Clear retry interval if connected
                retryInterval.current = null;
            }

            // Remove the "Connected" message after 5 seconds
            setTimeout(() => {
                setConnectionStatus('');
            }, 5000);
        };

        ws.onmessage = (event) => {
            const data = event.data.split('|');
            const [userName, content] = data;  // The server sends "userName|message"
            const timestamp = new Date().toISOString();
            setMessages((prevMessages) => [...prevMessages, { name: userName, content, timestamp }]);
        };

        ws.onerror = () => {
            setConnectionStatus('WebSocket error occurred');
            ws.close(); // Ensure the WebSocket closes to allow retries
        };

        ws.onclose = () => {
            setConnectionStatus('WebSocket connection closed. Retrying in a few seconds...');
            setConnected(false); // Update the connection indicator
            attemptReconnect(); // Call the retry function
        };
    }, [roomName, displayName]);

    useEffect(() => {
        connectWebSocket(); // Connect on mount

        return () => {
            if (wsRef.current) {
                wsRef.current.close(); // Close WebSocket on unmount
            }
            if (retryInterval.current) {
                clearTimeout(retryInterval.current); // Clear retry interval on unmount
            }
        };
    }, [connectWebSocket]);

    // Scroll to the bottom of the messages
    const scrollToBottom = useCallback(() => {
        if (messagesContainerRef.current) {
            messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
        }
    }, []);

    useEffect(() => {
        scrollToBottom(); // Scroll whenever messages change
    }, [messages, scrollToBottom]);

    const sendMessage = () => {
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN && message.trim() && displayName) {
            const formattedMessage = `MESSAGE|${roomName}|${message}`;  // Send message in "MESSAGE|roomName|message" format
            wsRef.current.send(formattedMessage);
            setMessage(''); // Clear the input after sending
            setSendMessageError(null); // Clear any previous error after successful sending
        } else {
            setSendMessageError('WebSocket is not open. Cannot send the message.');
            setTimeout(() => {
                setSendMessageError(null); // Automatically remove error after 5 seconds
            }, 5000);
        }
    };

    const toggleSettings = () => {
        if (tempDisplayName.trim()) {
            setDisplayName(tempDisplayName);
            setNameSavedMessage('Display name saved!'); // Show saved message
            setTimeout(() => setNameSavedMessage(null), 3000); // Hide message after 3 seconds
        }
        setShowSettings(!showSettings);
    };

    const handleDisplayNameSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && tempDisplayName.trim()) {
            setDisplayName(tempDisplayName);
            setNameSavedMessage('Display name saved!'); // Show saved message
            setTimeout(() => setNameSavedMessage(null), 3000); // Hide message after 3 seconds
            setShowSettings(false);
        }
    };

    if (!displayName) {
        return (
            <div className="App">
                <div className="flex items-center justify-center min-h-screen bg-black">
                    <div className="w-96 bg-black border border-green-500 rounded-lg shadow-lg p-4">
                        <h1 className="text-green-500 text-center font-bold mb-4">Enter Display Name</h1>
                        <input
                            type="text"
                            value={tempDisplayName}
                            onChange={(e) => setTempDisplayName(e.target.value)}
                            onKeyDown={handleDisplayNameSubmit}
                            className="w-full bg-black text-green-500 font-mono p-2 rounded-md focus:outline-none placeholder-green-500"
                            placeholder="Enter your display name..."
                        />
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="App">
            <div className="flex items-center justify-center min-h-screen bg-black">
                <div className="w-96 h-96 bg-black border border-green-500 rounded-lg shadow-lg flex flex-col overflow-hidden relative">
                    <div className="bg-black text-green-500 text-center py-1 font-bold border-b border-green-500 flex justify-between items-center px-2">
                        <div className="flex gap-2 items-center">
                            <span>EDB Terminal v0.2</span>
                            <span
                                className={`inline-block w-3 h-3 rounded-full ${
                                    connected ? 'bg-green-500' : 'bg-red-500'
                                }`}
                                title={connected ? 'Online' : 'Offline'}
                            ></span>
                        </div>
                        <FiSettings onClick={toggleSettings} className="text-green-500 cursor-pointer" />
                    </div>

                    {showSettings && (
                        <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-90 flex flex-col z-10">
                            <div className="bg-black text-green-500 text-center py-1 font-bold border-b border-green-500 flex justify-between items-center px-2">
                                <span>Settings</span>
                                <AiOutlineClose onClick={toggleSettings} className="text-green-500 cursor-pointer" />
                            </div>

                            <div className="flex-1 flex flex-col items-center p-4">
                                <div className="w-full flex justify-start items-center">
                                    <span className="text-green-500">Display Name:</span>
                                </div>
                                <input
                                    type="text"
                                    value={tempDisplayName}
                                    onChange={(e) => setTempDisplayName(e.target.value)}
                                    onKeyDown={handleDisplayNameSubmit}
                                    className="w-full bg-black text-green-500 font-mono p-2 border border-green-500 rounded-md focus:outline-none placeholder-green-500 mt-2"
                                    placeholder="Update display name..."
                                />
                                <div className="flex items-center justify-center mt-2">
                                    <FiSave className="text-green-500 cursor-pointer" onClick={toggleSettings} />
                                </div>
                                {nameSavedMessage && (
                                    <div className="text-green-500 mt-2">
                                        {nameSavedMessage}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    <div className="flex flex-col p-2 border-b border-green-500">
                        <input
                            type="text"
                            value={roomName}
                            onChange={(e) => setRoomName(e.target.value)}
                            className="w-full bg-black text-green-500 font-mono p-2 rounded-md focus:outline-none placeholder-green-500"
                            placeholder="Enter room name..."
                        />
                        <button className="text-green-500 mt-2" onClick={connectWebSocket}>Join Room</button>
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
                            <div key={index} className="flex flex-col text-left">
                                <span className="text-green-300">{moment(msg.timestamp).format('DD-MM-YYYY HH:mm')}</span>
                                <span><strong>{msg.name}:</strong> {msg.content}</span>
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
            </div>
        </div>
    );
}

export default App;
