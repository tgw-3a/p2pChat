package com.example.p2pchat.web;

import com.example.p2pchat.Entity.User;
import com.example.p2pchat.service.UserService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.GetMapping;

@Controller
public class AdminController {
    private final UserService userService;

    public AdminController(UserService userService) {
        this.userService = userService;
    }
    @GetMapping("/admin/dashboard")
    public String listUsers(Model model, @AuthenticationPrincipal UserDetails userDetails) {
        User user = userService.findByNickName(userDetails.getUsername())
                .orElseThrow(() -> new UsernameNotFoundException("ユーザーが見つかりません"));
        model.addAttribute("user", user);
        model.addAttribute("users", userService.findAll());
        return "admin/dashboard";
    }
}
