package com.example.p2pchat.service;

import java.time.LocalDateTime;

import com.example.p2pchat.domain.Friend;
import com.example.p2pchat.repository.FriendRepository;

import com.example.p2pchat.domain.User;
import com.example.p2pchat.domain.FriendRequest;
import com.example.p2pchat.repository.UserRepository;
import com.example.p2pchat.repository.FriendRequestRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.UUID;
import java.util.Optional;

/**
 * UserService は、ユーザーの登録・認証・紹介・友達管理などの
 * アプリケーションロジックを扱うサービスクラスです。
 */
@Service
@RequiredArgsConstructor
public class UserService {

    private final FriendRepository friendRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final FriendRequestRepository friendRequestRepository;

    // 指定された紹介コードが存在し、利用可能かチェックする
    public boolean existsByReferralCode(String referralCode) {
        Optional<User> userOpt = userRepository.findByReferralCode(referralCode);
        return userOpt.isPresent() && isReferralCodeActive(userOpt.get());
    }

    // 紹介コードを使って新規ユーザーを登録し、紹介者と友達関係を構築する
    public void register(String usedReferralCode, String rawPassword, String nickName) {
        if (!userRepository.existsByReferralCode(usedReferralCode)) {
            throw new IllegalArgumentException("紹介コードが無効です");
        }
        User referrer = userRepository.findByReferralCode(usedReferralCode)
                .orElseThrow(() -> new IllegalArgumentException("紹介コードが無効です"));

// 1. 枠の残数をチェック
        if (referrer.getRemainingReferralSlots() <= 0) {
            throw new IllegalArgumentException("紹介コードの使用上限に達しています");
        }

// 2. 紹介枠を1つ減らす
        referrer.setRemainingReferralSlots(referrer.getRemainingReferralSlots() - 1);

// 3. 紹介者を保存
        userRepository.save(referrer);

        String newReferralCode = UUID.randomUUID().toString().substring(0, 8);

        String encodedPassword = passwordEncoder.encode(rawPassword);
        User user = new User();
        user.setNickName(nickName);
        user.setUsedReferralCode(usedReferralCode); // 誰から紹介されたか
        user.setReferralCode(newReferralCode);
        user.setUsedReferralCodeCreatedAt(LocalDateTime.now());
        user.setRemainingReferralSlots(5);
        user.setFriendRequestCode(UUID.randomUUID().toString().substring(0, 8));
        user.setPassword(encodedPassword);
        user.setAuthority("ROLE_USER");

        String baseUrl = "https://example.com/register?code=";
        String inviteLink = baseUrl + user.getReferralCode();
        System.out.println("招待リンク: " + inviteLink); // ログに出力（将来フロントで使う）

        userRepository.save(user);

        Friend friendship = new Friend();
        friendship.setUser(referrer);       // 紹介者
        friendship.setFriend(user);         // 紹介されたユーザー
        friendship.setCreatedAt(LocalDateTime.now());
        friendRepository.save(friendship);

        Friend reverse = new Friend();
        reverse.setUser(user);           // 被紹介者（今ログインしてる人）
        reverse.setFriend(referrer);     // 紹介者
        reverse.setCreatedAt(LocalDateTime.now());
        friendRepository.save(reverse);
    }

    // 紹介コードが存在するか確認する
    public boolean isReferralCodeValid(String code) {
        return userRepository.findByReferralCode(code).isPresent();
    }

    // 紹介コードの有効期間が過ぎていないかを確認する（現在は常に有効）
    public boolean isReferralCodeActive(User user) {
        // return user.getReferralCodeCreatedAt() != null &&
        //        user.getReferralCodeCreatedAt().isAfter(LocalDateTime.now().minusDays(30));
        return true;
    }

    // ニックネームからユーザーを検索する
    public Optional<User> findByNickName(String nickName) {
        return userRepository.findByNickName(nickName);
    }

    // 指定された紹介コードを使って登録されたユーザー一覧を取得
    public List<User> findAllByUsedReferralCode(String referralCode) {
        return userRepository.findAllByUsedReferralCode(referralCode);
    }

    // 現在のユーザーを紹介したユーザーを取得する
    public Optional<User> findReferrer(User user) {
        return userRepository.findByReferralCode(user.getUsedReferralCode());
    }

    // 自分が解除した（非アクティブな）友達を取得する
    public List<Friend> findInactiveFriends(User user) {
        return friendRepository.findAllByUser(user).stream()
                .filter(f -> !f.isActive()) // 非アクティブ
                .filter(f -> f.getUser().equals(user)) // 自分が解除した側
                .toList();
    }

    // ニックネームを使ってフレンド申請を送る
    public void sendFriendRequest(String fromNickName, String toNickName) {
        User sender = userRepository.findByNickName(fromNickName)
                .orElseThrow(() -> new IllegalArgumentException("送信者が見つかりません"));
        User receiver = userRepository.findByNickName(toNickName)
                .orElseThrow(() -> new IllegalArgumentException("受信者が見つかりません"));

        if (sender.equals(receiver)) {
            throw new IllegalArgumentException("自分自身には申請できません");
        }

        if (friendRepository.findAllByUser(sender).stream()
                .anyMatch(f -> f.getFriend().equals(receiver))) {
            throw new IllegalArgumentException("すでに友達です");
        }

        // allow resubmission only if previous is cancelled or rejected is true
        if (friendRequestRepository.existsBySenderAndReceiverAndRejectedTrue(sender, receiver)) {
            throw new IllegalArgumentException("申請済みです。再申請する場合は申請を削除するか、キャンセル欄から再申請を押してください");
        }

        FriendRequest request = new FriendRequest();
        request.setSender(sender);
        request.setReceiver(receiver);
        request.setRequestedAt(LocalDateTime.now());
        request.setAccepted(false);

        friendRequestRepository.save(request);
    }

