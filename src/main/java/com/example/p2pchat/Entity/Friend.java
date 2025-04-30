package com.example.p2pchat.Entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * ユーザー間の友達関係を表すエンティティです。
 * 双方向の関係を保持するために、user と friend の両方を記録します。
 * active フィールドで現在の状態（有効/無効）を管理します。
 */
@Entity
@Getter
@Setter
public class Friend {

    // 主キー（自動生成される友達関係ID）
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // この友達関係の所有者（申請または承認したユーザー）
    @ManyToOne
    private User user;

    // 関係を結んでいる相手ユーザー
    @ManyToOne
    private User friend;

    // この友達関係が作成された日時
    private LocalDateTime createdAt;

    // この関係が現在有効かどうか（無効化＝友達解除）
    private boolean active = true; // 初期状態は有効

    // この関係が解除された日時（無効化された時点）
    private LocalDateTime deletedAt;
}