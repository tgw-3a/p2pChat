package com.example.p2pchat.web;

import com.example.p2pchat.Entity.User;
import com.example.p2pchat.Entity.Friend;
import com.example.p2pchat.form.UserForm;
import com.example.p2pchat.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.validation.BindingResult;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.servlet.mvc.support.RedirectAttributes;

import java.security.Principal;
import java.util.List;

/**
 * ユーザー登録やログイン後のダッシュボード表示など、
 * Web画面に関するルーティングを提供するコントローラークラスです。
 */
@Controller
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    // trail解除用
    @PostMapping("/trial/upgrade")
    public String upgradeTrial(@AuthenticationPrincipal UserDetails userDetails,
                               @RequestParam("referralCode") String referralCode,
                               RedirectAttributes redirectAttributes) {
        userService.verifyReferralCodeAndUpgrade(userDetails.getUsername(), referralCode);
        redirectAttributes.addFlashAttribute("message", "制限が解除されました！");
        return "redirect:/dashboard";
    }

    // ユーザー登録画面を表示する
    @GetMapping("/register")
    public String showRegisterForm(@ModelAttribute UserForm form) {
        return "register";
    }

    // 登録フォームをバリデーションし、紹介コードが有効ならユーザーを登録する
    @PostMapping("/register")
    public String registerUser(@Valid @ModelAttribute UserForm form,
                               BindingResult bindingResult,
                               Model model) {
        // ここで紹介コードの存在チェック
        if (!userService.isReferralCodeValid(form.getUsedReferralCode())) {
            bindingResult.rejectValue("usedReferralCode", "invalid.referralCode", "紹介コードが無効です");
        }

        if (bindingResult.hasErrors()) {
            return "register"; // 入力フォームに戻す
        }

//        if (!userService.existsByReferralCode(form.getUsedReferralCode())) {
//            bindingResult.rejectValue("usedReferralCode", "invalid", "紹介コードが見つかりません");
//            return "register";
//        }

        userService.register(form.getUsedReferralCode(), form.getPassword(), form.getNickName());
        return "redirect:/login";
    }

    // ログイン後のユーザーダッシュボード画面を表示する
    // ユーザー情報、紹介者情報、友達関係、申請状況などを画面に渡す
    @GetMapping("/dashboard")
    public String dashboard(Model model, Principal principal) {
        User user = userService.findByNickName(principal.getName())
                .orElseThrow(() -> new UsernameNotFoundException("ユーザーが見つかりません"));
        model.addAttribute("user", user);
        model.addAttribute("referralCodes", userService.getAvailableReferralCodes(user));
        model.addAttribute("nickname", user.getNickName());
        model.addAttribute("friendRequestCode", user.getFriendRequestCode());
        model.addAttribute("referredUsers", userService.findAllByUsedReferralCodes(user));
        model.addAttribute("referredFriends", user.getReferredFriends());
        model.addAttribute("trialExpired", userService.isTrialExpired(user));
        userService.findReferrer(user).ifPresent(referrer -> {
            //            model.addAttribute("referrer", referrer.getNickName());
            model.addAttribute("referrer", userService.findReferrer(user)
                    .map(User::getNickName)
                    .orElse(null));
        });
        List<Friend> friends = userService.findFriends(user);
        model.addAttribute("friends", friends);
        List<Friend> inactiveFriends = userService.findInactiveFriends(user);
        model.addAttribute("inactiveFriends", inactiveFriends);
        model.addAttribute("pendingRequests", userService.findPendingFriendRequests(user));
        model.addAttribute("rejectedRequests", userService.findRejectedFriendRequests(user));
        model.addAttribute("sentRequests", userService.findSentVisibleRequests(user));
        return "dashboard";
    }
}
