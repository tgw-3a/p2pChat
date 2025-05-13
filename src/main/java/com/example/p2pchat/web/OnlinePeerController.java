package com.example.p2pchat.web;

import com.example.p2pchat.Entity.Friend;
import com.example.p2pchat.Entity.OnlinePeer;
import com.example.p2pchat.Entity.User;
import com.example.p2pchat.repository.FriendRepository;
import com.example.p2pchat.repository.OnlinePeerRepository;
import com.example.p2pchat.repository.UserRepository;
import jakarta.transaction.Transactional;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/online")
public class OnlinePeerController {

    @Autowired
    private OnlinePeerRepository onlinePeerRepository;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private FriendRepository friendRepository;

    @PostMapping
    @Transactional
    public void updateOnlinePeer(@AuthenticationPrincipal UserDetails userDetails,
                                 @RequestBody String multiaddr) {
        User user = userRepository.findByNickName(userDetails.getUsername())
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        onlinePeerRepository.deleteByUser(user);

        OnlinePeer peer = new OnlinePeer();
        peer.setUser(user);
        peer.setMultiaddr(multiaddr);
        peer.setLastSeenAt(LocalDateTime.now());
        onlinePeerRepository.save(peer);
    }

    @DeleteMapping
    @Transactional
    public void removeOnlinePeer(@AuthenticationPrincipal UserDetails userDetails) {
        User user = userRepository.findByNickName(userDetails.getUsername())
            .orElseThrow(() -> new IllegalArgumentException("User not found"));
        onlinePeerRepository.deleteByUser(user);
    }

    @GetMapping
    public List<OnlinePeerDto> getFriendsOnline(@AuthenticationPrincipal UserDetails userDetails) {
        User me = userRepository.findByNickName(userDetails.getUsername())
            .orElseThrow(() -> new IllegalArgumentException("User not found"));

        List<User> myFriends = friendRepository.findAllByUser(me)
            .stream()
            .map(Friend::getFriend)
            .toList();

        return onlinePeerRepository.findAll().stream()
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
