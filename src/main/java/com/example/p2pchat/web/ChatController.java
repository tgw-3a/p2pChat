package com.example.p2pchat.web;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class ChatController {

    @Value("${relay.multiaddr}")
    private String relayMultiaddr;

    @GetMapping("/chat")
    public String chat(Model model, @AuthenticationPrincipal UserDetails userDetails) {
        model.addAttribute("nickName", userDetails.getUsername());
        model.addAttribute("relayMultiaddr", relayMultiaddr);
        return "chat";
    }
}

