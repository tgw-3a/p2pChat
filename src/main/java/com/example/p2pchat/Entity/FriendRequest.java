package com.example.p2pchat.Entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * フレンド申請の情報を保持するエンティティです。
 * 申請の送信者・受信者、申請日時、承認/拒否/キャンセルの状態を管理します。
 */
@Entity
@Getter
@Setter
public class FriendRequest {
    // フレンド申請ID（自動採番）
    @Id
    @GeneratedValue
    private Long id;

    // 申請を送ったユーザー
    @ManyToOne
    private User sender;

    // 申請を受け取ったユーザー
    @ManyToOne
    private User receiver;

    // フレンド申請を送信した日時
    private LocalDateTime requestedAt;

    // 承認されたかどうか
    private boolean accepted;

    // 拒否されたかどうか（初期値は false）
    private boolean rejected = false;

    // キャンセルされたかどうか（初期値は false）
    private boolean cancelled = false;

}