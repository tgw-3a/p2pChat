package com.example.p2pchat.Entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * ユーザー情報を表すエンティティクラスです。
 * ユーザーの認証情報、紹介・申請コード、紹介関係などを管理します。
 */
@Entity
@Table(name = "users")
@Getter
@Setter
@NoArgsConstructor
public class User {

    // ユーザーID（自動採番）
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ユーザーの表示名（ニックネーム）。一意である必要がある
    @Column(nullable = false, unique = true)
    private String nickName;

    // 固定のフレンド申請用コード。他人がこれを使って申請する
    @Column(nullable = false, unique = true)
    private String friendRequestCode;

    // ハッシュ化されたログイン用パスワード
    @Column(nullable = false)
    private String password;

    // 権限（通常は ROLE_USER。管理者は ROLE_ADMIN）
    @Column(nullable = false)
    private String authority = "ROLE_USER";

    // 本人確認済みかどうか（将来的なメール認証などに使用予定）
    @Column(nullable = false)
    private boolean verified = true;

    // 誰の紹介で登録されたか（紹介者の referralCode を記録）
    @Column(nullable = false)
    private String usedReferralCode;

    // 残りの紹介枠（初期は3、紹介により減少・課金で追加可能）
    @Column(nullable = false)
    private int remainingReferralSlots = 3;

    // フレンド申請コードの生成日時
    @Column
    private LocalDateTime friendRequestCodeCreatedAt;

    // このユーザーを紹介コードで登録したユーザーの一覧
    @OneToMany
    @JoinColumn(name = "usedReferralCode", referencedColumnName = "friendRequestCode", insertable = false, updatable = false)
    private java.util.List<User> referredFriends;

    // 紹介コードを使って登録した日時
    private LocalDateTime usedReferralCodeCreatedAt;

    // 紹介用コード（最大3つまで）。Userが他人に紹介する際に使用。
    @OneToMany(mappedBy = "owner", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ReferralCode> referralCodes;

    public void addReferralCode(String code) {
        ReferralCode referralCode = new ReferralCode();
        referralCode.setCode(code);
        referralCode.setOwner(this);
        if (this.referralCodes == null) {
            this.referralCodes = new ArrayList<>();
        }
        this.referralCodes.add(referralCode);
    }
}