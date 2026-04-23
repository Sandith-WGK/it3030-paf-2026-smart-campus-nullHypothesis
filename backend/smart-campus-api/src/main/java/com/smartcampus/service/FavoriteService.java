package com.smartcampus.service;

import com.smartcampus.model.Favorite;
import com.smartcampus.model.Resource;
import com.smartcampus.repository.FavoriteRepository;
import com.smartcampus.repository.ResourceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class FavoriteService {
    
    private final FavoriteRepository favoriteRepository;
    private final ResourceRepository resourceRepository;
    
    public void addFavorite(String userId, String resourceId) {
        if (userId == null || resourceId == null) {
            log.warn("Cannot add favorite: userId or resourceId is null");
            return;
        }
        
        if (favoriteRepository.existsByUserIdAndResourceId(userId, resourceId)) {
            log.warn("Favorite already exists for user {} and resource {}", userId, resourceId);
            return;
        }
        
        Resource resource = resourceRepository.findById(resourceId).orElse(null);
        if (resource == null) {
            log.warn("Resource not found with id: {}", resourceId);
            return;
        }
        
        Favorite favorite = Favorite.builder()
                .userId(userId)
                .resourceId(resource.getId())
                .resourceName(resource.getName())
                .resourceType(resource.getType().name())
                .resourceLocation(resource.getLocation())
                .resourceCapacity(resource.getCapacity())
                .resourceStatus(resource.getStatus().name())
                .resourceAvailabilityStart(resource.getAvailabilityStart() != null ? resource.getAvailabilityStart().toString() : null)
                .resourceAvailabilityEnd(resource.getAvailabilityEnd() != null ? resource.getAvailabilityEnd().toString() : null)
                .resourceDescription(resource.getDescription())
                .favoritedAt(LocalDateTime.now())
                .build();
        
        favoriteRepository.save(favorite);
        log.info("Added favorite for user {} on resource {}", userId, resource.getName());
    }
    
    public void removeFavorite(String userId, String resourceId) {
        favoriteRepository.deleteByUserIdAndResourceId(userId, resourceId);
        log.info("Removed favorite for user {} on resource {}", userId, resourceId);
    }
    
    public List<Favorite> getFavorites(String userId) {
        return favoriteRepository.findByUserIdOrderByFavoritedAtDesc(userId);
    }
    
    public boolean isFavorite(String userId, String resourceId) {
        return favoriteRepository.existsByUserIdAndResourceId(userId, resourceId);
    }
    
    public void clearAllFavorites(String userId) {
        favoriteRepository.deleteAllByUserId(userId);
        log.info("Cleared all favorites for user {}", userId);
    }
}