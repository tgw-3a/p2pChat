package com.example.p2pchat.repository;

import com.example.p2pchat.Entity.FriendRequest;
import com.example.p2pchat.Entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

/**
 * FriendRequest（フレンド申請）エンティティに対するデータベース操作を提供するリポジトリです。
 */
@Repository
public interface FriendRequestRepository extends JpaRepository<FriendRequest, Long> {
    List<FriendRequest> findAllByReceiverAndAcceptedFalse(User receiver);
    boolean existsBySenderAndReceiverAndAcceptedFalse(User sender, User receiver);
    List<FriendRequest> findAllBySenderAndAcceptedFalse(User sender);

    List<FriendRequest> findAllBySenderAndRejectedTrue(User user);

    List<FriendRequest> findAllByReceiverAndAcceptedFalseAndRejectedFalse(User receiver);
    List<FriendRequest> findAllBySenderAndAcceptedFalseAndRejectedFalse(User sender);
    List<FriendRequest> findBySenderAndAcceptedFalseAndCancelledFalse(User sender);
    List<FriendRequest> findByReceiverAndAcceptedFalseAndCancelledFalse(User receiver);
    boolean existsBySenderAndReceiverAndRejectedTrue(User sender, User receiver);
    boolean existsBySenderAndReceiverAndAcceptedFalseAndCancelledFalseAndRejectedFalse(User sender, User receiver);

    List<FriendRequest> findAllByReceiverAndRejectedTrue(User user);
    List<FriendRequest> findBySender(User sender);
    List<FriendRequest> findBySenderAndReceiver(User sender, User receiver);
}
