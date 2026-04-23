package com.smartcampus.repository;

import com.smartcampus.model.Favorite;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FavoriteRepository extends MongoRepository<Favorite, String> {
    
    List<Favorite> findByUserIdOrderByFavoritedAtDesc(String userId);
    
    Optional<Favorite> findByUserIdAndResourceId(String userId, String resourceId);
    
    void deleteByUserIdAndResourceId(String userId, String resourceId);
    
    void deleteAllByUserId(String userId);
    
    boolean existsByUserIdAndResourceId(String userId, String resourceId);
}