package com.example.demo;

import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class ChatWebSocketHandler extends TextWebSocketHandler {

    // Static rooms and their associated sessions
    private static final String[] STATIC_ROOMS = {"Room1", "Room2", "Room3", "Room4", "Room5"};
    private Map<String, List<WebSocketSession>> chatRooms = new HashMap<>();
    private Map<WebSocketSession, String> sessionUserMap = new HashMap<>();

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        System.out.println("Connection established: " + session.getId());
    }

    @Override
    public void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        // Log received message
        System.out.println("Received message: " + message.getPayload());

        // Split the received message based on the '|' separator
        String[] messageParts = message.getPayload().split("\\|");

        // Check for a JOIN command first
        if (messageParts[0].equals("JOIN")) {
            if (messageParts.length >= 3) {
                String roomName = messageParts[1];
                String clientId = messageParts[2];
                System.out.println("Processing JOIN command for room: " + roomName + " and clientId: " + clientId);
                joinRoom(session, roomName, clientId);  // Handle room joining
            } else {
                System.out.println("Invalid JOIN format: " + message.getPayload());
            }
            return;
        }

        // Handle regular messages
        if (messageParts.length < 4) {
            System.out.println("Invalid message format: " + message.getPayload());
            return;
        }

        // Extract client ID, timestamp, message type, and content
        String clientId = messageParts[0];
        String timestamp = messageParts[1];
        String messageType = messageParts[2];
        String content = messageParts[3];

        // Log message details
        System.out.println("Message details - Client ID: " + clientId + ", Timestamp: " + timestamp + ", Type: " + messageType + ", Content: " + content);

        // Get the room the session is part of
        String roomName = (String) session.getAttributes().get("room");
        if (roomName != null) {
            System.out.println("Broadcasting message to room: " + roomName);
            broadcastMessage(roomName, new TextMessage(clientId + "|" + timestamp + "|" + messageType + "|" + content));
        } else {
            System.out.println("Session is not in any room, cannot send message");
        }
    }

    public void joinRoom(WebSocketSession session, String roomName, String clientId) {
        leaveRoom(session);  // Always leave the previous room before joining a new one

        chatRooms.computeIfAbsent(roomName, k -> new ArrayList<>()).add(session);
        session.getAttributes().put("room", roomName);
        sessionUserMap.put(session, clientId);

        System.out.println("Client " + clientId + " joined room " + roomName);
    }

    private void leaveRoom(WebSocketSession session) {
        String currentRoom = (String) session.getAttributes().get("room");
        if (currentRoom != null) {
            chatRooms.get(currentRoom).remove(session);
            session.getAttributes().remove("room");
            sessionUserMap.remove(session);
        }
    }

    private void broadcastMessage(String roomName, TextMessage message) throws Exception {
        List<WebSocketSession> roomSessions = chatRooms.get(roomName);

        if (roomSessions != null && !roomSessions.isEmpty()) {
            System.out.println("Broadcasting to " + roomSessions.size() + " session(s) in room: " + roomName);

            for (WebSocketSession webSocketSession : roomSessions) {
                System.out.println("Sending message to session: " + webSocketSession.getId());
                webSocketSession.sendMessage(message);
            }
        } else {
            System.out.println("No sessions found in room: " + roomName);
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, org.springframework.web.socket.CloseStatus status) throws Exception {
        leaveRoom(session);
    }
}
