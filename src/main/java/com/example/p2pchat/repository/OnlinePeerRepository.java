package com.example.p2pchat.repository;

import com.example.p2pchat.Entity.OnlinePeer;
import com.example.p2pchat.Entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OnlinePeerRepository extends JpaRepository<OnlinePeer, Long> {
    void deleteByUser(User user);
    List<OnlinePeer> findAll();
}