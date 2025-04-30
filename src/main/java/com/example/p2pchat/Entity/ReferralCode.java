package com.example.p2pchat.Entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

// 紹介コードを表すエンティティ
@Getter
@Setter
@Entity
public class ReferralCode {

    // 主キー（自動採番）
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 紹介コード（ユニークかつ空不可）
    @Column(nullable = false, unique = true)
    private String code;

    // この紹介コードを発行したユーザー（所有者）
    @ManyToOne
    @JoinColumn(name = "user_id", nullable = false)
    private User owner;

    // 使用されたかどうかを示すフラグ（初期値は未使用）
    @Column(nullable = false)
    private boolean used = false;

    // この紹介コードを使用したユーザー（未使用なら null）
    @OneToOne
    @JoinColumn(name = "used_by_user_id")
    private User usedByUser;

    // 紹介コードの作成日時
    @Column(nullable = false)
    private LocalDateTime createdAt = LocalDateTime.now();
//    // 所有者を取得する（互換性のためのエイリアス）
//    public User getUser() {
//        return this.owner;
//    }
}