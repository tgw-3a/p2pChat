package com.example.p2pchat.service;

import com.example.p2pchat.Entity.User;
import com.example.p2pchat.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.authentication.AccountExpiredException;
import org.springframework.security.core.userdetails.*;
import org.springframework.stereotype.Service;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Spring Security におけるユーザー認証処理を担うサービスクラス。
 * ニックネームを使ってユーザー情報をロードし、認証に使用される UserDetails を返す。
 */
@Service
@RequiredArgsConstructor
public class UserDetailsServiceImpl implements UserDetailsService {

    private final UserRepository userRepository;

    // ニックネームからユーザー情報を取得し、Spring Security 用の UserDetails を構築して返す
    @Override
    public UserDetails loadUserByUsername(String nickname) throws UsernameNotFoundException {
        User user = userRepository.findByNickName(nickname)
                .orElseThrow(() -> new UsernameNotFoundException("ニックネームが見つかりません: " + nickname));

        if (user.isTrial() && user.getCreatedAt() != null && user.getCreatedAt().plusDays(7).isBefore(LocalDateTime.now())) {
            throw new AccountExpiredException("体験期間が終了しました。紹介コードを入力して解除してください。");
        }

        return new org.springframework.security.core.userdetails.User(
                user.getNickName(),
                user.getPassword(),
                List.of(new SimpleGrantedAuthority(user.getAuthority()))
        );
    }
    public boolean isTrialExpired(User user) {
        return user.isTrial()
                && user.getCreatedAt() != null
                && user.getCreatedAt().plusDays(7).isBefore(LocalDateTime.now());
    }
}