package com.hackathon.realtimecollaborativetextapp.controller;

import com.hackathon.realtimecollaborativetextapp.model.DocumentModel;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.SendTo;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicReference;

@Controller
public class DocumentController {

    private final AtomicReference<DocumentModel> documentModel =
            new AtomicReference<>(new DocumentModel(0, "Initial content."));

    private final SimpMessagingTemplate messagingTemplate;

    private final Map<String, String> sessionUsers = new ConcurrentHashMap<>();
    private final Set<String> typingUsers = ConcurrentHashMap.newKeySet();
    private int userCounter = 1;

    public DocumentController(SimpMessagingTemplate messagingTemplate) {
        this.messagingTemplate = messagingTemplate;
    }

    @MessageMapping("/document/edit")
    @SendTo("/topic/document/updates")
    public DocumentModel handleEdit(DocumentModel incomingChange) {
        DocumentModel currentState = documentModel.get();

        if (incomingChange.getVersion() != currentState.getVersion()) {
            return currentState; // just return latest
        }

        DocumentModel newState = new DocumentModel(
                incomingChange.getVersion() + 1,
                incomingChange.getContent()
        );
        documentModel.set(newState);
        return newState;
    }

    @MessageMapping("/document/get")
    @SendTo("/topic/document/updates")
    public DocumentModel getDocumentState() {
        return documentModel.get();
    }

    @MessageMapping("/document/typing")
    @SendTo("/topic/document/typing")
    public Set<String> typing(Map<String, Boolean> payload, org.springframework.messaging.simp.stomp.StompHeaderAccessor header) {
        String sessionId = header.getSessionId();

        // assign username if first time
        sessionUsers.putIfAbsent(sessionId, "User " + userCounter++);
        String username = sessionUsers.get(sessionId);

        Boolean isTyping = payload.get("typing");
        if (isTyping != null) {
            if (isTyping) typingUsers.add(username);
            else typingUsers.remove(username);
        }

        return new HashSet<>(typingUsers);
    }
}
