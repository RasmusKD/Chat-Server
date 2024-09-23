package com.example.demo;

import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class ChatWebSocketHandler extends TextWebSocketHandler {

    // HashMap to store the chat rooms and the sessions in each room
    private Map<String, List<WebSocketSession>> chatRooms = new HashMap<>();
    // Map to track which room each session is in
    private Map<WebSocketSession, String> sessionRoomMap = new HashMap<>();
    // Map to track which client ID belongs to each session
    private Map<WebSocketSession, String> sessionUserMap = new HashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        // A client has connected, but no room is joined yet
        System.out.println("Connection established: " + session.getId());
    }

    @Override
    public void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        // Split the received message based on the '|' separator
        String[] messageParts = message.getPayload().split("\\|");

        if (messageParts.length < 2) {
            System.out.println("Invalid message format: " + message.getPayload());
            return;
        }

        // Extract the command (e.g., "JOIN", "MESSAGE")
        String command = messageParts[0];
        String roomName = messageParts[1];

        System.out.println("Received command: " + command + " from session: " + session.getId());

        switch (command) {
            case "JOIN":
                if (messageParts.length >= 3) {
                    String clientId = messageParts[2];
                    System.out.println("Client " + clientId + " joining room: " + roomName);
                    joinRoom(session, roomName, clientId); // Handle room joining
                }
                break;

            case "MESSAGE":
                if (sessionRoomMap.containsKey(session)) {
                    String clientId = sessionUserMap.get(session); // Get client ID associated with this session
                    String timestamp = messageParts[3]; // Extract the timestamp
                    String messageType = messageParts[4]; // Extract message type (TEXT, etc.)
                    String content = messageParts[5]; // Extract the actual content of the message

                    System.out.println("Message from clientId: " + clientId + " in room: " + roomName + " with content: " + content);
                    broadcastMessage(roomName, new TextMessage(clientId + "|" + roomName + "|" + timestamp + "|" + messageType + "|" + content)); // Broadcast the message
                } else {
                    System.out.println("Session is not in any room, cannot send message");
                }
                break;

            default:
                System.out.println("Unknown command: " + command);
        }
    }

    // Helper method to join a room
    private void joinRoom(WebSocketSession session, String roomName, String clientId) {
        chatRooms.putIfAbsent(roomName, new ArrayList<>()); // Create room if it doesn't exist

        // Remove the session from any previous room before joining a new one
        if (sessionRoomMap.containsKey(session)) {
            leaveRoom(session);
        }

        // Add the session to the new room
        chatRooms.get(roomName).add(session);
        sessionRoomMap.put(session, roomName); // Map the session to the room
        sessionUserMap.put(session, clientId); // Map the session to the client ID

        System.out.println("Client " + clientId + " joined room " + roomName);
    }

    // Helper method to leave a room
    private void leaveRoom(WebSocketSession session) {
        String currentRoom = sessionRoomMap.get(session);
        if (currentRoom != null) {
            chatRooms.get(currentRoom).remove(session); // Remove the session from the room
            sessionRoomMap.remove(session); // Remove the session-to-room mapping
            sessionUserMap.remove(session); // Remove the session-to-client mapping

            System.out.println("Session " + session.getId() + " left room " + currentRoom);
        }
    }

    // Helper method to broadcast a message to all clients in a room
    private void broadcastMessage(String roomName, TextMessage message) throws Exception {
        List<WebSocketSession> roomSessions = chatRooms.get(roomName); // Get all sessions in the room
        if (roomSessions != null) {
            for (WebSocketSession webSocketSession : roomSessions) {
                webSocketSession.sendMessage(message); // Send message to each session
            }
        } else {
            System.out.println("No sessions found in room: " + roomName);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, org.springframework.web.socket.CloseStatus status) throws Exception {
        System.out.println("Connection closed: " + session.getId() + " with status: " + status);
        leaveRoom(session); // Ensure the session leaves the room upon disconnection
    }
}
