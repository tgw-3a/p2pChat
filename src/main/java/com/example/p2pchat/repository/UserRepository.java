package com.example.p2pchat.repository;

import com.example.p2pchat.Entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    // 紹介コードがすでに使われているかを確認（登録時の一意性チェック）
//    boolean existsByReferralCode(String referralCode);

    // ニックネームでユーザーを検索（ログインや検索用）
    Optional<User> findByNickName(String nickName);

    // 指定された紹介コードを使って登録したユーザー一覧を取得（紹介された人たち）
    List<User> findAllByUsedReferralCode(String referralCode);

    // ニックネームがすでに使われているかを確認（登録時の一意性チェック）
    boolean existsByNickName(String nickName);

    // フレンド申請コードからユーザーを検索（フレンド申請時に使用）
    Optional<User> findByFriendRequestCode(String friendRequestCode);

    List<User> findAllByUsedReferralCodeIn(List<String> codes);
}