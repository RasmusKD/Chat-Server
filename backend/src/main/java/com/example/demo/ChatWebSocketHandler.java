package com.example.demo;

import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class ChatWebSocketHandler extends TextWebSocketHandler {

    private Map<String, List<WebSocketSession>> chatRooms = new HashMap<>();
    private Map<WebSocketSession, String> sessionRoomMap = new HashMap<>();
    private Map<WebSocketSession, String> sessionUserMap = new HashMap<>(); // Store user's name

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        // No action here; users will join a room later
    }

    @Override
    public void handleTextMessage(WebSocketSession session, TextMessage message) throws Exception {
        String[] messageParts = message.getPayload().split("\\|");

        if (messageParts.length < 2) return;

        String command = messageParts[0];
        String roomName = messageParts[1];

        switch (command) {
            case "JOIN":
                if (messageParts.length >= 3) {
                    String userName = messageParts[2];
                    joinRoom(session, roomName, userName);
                }
                break;
            case "MESSAGE":
                if (sessionRoomMap.containsKey(session)) {
                    String content = messageParts[2];
                    // Fetch the actual username from sessionUserMap
                    String userName = sessionUserMap.get(session);
                    broadcastMessage(sessionRoomMap.get(session), new TextMessage(userName + "|" + content));
                }
                break;
        }
    }

    private void joinRoom(WebSocketSession session, String roomName, String userName) {
        chatRooms.putIfAbsent(roomName, new ArrayList<>());

        // Remove session from any previous room
        if (sessionRoomMap.containsKey(session)) {
            leaveRoom(session);
        }

        // Add session to new room and store user name
        chatRooms.get(roomName).add(session);
        sessionRoomMap.put(session, roomName);
        sessionUserMap.put(session, userName); // Store the user name associated with this session
    }

    private void leaveRoom(WebSocketSession session) {
        String currentRoom = sessionRoomMap.get(session);
        if (currentRoom != null) {
            chatRooms.get(currentRoom).remove(session);
            sessionRoomMap.remove(session);
            sessionUserMap.remove(session);
        }
    }

    private void broadcastMessage(String roomName, TextMessage message) throws Exception {
        List<WebSocketSession> roomSessions = chatRooms.get(roomName);
        if (roomSessions != null) {
            for (WebSocketSession webSocketSession : roomSessions) {
                webSocketSession.sendMessage(message); // Send message (already has username|message format)
            }
        }
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, org.springframework.web.socket.CloseStatus status) throws Exception {
        leaveRoom(session);
    }
}
