package com.example.p2pchat.web;

import com.example.p2pchat.service.UserService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.core.context.SecurityContextHolder;

@Controller
public class TrialController {

    private static final Logger logger = LoggerFactory.getLogger(TrialController.class);

    @Autowired
    private UserService userService;

    @GetMapping("/trial/register")
    public String showTrialRegisterForm() {
        return "trial_register";
    }

    @PostMapping("/trial/register")
    public String registerTrialUser(@RequestParam String nickName,
                                    @RequestParam String password,
                                    HttpServletRequest request,
                                    HttpServletResponse response) {
        userService.registerTrialUser(nickName, password);

        // 現在の認証状態を確認
        if (SecurityContextHolder.getContext().getAuthentication() == null
                || !SecurityContextHolder.getContext().getAuthentication().isAuthenticated()) {
            try {
                request.login(nickName, password);
            } catch (ServletException e) {
                logger.error("自動ログインに失敗しました", e);
                return "redirect:/login?error=autologin_failed";
            }
        }

        return "redirect:/dashboard";
    }
}