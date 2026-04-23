package com.smartcampus.controller;

import com.smartcampus.model.Favorite;
import com.smartcampus.service.FavoriteService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/favorites")
@RequiredArgsConstructor
public class FavoriteController {
    
    private final FavoriteService favoriteService;
    
    @GetMapping
    public ResponseEntity<List<Favorite>> getFavorites(
            @AuthenticationPrincipal UserDetails userDetails) {
        String userId = userDetails.getUsername();
        return ResponseEntity.ok(favoriteService.getFavorites(userId));
    }
    
    @PostMapping("/{resourceId}")
    public ResponseEntity<?> addFavorite(
            @PathVariable String resourceId,
            @AuthenticationPrincipal UserDetails userDetails) {
        String userId = userDetails.getUsername();
        favoriteService.addFavorite(userId, resourceId);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Resource added to favorites");
        return ResponseEntity.ok(response);
    }
    
    @DeleteMapping("/{resourceId}")
    public ResponseEntity<?> removeFavorite(
            @PathVariable String resourceId,
            @AuthenticationPrincipal UserDetails userDetails) {
        String userId = userDetails.getUsername();
        favoriteService.removeFavorite(userId, resourceId);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Resource removed from favorites");
        return ResponseEntity.ok(response);
    }
    
    @GetMapping("/check/{resourceId}")
    public ResponseEntity<?> isFavorite(
            @PathVariable String resourceId,
            @AuthenticationPrincipal UserDetails userDetails) {
        String userId = userDetails.getUsername();
        boolean isFavorite = favoriteService.isFavorite(userId, resourceId);
        
        Map<String, Object> response = new HashMap<>();
        response.put("isFavorite", isFavorite);
        return ResponseEntity.ok(response);
    }
    
    @DeleteMapping
    public ResponseEntity<?> clearAllFavorites(
            @AuthenticationPrincipal UserDetails userDetails) {
        String userId = userDetails.getUsername();
        favoriteService.clearAllFavorites(userId);
        
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "All favorites cleared");
        return ResponseEntity.ok(response);
    }
}