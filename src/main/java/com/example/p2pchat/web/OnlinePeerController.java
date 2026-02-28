package com.example.p2pchat.web;

import com.example.p2pchat.Entity.Friend;
import com.example.p2pchat.Entity.OnlinePeer;
import com.example.p2pchat.Entity.User;
import com.example.p2pchat.repository.FriendRepository;
import com.example.p2pchat.repository.OnlinePeerRepository;
import com.example.p2pchat.repository.UserRepository;
import jakarta.transaction.Transactional;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/online")
@RequiredArgsConstructor
public class OnlinePeerController {

    private static final int ONLINE_TTL_SECONDS = 60;

    private final OnlinePeerRepository onlinePeerRepository;
    private final UserRepository userRepository;
    private final FriendRepository friendRepository;

    @PostMapping
    @Transactional
    public void updateOnlinePeer(@AuthenticationPrincipal UserDetails userDetails,
                                 @RequestBody String multiaddr) {
        if (userDetails == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "ログインが必要です");
        }

        String trimmed = multiaddr == null ? "" : multiaddr.trim();
        if (trimmed.isEmpty() || !trimmed.startsWith("/") || trimmed.length() > 512) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "multiaddr が不正です");
        }

        User user = userRepository.findByNickName(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "ユーザーが見つかりません"));
        onlinePeerRepository.deleteByUser(user);

        OnlinePeer peer = new OnlinePeer();
        peer.setUser(user);
        peer.setMultiaddr(trimmed);
        peer.setLastSeenAt(LocalDateTime.now());
        onlinePeerRepository.save(peer);
    }

    @DeleteMapping
    @Transactional
    public void removeOnlinePeer(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "ログインが必要です");
        }
        User user = userRepository.findByNickName(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "ユーザーが見つかりません"));
        onlinePeerRepository.deleteByUser(user);
    }

    @PostMapping("/offline-beacon")
    @Transactional
    public void offlineBeacon(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            return;
        }
        userRepository.findByNickName(userDetails.getUsername()).ifPresent(onlinePeerRepository::deleteByUser);
    }

    @GetMapping
    @Transactional
    public List<OnlinePeerDto> getFriendsOnline(@AuthenticationPrincipal UserDetails userDetails) {
        if (userDetails == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "ログインが必要です");
        }

        User me = userRepository.findByNickName(userDetails.getUsername())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "ユーザーが見つかりません"));

        List<User> myFriends = friendRepository.findAllByUser(me)
                .stream()
                .map(Friend::getFriend)
                .toList();

        LocalDateTime threshold = LocalDateTime.now().minusSeconds(ONLINE_TTL_SECONDS);
        List<OnlinePeer> allPeers = onlinePeerRepository.findAll();
        for (OnlinePeer peer : allPeers) {
            if (peer.getLastSeenAt() == null || peer.getLastSeenAt().isBefore(threshold)) {
                onlinePeerRepository.delete(peer);
            }
        }

        return onlinePeerRepository.findAll().stream()
                .filter(peer -> peer.getLastSeenAt() != null && !peer.getLastSeenAt().isBefore(threshold))
                .filter(peer -> !peer.getUser().equals(me) && myFriends.contains(peer.getUser()))
                .map(peer -> new OnlinePeerDto(peer.getUser().getNickName(), peer.getMultiaddr()))
                .collect(Collectors.toList());
    }

    public static class OnlinePeerDto {
        public String name;
        public String multiaddr;

        public OnlinePeerDto(String name, String multiaddr) {
            this.name = name;
            this.multiaddr = multiaddr;
        }
    }
}
