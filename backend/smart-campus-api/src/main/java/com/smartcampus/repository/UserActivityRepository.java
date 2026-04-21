package com.smartcampus.repository;

import com.smartcampus.model.UserActivity;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface UserActivityRepository extends MongoRepository<UserActivity, String> {
    List<UserActivity> findByUserIdOrderByTimestampDesc(String userId);
}
