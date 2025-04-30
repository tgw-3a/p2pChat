package com.example.p2pchat.repository;

import com.example.p2pchat.Entity.FriendRequest;
import com.example.p2pchat.Entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

/**
 * FriendRequest（フレンド申請）エンティティに対するデータベース操作を提供するリポジトリです。
 * Spring Data JPA を使用して、送信者・受信者の状態に応じた検索メソッドを定義しています。
 */
@Repository
public interface FriendRequestRepository extends JpaRepository<FriendRequest, Long> {
    // 受信者が指定された、まだ承認されていない全ての申請を取得
    List<FriendRequest> findAllByReceiverAndAcceptedFalse(User receiver);
    // 指定された送信者と受信者間で、未承認の申請が存在するか確認
    boolean existsBySenderAndReceiverAndAcceptedFalse(User sender, User receiver);
    // 指定された送信者による、まだ承認されていない全ての申請を取得
    List<FriendRequest> findAllBySenderAndAcceptedFalse(User sender);

    // 指定された送信者が拒否された申請一覧を取得
    List<FriendRequest> findAllBySenderAndRejectedTrue(User user);

    // 指定された受信者宛ての、承認も拒否もされていない保留中の申請一覧を取得
    List<FriendRequest> findAllByReceiverAndAcceptedFalseAndRejectedFalse(User receiver);
    // 指定された送信者による、保留中（承認も拒否もされていない）の申請一覧を取得
    List<FriendRequest> findAllBySenderAndAcceptedFalseAndRejectedFalse(User sender);
    // 指定された送信者による、キャンセルもされていない未承認の申請一覧を取得
    List<FriendRequest> findBySenderAndAcceptedFalseAndCancelledFalse(User sender);
    // 指定された受信者宛てで、キャンセルもされていない未承認の申請一覧を取得
    List<FriendRequest> findByReceiverAndAcceptedFalseAndCancelledFalse(User receiver);
    // 指定された送信者と受信者間で、拒否された申請が存在するか確認
    boolean existsBySenderAndReceiverAndRejectedTrue(User sender, User receiver);

    // 指定された受信者宛てで、拒否された申請一覧を取得
    List<FriendRequest> findAllByReceiverAndRejectedTrue(User user);
    // 指定された送信者による全ての申請を取得
    List<FriendRequest> findBySender(User sender);
    // 指定された送信者と受信者間の全ての申請を取得
    List<FriendRequest> findBySenderAndReceiver(User sender, User receiver);
}
