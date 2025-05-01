package com.example.p2pchat.web;

import com.example.p2pchat.service.UserService;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Controller;

import java.util.UUID;

@Controller
public class TrialController {

    @Autowired
    private UserService userService;

    @GetMapping("/trial/register")
    public String showTrialRegisterForm() {
        return "trial_register";
    }

    @PostMapping("/trial/register")
    public String registerTrialUser(@RequestParam String nickName,
                                    @RequestParam String password) {
        userService.registerTrialUser(nickName, password);
        return "redirect:/login?trial=true";
    }
}
