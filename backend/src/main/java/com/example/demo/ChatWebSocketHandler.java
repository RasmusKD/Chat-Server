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

        // Handle unicast messages using /msg
        if (messageParts[3].startsWith("/msg")) {
            handleUnicastMessage(session, messageParts, message);
            return;
        }

        // Handle regular messages (broadcast)
        if (messageParts.length < 4) {
            System.out.println("Invalid message format: " + message.getPayload());
            return;
        }

        // Extract client ID, timestamp, message type, and content
        String clientId = messageParts[0];
        String timestamp = messageParts[1];
        String messageType = messageParts[2];
        String content = messageParts[3];

        // Get the room the session is part of
        String roomName = (String) session.getAttributes().get("room");
        if (roomName != null) {
            System.out.println("Broadcasting message to room: " + roomName);
            broadcastMessage(roomName, new TextMessage(clientId + "|" + timestamp + "|" + messageType + "|" + content));
        } else {
            System.out.println("Session is not in any room, cannot send message");
        }
    }

    // Handle unicast messages (/msg clientId message)
    private void handleUnicastMessage(WebSocketSession senderSession, String[] messageParts, TextMessage message) throws Exception {
        String senderId = sessionUserMap.get(senderSession);
        String timestamp = messageParts[1];
        String content = messageParts[3];

        // Parse the /msg command to get the target client ID and message
        String[] msgCommandParts = content.split(" ", 3);  // "/msg clientId message"
        if (msgCommandParts.length < 3 || !msgCommandParts[0].equals("/msg")) {
            System.out.println("Invalid /msg format: " + content);
            return;
        }

        String targetClientId = msgCommandParts[1]; // Extract the recipient's client ID
        String msgContent = msgCommandParts[2];    // Extract the actual message content

        // Find the target user's WebSocket session
        WebSocketSession targetSession = findSessionByClientId(targetClientId);
        if (targetSession != null) {
            // Send the message to the sender as "To targetClientId: message"
            String senderMessage = "To " + targetClientId + ": " + msgContent;
            TextMessage senderFormattedMessage = new TextMessage(senderId + "|" + timestamp + "|unicast|" + senderMessage);
            senderSession.sendMessage(senderFormattedMessage);

            // Send the message to the recipient as "From senderId: message"
            String recipientMessage = "From " + senderId + ": " + msgContent;
            TextMessage recipientFormattedMessage = new TextMessage(senderId + "|" + timestamp + "|unicast|" + recipientMessage);
            targetSession.sendMessage(recipientFormattedMessage);
        } else {
            System.out.println("Target user " + targetClientId + " not found.");
            senderSession.sendMessage(new TextMessage("System|" + timestamp + "|error|Target user not found."));
        }
    }


    // Helper to find a session by clientId
    private WebSocketSession findSessionByClientId(String clientId) {
        for (Map.Entry<WebSocketSession, String> entry : sessionUserMap.entrySet()) {
            if (entry.getValue().equals(clientId)) {
                return entry.getKey();
            }
        }
        return null;
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
