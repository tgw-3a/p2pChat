package com.example.p2pchat.service;

import com.example.p2pchat.domain.User;
import com.example.p2pchat.domain.FriendRequest;
import com.example.p2pchat.domain.Friend;
import com.example.p2pchat.repository.FriendRequestRepository;
import com.example.p2pchat.repository.FriendRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
/**
 * フレンド申請および友達関係に関するビジネスロジックを扱うサービスクラスです。
 * 申請の承認・拒否、チャット可否の判定などを提供します。
 */
public class FriendService {

    private final FriendRequestRepository friendRequestRepository;
    private final FriendRepository friendRepository;

    // 指定ユーザー宛ての拒否されたフレンド申請を取得する
    public List<FriendRequest> findRejectedRequests(User receiver) {
        return friendRequestRepository.findAllByReceiverAndRejectedTrue(receiver);
    }

    // 指定ユーザー宛ての保留中（未承認・未拒否）のフレンド申請を取得する
    public List<FriendRequest> findPendingRequests(User receiver) {
        return friendRequestRepository.findAllByReceiverAndAcceptedFalseAndRejectedFalse(receiver);
    }

    // フレンド申請を承認状態に更新する
    public void approveRequest(FriendRequest request) {
        request.setAccepted(true);
        friendRequestRepository.save(request);
    }

    // フレンド申請を拒否状態に更新する
    public void rejectRequest(FriendRequest request) {
        request.setRejected(true);
        friendRequestRepository.save(request);
    }

    // 双方が友達かつアクティブな状態であるかを判定し、チャット可能かを返す
    public boolean canChat(User from, User to) {
        Friend fromTo = friendRepository.findByUserAndFriend(from, to);
        Friend toFrom = friendRepository.findByUserAndFriend(to, from);
        return fromTo != null && toFrom != null && fromTo.isActive() && toFrom.isActive();
    }
}