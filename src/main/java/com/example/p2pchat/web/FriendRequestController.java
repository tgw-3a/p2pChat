package com.example.p2pchat.web;

import com.example.p2pchat.Entity.FriendRequest;
import com.example.p2pchat.Entity.User;
import com.example.p2pchat.repository.FriendRequestRepository;
import com.example.p2pchat.service.UserService;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Controller;
import org.springframework.ui.Model;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.security.access.AccessDeniedException;

/**
 * フレンド申請に関する各種操作（申請、承認、拒否、キャンセル、再申請など）を処理するコントローラーです。
 * ユーザーが送受信するフレンド申請のルーティングを提供します。
 */
@Controller
@RequiredArgsConstructor
@RequestMapping("/friends")
public class FriendRequestController {

    private final UserService userService;
    private final FriendRequestRepository friendRequestRepository;


    // ニックネームを指定してフレンド申請を送信する
    @PostMapping("/request")
    public String sendFriendRequest(@AuthenticationPrincipal UserDetails userDetails,
                                    @RequestParam("to") String toNickName,
                                    HttpServletRequest request) {
        userService.sendFriendRequest(userDetails.getUsername(), toNickName);
        return "redirect:" + request.getHeader("Referer");
    }

    // フレンド申請を承認して友達関係を構築する
    @PostMapping("/accept")
    public String acceptFriendRequest(@RequestParam("requestId") Long requestId,
                                      HttpServletRequest request) {
        userService.acceptFriendRequest(requestId);
        return "redirect:" + request.getHeader("Referer");
    }
    // フレンド申請コードを指定して申請を送信する
    @PostMapping("/requestByCode")
    public String sendFriendRequestByFriendRequestCode(
            @AuthenticationPrincipal UserDetails userDetails,
            @RequestParam("toFriendRequestCode") String toFriendRequestCode,
            HttpServletRequest request) {

        userService.sendFriendRequestByFriendRequestCode(userDetails.getUsername(), toFriendRequestCode);
        return "redirect:" + request.getHeader("Referer");
    }
//    @PostMapping("/requestByFriendRequestCode")
//    public String sendFriendRequestByFriendRequestCode(@AuthenticationPrincipal UserDetails userDetails,
//                                                      @RequestParam("toFriendRequestCode") String toFriendRequestCode,
//                                                      HttpServletRequest request) {
//        userService.sendFriendRequestByFriendRequestCode(userDetails.getUsername(), toFriendRequestCode);
//        return "redirect:" + request.getHeader("Referer");
//    }
    // フレンド申請を拒否状態にする
    @PostMapping("/reject")
    public String rejectFriendRequest(@RequestParam("requestId") Long requestId,
                                      HttpServletRequest request) {
        userService.markFriendRequestAsRejected(requestId);
        return "redirect:" + request.getHeader("Referer");
    }

    // 拒否された申請を再申請可能な状態に戻す
    @PostMapping("/undo-rejection")
    public String undoRejection(@RequestParam("requestId") Long requestId,
                                HttpServletRequest request) {
        userService.undoRejectedFriendRequest(requestId);
        return "redirect:" + request.getHeader("Referer");
    }

    // 自分から見た友達関係を解除（非アクティブ化）する
    @PostMapping("/remove")
    public String removeFriend(@AuthenticationPrincipal UserDetails userDetails,
                               @RequestParam("friendId") Long friendId,
                               HttpServletRequest request) {
        userService.removeFriend(
                userService.findByNickName(userDetails.getUsername())
                        .orElseThrow(() -> new UsernameNotFoundException("ユーザーが見つかりません")),
                friendId
        );
        return "redirect:" + request.getHeader("Referer");
    }

    // 解除された友達関係を復元する
    @PostMapping("/restore")
    public String restoreFriend(@AuthenticationPrincipal UserDetails userDetails,
                                @RequestParam("friendId") Long friendId,
                                HttpServletRequest request) {
        userService.restoreFriend(
                userService.findByNickName(userDetails.getUsername())
                        .orElseThrow(() -> new UsernameNotFoundException("ユーザーが見つかりません")),
                friendId
        );
        return "redirect:" + request.getHeader("Referer");
    }

    // ダッシュボードを表示し、送受信した申請や友達情報を画面に渡す
    @GetMapping("/dashboard")
    public String showDashboard(@AuthenticationPrincipal UserDetails userDetails, Model model) {
        var currentUser = userService.findByNickName(userDetails.getUsername())
                .orElseThrow(() -> new UsernameNotFoundException("ユーザーが見つかりません"));

        model.addAttribute("sentRequests", userService.findSentVisibleRequests(currentUser));
        model.addAttribute("pendingRequests", userService.findIncomingVisibleRequests(currentUser));

        return "dashboard";
    }

    // 自分が送信したフレンド申請をキャンセル状態にする
    @PostMapping("/cancel")
    public String cancelFriendRequest(@RequestParam Long requestId,
                                      @AuthenticationPrincipal UserDetails userDetails) {
        User sender = userService.findByNickName(userDetails.getUsername())
                .orElseThrow(() -> new UsernameNotFoundException("ユーザーが見つかりません"));

        FriendRequest request = friendRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("リクエストが見つかりません"));

        if (!request.getSender().equals(sender)) {
            throw new AccessDeniedException("このリクエストをキャンセルする権限がありません");
        }

        request.setCancelled(true);
        friendRequestRepository.save(request);

        return "redirect:/dashboard";
    }

    // キャンセル状態の申請を再申請する（キャンセルフラグを解除）
    @PostMapping("/resubmit")
    public String resubmitFriendRequest(@RequestParam Long requestId,
                                        @AuthenticationPrincipal UserDetails userDetails) {
        User sender = userService.findByNickName(userDetails.getUsername())
                .orElseThrow(() -> new UsernameNotFoundException("ユーザーが見つかりません"));

        FriendRequest request = friendRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("リクエストが見つかりません"));

        if (!request.getSender().equals(sender)) {
            throw new AccessDeniedException("このリクエストを再申請する権限がありません");
        }

        request.setCancelled(false);
        friendRequestRepository.save(request);

        return "redirect:/dashboard";
    }

    // フレンド申請を完全に削除する
    @PostMapping("/delete")
    public String deleteFriendRequest(@RequestParam Long requestId,
                                      @AuthenticationPrincipal UserDetails userDetails) {
        User sender = userService.findByNickName(userDetails.getUsername())
                .orElseThrow(() -> new UsernameNotFoundException("ユーザーが見つかりません"));

        FriendRequest request = friendRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("リクエストが見つかりません"));

        if (!request.getSender().equals(sender)) {
            throw new AccessDeniedException("このリクエストを削除する権限がありません");
        }

        friendRequestRepository.delete(request);

        return "redirect:/dashboard";
    }
}
