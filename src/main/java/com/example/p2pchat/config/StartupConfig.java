package com.example.p2pchat.config;

import com.example.p2pchat.Entity.User;
import com.example.p2pchat.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.context.annotation.Configuration;

import java.util.UUID;

/**
 * アプリケーション起動時に初期データ（管理者ユーザーなど）を投入する設定クラスです。
 * 開発時のテスト用ユーザーを自動作成します。
 */
@Configuration
public class StartupConfig {

    /**
     * 管理者ユーザー（ニックネーム: admin）が存在しない場合、自動的に作成する初期化ロジック。
     */
    @Bean
    public CommandLineRunner dataInitializer(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        return args -> {
            if (!userRepository.existsByNickName("admin")) {
                User admin = new User();
                // 管理者のニックネームを設定
                admin.setNickName("admin");
                // ダミーの紹介コードを3つ追加
                admin.addReferralCode("testtest");
                admin.addReferralCode("aaaabbbb");
                admin.addReferralCode("ccccdddd");
                // 紹介されたわけではないため "none" を設定
                admin.setUsedReferralCode("none");
                // パスワードをハッシュ化して保存
                admin.setPassword(passwordEncoder.encode("adminpass"));
                // 管理者権限を付与
                admin.setAuthority("ROLE_ADMIN");
                // 本人確認済みとしてマーク
                admin.setVerified(true);
                // フレンド申請コードをランダムに生成
                admin.setFriendRequestCode("admin1234");
                admin.setTrial(false);
                // ユーザー情報を保存
                userRepository.save(admin);
                System.out.println("✅ 初期管理者ユーザー admin を作成しました");
            }
        };
    }
}