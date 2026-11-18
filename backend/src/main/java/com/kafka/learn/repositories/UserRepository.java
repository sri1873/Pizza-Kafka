package com.kafka.learn.repositories;

import com.kafka.learn.entities.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.UUID;

@Repository
public interface UserRepository extends JpaRepository<User, UUID> {


    void deleteById(UUID userId);

}
