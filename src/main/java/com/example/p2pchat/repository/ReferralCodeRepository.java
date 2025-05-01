package com.example.p2pchat.repository;

import com.example.p2pchat.Entity.ReferralCode;
import com.example.p2pchat.Entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

public interface ReferralCodeRepository extends JpaRepository<ReferralCode, Long> {
    List<ReferralCode> findAllByOwner(User user); // 指定ユーザーが所有している紹介コード一覧

    Optional<ReferralCode> findByCode(String code); // 紹介コードの値で検索

    boolean existsByCode(String code); // コードの重複チェック

    List<ReferralCode> findAllByOwnerAndUsedFalse(User owner); // 使用されていない紹介コードのみ

    Optional<ReferralCode> findByCodeAndUsedFalse(String referralCode); // 未使用の紹介コードを検索

    @Transactional
    @Modifying
    @Query("UPDATE ReferralCode r SET r.used = true, r.usedByUser = :user WHERE r.code = :code")
    void markAsUsed(@Param("code") String code, @Param("user") User user);
}