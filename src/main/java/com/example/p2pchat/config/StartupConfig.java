package com.example.p2pchat.config;

import com.example.p2pchat.Entity.User;
import com.example.p2pchat.repository.UserRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

/**
 * アプリケーション起動時に初期データ（管理者ユーザーなど）を投入する設定クラスです。
 */
@Configuration
public class StartupConfig {
    private static final Logger log = LoggerFactory.getLogger(StartupConfig.class);

    @Bean
    public CommandLineRunner dataInitializer(
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            @Value("${app.bootstrap-admin.enabled:false}") boolean bootstrapAdminEnabled,
            @Value("${app.bootstrap-admin.password:}") String bootstrapAdminPassword
    ) {
        return args -> {
            if (!bootstrapAdminEnabled) {
                return;
            }
            if (userRepository.existsByNickName("admin")) {
                return;
            }
            if (bootstrapAdminPassword == null || bootstrapAdminPassword.isBlank()) {
                log.warn("app.bootstrap-admin.enabled=true ですが app.bootstrap-admin.password が未設定のため admin 作成をスキップします");
                return;
            }

            User admin = new User();
            admin.setNickName("admin");
            admin.addReferralCode("testtest");
            admin.addReferralCode("aaaabbbb");
            admin.addReferralCode("ccccdddd");
            admin.setUsedReferralCode("none");
            admin.setPassword(passwordEncoder.encode(bootstrapAdminPassword));
            admin.setAuthority("ROLE_ADMIN");
            admin.setVerified(true);
            admin.setFriendRequestCode("admin1234");
            admin.setTrial(false);
            userRepository.save(admin);
            log.info("初期管理者ユーザー admin を作成しました");
        };
    }
}
