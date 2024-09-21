import React, { useState, useEffect } from 'react';
import { FiSettings } from 'react-icons/fi';
import { AiOutlineClose } from 'react-icons/ai';
import './App.css';
import moment from 'moment';

function App() {
    const [displayName, setDisplayName] = useState<string | null>(null); // Holder styr på displaynavn
    const [tempDisplayName, setTempDisplayName] = useState(''); // Midlertidig værdi til displaynavn under ændring
    const [message, setMessage] = useState(''); // Brugerens besked
    const [messages, setMessages] = useState<{ name: string, content: string, timestamp: string }[]>([]); // Liste over modtagede beskeder
    const [socket, setSocket] = useState<WebSocket | null>(null); // WebSocket-forbindelse
    const [showSettings, setShowSettings] = useState(false); // Toggler visning af indstillinger

    useEffect(() => {
        const ws = new WebSocket('ws://localhost:8080/chat');
        setSocket(ws);

        // Når der modtages en besked fra serveren, tilføjes den til listen
        ws.onmessage = (event) => {
            const data = event.data.split('|');
            const [name, timestamp, , content] = data;
            setMessages((prevMessages) => [...prevMessages, { name, content, timestamp }]);
        };

        // Luk WebSocket-forbindelse ved unmount
        return () => {
            ws.close();
        };
    }, []);

    // Funktion til at sende besked via WebSocket
    const sendMessage = () => {
        if (socket && message.trim() && displayName) {
            const timestamp = new Date().toISOString();
            const formattedMessage = `${displayName}|${timestamp}|TEXT|${message}`;
            socket.send(formattedMessage);
            setMessage(''); // Ryd inputfeltet efter afsendelse
        }
    };

    // Funktion til at vise/skjule indstillinger og gemme displaynavn
    const toggleSettings = () => {
        if (tempDisplayName.trim()) {
            setDisplayName(tempDisplayName);
        }
        setShowSettings(!showSettings);
    };

    // Gemmer displaynavn, når brugeren trykker Enter
    const handleDisplayNameSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && tempDisplayName.trim()) {
            setDisplayName(tempDisplayName);
            setShowSettings(false); // Luk settings efter gemt displaynavn
        }
    };

    // Hvis brugeren ikke har valgt et displayname endnu
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
                            onKeyDown={handleDisplayNameSubmit} // Gem displayname, når Enter trykkes
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
                <div className="w-96 bg-black border border-green-500 rounded-lg shadow-lg flex flex-col overflow-hidden relative">
                    {/* Topbar for EDB Terminal */}
                    <div className="bg-black text-green-500 text-center py-1 font-bold border-b border-green-500 flex justify-between items-center px-2">
                        <span>EDB Terminal Beta v0.1</span>
                        <FiSettings onClick={toggleSettings} className="text-green-500 cursor-pointer" /> {/* Settings ikon */}
                    </div>

                    {/* Indstillinger */}
                    {showSettings && (
                        <div className="absolute top-0 left-0 w-full h-full bg-black bg-opacity-90 flex flex-col z-10">
                            {/* Topbar for Settings */}
                            <div className="bg-black text-green-500 text-center py-1 font-bold border-b border-green-500 flex justify-between items-center px-2">
                                <span>Settings</span>
                                <AiOutlineClose onClick={toggleSettings} className="text-green-500 cursor-pointer" /> {/* Close ikon */}
                            </div>

                            <div className="flex-1 flex flex-col justify-center items-center p-4">
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
                            </div>
                        </div>
                    )}

                    {/* Chat beskeder */}
                    <div className="flex-1 p-4 space-y-4 overflow-y-auto text-green-500 font-mono text-sm bg-black">
                        {messages.map((msg, index) => (
                            <div key={index} className="flex flex-col mb-2 text-left">
                                <span className="text-green-300">{moment(msg.timestamp).format('DD-MM-YYYY HH:mm')}</span> {/* Forkortet datoformat */}
                                <span><strong>{msg.name}:</strong> {msg.content}</span> {/* Displayname: Message */}
                            </div>
                        ))}
                    </div>

                    {/* Input felt til beskeder */}
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
