package com.example.p2pchat.repository;

import com.example.p2pchat.Entity.Friend;
import com.example.p2pchat.Entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * Friend（友達関係）エンティティに対するデータベース操作を提供するリポジトリです。
 * ユーザーごとの友達一覧や、アクティブな友達関係の取得に使用されます。
 */
@Repository
public interface FriendRepository extends JpaRepository<Friend, Long> {
    // 指定ユーザーが持つ全ての友達関係（アクティブ・非アクティブを含む）を取得
    List<Friend> findAllByUser(User user);
    // 指定ユーザーが持つアクティブな友達関係のみを取得
    List<Friend> findAllByUserAndActiveTrue(User user);

    // 指定ユーザーと指定フレンドとの関係を1件取得（存在しない場合は null）
    Friend findByUserAndFriend(User user, User friend);
}