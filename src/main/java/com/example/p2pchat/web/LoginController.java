package com.example.p2pchat.web;

import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;

/**
 * ログインページへのルーティングを担当するコントローラーです。
 * /login にアクセスがあった場合、テンプレート login.html を表示します。
 */
@Controller
public class LoginController {

    /**
     * ログインページを表示する。
     * @return login テンプレートのパス
     */
    @GetMapping("/login")
    public String login() {
        return "login"; // templates/login.html を表示
    }
}