    // フレンド申請コードを使ってフレンド申請を送る
    public void sendFriendRequestByFriendRequestCode(String fromNickName, String toFriendRequestCode) {
        User sender = userRepository.findByNickName(fromNickName)
                .orElseThrow(() -> new IllegalArgumentException("送信者が見つかりません"));
        User receiver = userRepository.findByFriendRequestCode(toFriendRequestCode)
                .orElseThrow(() -> new IllegalArgumentException("受信者が見つかりません"));

        if (sender.equals(receiver)) {
            throw new IllegalArgumentException("自分自身には申請できません");
        }

        if (friendRepository.findAllByUser(sender).stream()
                .anyMatch(f -> f.getFriend().equals(receiver))) {
            throw new IllegalArgumentException("すでに友達です");
        }

        if (friendRequestRepository.existsBySenderAndReceiverAndRejectedTrue(sender, receiver)) {
            throw new IllegalArgumentException("すでに申請中です");
        }

//        if (friendRequestRepository.findBySenderAndReceiver(sender, receiver).stream()
//                .anyMatch(req -> !req.isAccepted() && !req.isCancelled() && !req.isRejected())) {
//            throw new IllegalArgumentException("すでに申請中です");
//        }

        FriendRequest request = new FriendRequest();
        request.setSender(sender);
        request.setReceiver(receiver);
        request.setRequestedAt(LocalDateTime.now());
        request.setAccepted(false);

        friendRequestRepository.save(request);
    }

    // フレンド申請を承認し、双方向の友達関係を作成する
    public void acceptFriendRequest(Long requestId) {
        FriendRequest request = friendRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("申請が見つかりません"));

        if (request.isAccepted()) {
            return; // すでに承認済み
        }

        request.setAccepted(true);
        friendRequestRepository.save(request);

        // 双方向でフレンド登録
        Friend f1 = new Friend();
        f1.setUser(request.getSender());
        f1.setFriend(request.getReceiver());
        f1.setCreatedAt(LocalDateTime.now());
        friendRepository.save(f1);

        Friend f2 = new Friend();
        f2.setUser(request.getReceiver());
        f2.setFriend(request.getSender());
        f2.setCreatedAt(LocalDateTime.now());
        friendRepository.save(f2);
    }

    // 自分への保留中のフレンド申請を取得する
    public List<FriendRequest> findPendingFriendRequests(User user) {
        return friendRequestRepository.findAllByReceiverAndAcceptedFalseAndRejectedFalse(user);
    }

    // 自分が送った保留中のフレンド申請を取得する
    public List<FriendRequest> findSentPendingRequests(User user) {
        return friendRequestRepository.findAllBySenderAndAcceptedFalseAndRejectedFalse(user);
    }

    // 申請を拒否状態にする（削除の代わり）
    public void markFriendRequestAsRejected(Long requestId) {
        FriendRequest request = friendRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("申請が見つかりません"));
        request.setRejected(true);
        friendRequestRepository.save(request);
    }

    // 拒否状態を解除して、再申請を可能にする
    public void undoRejectedFriendRequest(Long requestId) {
        FriendRequest request = friendRequestRepository.findById(requestId)
                .orElseThrow(() -> new IllegalArgumentException("申請が見つかりません"));
        request.setRejected(false);
        request.setRequestedAt(LocalDateTime.now());
        friendRequestRepository.save(request);
    }

    // 拒否されたフレンド申請一覧を取得する
    public List<FriendRequest> findRejectedFriendRequests(User user) {
        return friendRequestRepository.findAllByReceiverAndRejectedTrue(user);
    }

    // 申請済み（承認前）の送信済みフレンド申請を取得する
    public List<FriendRequest> findSentVisibleRequests(User user) {
        return friendRequestRepository.findBySender(user).stream()
                .filter(req -> !req.isAccepted())
                .toList();
    }

    // 自分宛ての保留中のフレンド申請を取得する（キャンセル済みを除く）
    public List<FriendRequest> findIncomingVisibleRequests(User user) {
        return friendRequestRepository.findByReceiverAndAcceptedFalseAndCancelledFalse(user);
    }

    // 自分から見た友達関係を解除（非アクティブ化）する
    public void removeFriend(User user, Long friendId) {
        User target = userRepository.findById(friendId)
                .orElseThrow(() -> new IllegalArgumentException("対象ユーザーが見つかりません"));

        // 自分から相手への関係を非アクティブにする（相手側はそのまま）
        friendRepository.findAllByUserAndActiveTrue(user).stream()
                .filter(f -> f.getFriend().equals(target))
                .forEach(f -> {
                    f.setActive(false);
                    f.setDeletedAt(LocalDateTime.now());
                    friendRepository.save(f);
                });
    }

    // 解除した友達関係を復元（アクティブに戻す）する
    public void restoreFriend(User user, Long friendId) {
        User target = userRepository.findById(friendId)
                .orElseThrow(() -> new IllegalArgumentException("対象ユーザーが見つかりません"));

        // 自分から相手への関係をアクティブに戻す
        friendRepository.findAllByUser(user).stream()
                .filter(f -> f.getFriend().equals(target) && !f.isActive())
                .forEach(f -> {
                    f.setActive(true);
                    f.setDeletedAt(null);
                    friendRepository.save(f);
                });

    }

    // 自分から追加した現在のアクティブな友達を取得する
    public List<Friend> findFriends(User user) {
        return friendRepository.findAllByUser(user).stream()
                .filter(Friend::isActive)
                .filter(f -> f.getUser().equals(user)) // 自分が追加したフレンドのみ
                .toList();
    }
}