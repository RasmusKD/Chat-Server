package com.example.demo;

import org.springframework.stereotype.Component;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.net.ServerSocket;
import java.net.Socket;
import java.util.ArrayList;
import java.util.List;

@Component
public class TcpEchoServer {

    private static final int PORT = 9090;
    private final List<PrintWriter> clientWriters = new ArrayList<>();  // Liste over tilsluttede klienter

    public void startServer() {
        new Thread(() -> {
            try (ServerSocket serverSocket = new ServerSocket(PORT)) {
                System.out.println("TCP Echo Server is running on port " + PORT);

                while (true) {
                    // Acceptér ny klientforbindelse
                    Socket clientSocket = serverSocket.accept();
                    System.out.println("Client connected: " + clientSocket.getInetAddress());

                    // Håndter kommunikation med klienten i samme tråd
                    try (BufferedReader in = new BufferedReader(new InputStreamReader(clientSocket.getInputStream()));
                         PrintWriter out = new PrintWriter(new OutputStreamWriter(clientSocket.getOutputStream()), true)) {

                        synchronized (clientWriters) {
                            clientWriters.add(out);  // Tilføj klient til listen over writers
                        }

                        String receivedMessage;
                        while ((receivedMessage = in.readLine()) != null) {
                            System.out.println("Received: " + receivedMessage);
                            broadcastMessage(receivedMessage);  // Send besked til alle klienter
                        }

                    } catch (Exception e) {
                        System.out.println("Connection error: " + e.getMessage());
                    } finally {
                        synchronized (clientWriters) {
                            clientWriters.removeIf(writer -> writer.equals(clientSocket));  // Fjern klient ved afslutning
                        }
                    }
                }
            } catch (Exception e) {
                System.out.println("Server error: " + e.getMessage());
            }
        }).start();
    }

    // Broadcast besked til alle tilsluttede klienter
    private void broadcastMessage(String message) {
        synchronized (clientWriters) {
            for (PrintWriter writer : clientWriters) {
                writer.println(message);
            }
        }
    }
}
