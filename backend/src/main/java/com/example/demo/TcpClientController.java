package com.example.demo;

import org.springframework.web.bind.annotation.*;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.io.PrintWriter;
import java.net.Socket;
import java.text.SimpleDateFormat;
import java.util.Date;

@CrossOrigin(origins = "http://localhost:3000")  // Tillader CORS-forespørgsler fra React frontend
@RestController
public class TcpClientController {

    private static final String TCP_SERVER_ADDRESS = "localhost";
    private static final int TCP_SERVER_PORT = 9090;  // TCP-serveren skal køre på en separat port

    @PostMapping("/send")
    public String sendMessageToTcpServer(@RequestBody MessageRequest messageRequest) {
        try (Socket socket = new Socket(TCP_SERVER_ADDRESS, TCP_SERVER_PORT)) {
            PrintWriter out = new PrintWriter(new OutputStreamWriter(socket.getOutputStream()), true);
            BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream()));

            // Formatér beskeden i henhold til protokollen
            String timestamp = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new Date());
            String formattedMessage = messageRequest.getClientId() + "|" + timestamp + "|"
                    + messageRequest.getMessageType() + "|" + messageRequest.getContent();

            // Send den formaterede besked til TCP-serveren
            out.println(formattedMessage);

            // Modtag og returnér det ekkoede svar fra TCP-serveren
            String response = in.readLine();
            return "Server response: " + response;
        } catch (Exception e) {
            return "Error: " + e.getMessage();
        }
    }

    public static class MessageRequest {
        private String clientId;
        private String messageType;
        private String content;

        public String getClientId() {
            return clientId;
        }

        public void setClientId(String clientId) {
            this.clientId = clientId;
        }

        public String getMessageType() {
            return messageType;
        }

        public void setMessageType(String messageType) {
            this.messageType = messageType;
        }

        public String getContent() {
            return content;
        }

        public void setContent(String content) {
            this.content = content;
        }
    }
}
