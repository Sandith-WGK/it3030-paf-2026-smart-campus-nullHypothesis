/**
 * @author Daniru
 */
package com.smartcampus.controller;

import com.smartcampus.dto.NotificationDto;
import com.smartcampus.security.UserPrincipal;
import com.smartcampus.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    /**
     * Get ALL notifications (History) for the authenticated user.
     */
    @GetMapping("/user/{userId}/history")
    @PreAuthorize("hasRole('MANAGER') or #userId == principal.id")
    public ResponseEntity<List<NotificationDto>> getUserNotificationHistory(@PathVariable String userId) {
        return ResponseEntity.ok(notificationService.getNotificationsForUser(userId));
    }

    /**
     * Get only ACTIVE (non-archived) notifications for the quick panel.
     */
    @GetMapping("/user/{userId}")
    @PreAuthorize("hasRole('MANAGER') or #userId == principal.id")
    public ResponseEntity<List<NotificationDto>> getActiveNotifications(@PathVariable String userId) {
        return ResponseEntity.ok(notificationService.getActiveNotificationsForUser(userId));
    }

    /**
     * Get active unread count for the authenticated user.
     */
    @GetMapping("/user/{userId}/unread-count")
    @PreAuthorize("hasRole('MANAGER') or #userId == principal.id")
    public ResponseEntity<Long> getUnreadCount(@PathVariable String userId) {
        return ResponseEntity.ok(notificationService.getUnreadCount(userId));
    }

    /**
     * Mark a specific notification as read.
     */
    @PutMapping("/{id}/read")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<NotificationDto> markAsRead(@PathVariable String id, 
                                                     @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(notificationService.markAsRead(id, principal.getUserId()));
    }

    /**
     * Mark all active unread notifications for the current user as read.
     */
    @PutMapping("/user/{userId}/mark-all-read")
    @PreAuthorize("hasRole('MANAGER') or #userId == principal.id")
    public ResponseEntity<Void> markAllAsRead(@PathVariable String userId) {
        notificationService.markAllAsRead(userId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Delete a specific notification.
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> deleteNotification(@PathVariable String id, 
                                                   @AuthenticationPrincipal UserPrincipal principal) {
        notificationService.deleteNotification(id, principal.getUserId());
        return ResponseEntity.noContent().build();
    }

    /**
     * Archive all active notifications for the current user (Soft Clear).
     */
    @DeleteMapping("/user/{userId}")
    @PreAuthorize("hasRole('MANAGER') or #userId == principal.id")
    public ResponseEntity<Void> deleteAllNotifications(@PathVariable String userId) {
        notificationService.archiveAllNotifications(userId);
        return ResponseEntity.noContent().build();
    }

    /**
     * Hard Delete all notifications for the current user.
     */
    @DeleteMapping("/user/{userId}/hard")
    @PreAuthorize("hasRole('MANAGER') or #userId == principal.id")
    public ResponseEntity<Void> hardDeleteAllNotifications(@PathVariable String userId) {
        notificationService.deleteAllNotifications(userId);
        return ResponseEntity.noContent().build();
    }
}
