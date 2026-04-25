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

/**
 * VIVA PREP: This is the CRUD Controller for Notification Management.
 * It follows RESTful conventions:
 *   CREATE -> Notifications are created internally by NotificationService (no POST endpoint needed).
 *   READ   -> GET    /api/v1/notifications/user/{userId}  (active) or /history (all)
 *   UPDATE -> PUT    /api/v1/notifications/{id}/read  (mark as read)
 *   DELETE -> DELETE /api/v1/notifications/{id}  (single) or /user/{userId} (all)
 * Uses DTOs (NotificationDto) to avoid exposing internal MongoDB document structures.
 * Method-level security (@PreAuthorize) ensures users can only access their own data.
 */
@RestController
@RequestMapping("/api/v1/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    /**
     * CRUD: READ (All Notification History)
     * HTTP: GET /api/v1/notifications/user/{userId}/history
     * Status Code: 200 OK
     * Security: ADMIN or the user themselves.
     * Returns both active AND archived notifications for the full history page.
     */
    @GetMapping("/user/{userId}/history")
    @PreAuthorize("hasRole('ADMIN') or #userId == principal.id")
    public ResponseEntity<List<NotificationDto>> getUserNotificationHistory(@PathVariable String userId) {
        return ResponseEntity.ok(notificationService.getNotificationsForUser(userId));
    }

    /**
     * CRUD: READ (Active Notifications Only)
     * HTTP: GET /api/v1/notifications/user/{userId}
     * Status Code: 200 OK
     * Security: ADMIN or the user themselves.
     * Returns only non-archived notifications for the quick notification panel dropdown.
     */
    @GetMapping("/user/{userId}")
    @PreAuthorize("hasRole('ADMIN') or #userId == principal.id")
    public ResponseEntity<List<NotificationDto>> getActiveNotifications(@PathVariable String userId) {
        return ResponseEntity.ok(notificationService.getActiveNotificationsForUser(userId));
    }

    /**
     * CRUD: READ (Unread Count)
     * HTTP: GET /api/v1/notifications/user/{userId}/unread-count
     * Status Code: 200 OK
     * Returns a single number used to render the red badge on the bell icon in the navbar.
     */
    @GetMapping("/user/{userId}/unread-count")
    @PreAuthorize("hasRole('ADMIN') or #userId == principal.id")
    public ResponseEntity<Long> getUnreadCount(@PathVariable String userId) {
        return ResponseEntity.ok(notificationService.getUnreadCount(userId));
    }

    /**
     * CRUD: UPDATE (Mark Single Notification as Read)
     * HTTP: PUT /api/v1/notifications/{id}/read
     * Status Code: 200 OK
     * Security: Any authenticated user, but the service layer checks ownership (prevents IDOR attacks).
     */
    @PutMapping("/{id}/read")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<NotificationDto> markAsRead(@PathVariable String id, 
                                                     @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.ok(notificationService.markAsRead(id, principal.getUserId()));
    }

    /**
     * CRUD: UPDATE (Mark All Notifications as Read)
     * HTTP: PUT /api/v1/notifications/user/{userId}/mark-all-read
     * Status Code: 204 No Content
     * Bulk operation: marks every unread notification for this user as read in one request.
     */
    @PutMapping("/user/{userId}/mark-all-read")
    @PreAuthorize("hasRole('ADMIN') or #userId == principal.id")
    public ResponseEntity<Void> markAllAsRead(@PathVariable String userId) {
        notificationService.markAllAsRead(userId);
        return ResponseEntity.noContent().build();
    }

    /**
     * CRUD: DELETE (Remove Single Notification)
     * HTTP: DELETE /api/v1/notifications/{id}
     * Status Code: 204 No Content
     * Security: Any authenticated user, but the service checks ownership to prevent IDOR.
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> deleteNotification(@PathVariable String id, 
                                                   @AuthenticationPrincipal UserPrincipal principal) {
        notificationService.deleteNotification(id, principal.getUserId());
        return ResponseEntity.noContent().build();
    }

    /**
     * CRUD: DELETE (Archive/Soft-Clear All Notifications)
     * HTTP: DELETE /api/v1/notifications/user/{userId}
     * Status Code: 204 No Content
     * Soft delete: Marks all notifications as archived (they still appear in /history).
     */
    @DeleteMapping("/user/{userId}")
    @PreAuthorize("hasRole('ADMIN') or #userId == principal.id")
    public ResponseEntity<Void> deleteAllNotifications(@PathVariable String userId) {
        notificationService.archiveAllNotifications(userId);
        return ResponseEntity.noContent().build();
    }

    /**
     * CRUD: DELETE (Hard Delete All Notifications Permanently)
     * HTTP: DELETE /api/v1/notifications/user/{userId}/hard
     * Status Code: 204 No Content
     * Permanently removes all notification records from MongoDB for this user.
     */
    @DeleteMapping("/user/{userId}/hard")
    @PreAuthorize("hasRole('ADMIN') or #userId == principal.id")
    public ResponseEntity<Void> hardDeleteAllNotifications(@PathVariable String userId) {
        notificationService.deleteAllNotifications(userId);
        return ResponseEntity.noContent().build();
    }
}
