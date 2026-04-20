/**
 * @author Daniru
 */
package com.smartcampus.service;

import com.smartcampus.dto.NotificationDto;
import com.smartcampus.exception.ResourceNotFoundException;
import com.smartcampus.exception.UnauthorizedAccessException;
import com.smartcampus.model.NotifType;
import com.smartcampus.model.Notification;
import com.smartcampus.model.Severity;
import com.smartcampus.model.User;
import com.smartcampus.repository.NotificationRepository;
import com.smartcampus.repository.UserRepository;
import com.smartcampus.event.EmailNotificationEvent;
import org.springframework.context.ApplicationEventPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final ApplicationEventPublisher eventPublisher;

    /**
     * Generic method to trigger a notification from any service.
     */
    public void sendNotification(String userId, String message, NotifType type, Severity severity, 
                                 String referenceId, String referenceType) {
        
        // Innovation: Check user preferences
        User user = userRepository.findById(userId).orElse(null);
        if (user != null && user.getNotificationPreferences() != null) {
            boolean enabled = true;
            if (referenceType != null) {
                if (referenceType.equals("BOOKING")) enabled = user.getNotificationPreferences().isBookings();
                if (referenceType.equals("TICKET")) enabled = user.getNotificationPreferences().isTickets();
            }
            if (!enabled) {
                log.info("Notification suppressed by user preferences for user {}", userId);
                return;
            }
        }

        log.info("Sending notification of type {} to user {}", type, userId);
        
        Notification notification = Notification.builder()
                .userId(userId)
                .message(message)
                .type(type)
                .severity(severity)
                .referenceId(referenceId)
                .referenceType(referenceType)
                .isRead(false)
                .build();
        
        Notification saved = notificationRepository.save(notification);
        
        // Push in real-time via WebSockets (Double Delivery strategy)
        try {
            // Path 1: Private queue (Direct)
            messagingTemplate.convertAndSendToUser(
                userId, 
                "/queue/notifications", 
                NotificationDto.from(saved)
            );
            
            // Path 2: Broadcast topic (Fallback - filtered by frontend)
            messagingTemplate.convertAndSend(
                "/topic/notifications",
                NotificationDto.from(saved)
            );

            log.info("WebSocket: Notification pushed for user {} (Direct + Broadcast)", userId);
        } catch (Exception e) {
            log.error("WebSocket: Failed to push notification {}: {}", saved.getId(), e.getMessage());
        }

        // --- Async Delivery: Dual-Channel (Email) ---
        if (user != null && user.getEmail() != null) {
            String subject = type.toString().replace("_", " ");
            log.info("Notification: Publishing Async Email Event to {} (type: {})", user.getEmail(), type);
            eventPublisher.publishEvent(new EmailNotificationEvent(this, user, subject, message));
        }
    }

    /**
     * Fetch all notifications for a specific user, ordered by newest first. (FOR HISTORY PAGE)
     */
    public List<NotificationDto> getNotificationsForUser(String userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
                .map(NotificationDto::from)
                .collect(Collectors.toList());
    }

    /**
     * Fetch only active (non-archived) notifications. (FOR QUICK PANEL)
     */
    public List<NotificationDto> getActiveNotificationsForUser(String userId) {
        return notificationRepository.findByUserIdAndIsArchivedFalseOrderByCreatedAtDesc(userId).stream()
                .map(NotificationDto::from)
                .collect(Collectors.toList());
    }

    /**
     * Mark a notification as read. Validates that the notification belongs to the user.
     */
    public NotificationDto markAsRead(String notificationId, String userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification", "id", notificationId));

        if (!notification.getUserId().equals(userId)) {
            throw new UnauthorizedAccessException("You can only mark your own notifications as read");
        }

        notification.setRead(true);
        return NotificationDto.from(notificationRepository.save(notification));
    }

    /**
     * Delete a notification. Validates that the notification belongs to the user.
     */
    public void deleteNotification(String notificationId, String userId) {
        Notification notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new ResourceNotFoundException("Notification", "id", notificationId));

        if (!notification.getUserId().equals(userId)) {
            throw new UnauthorizedAccessException("You can only delete your own notifications");
        }

        notificationRepository.delete(notification);
    }

    /**
     * Mark all active unread notifications for a user as read.
     */
    public void markAllAsRead(String userId) {
        List<Notification> unread = notificationRepository.findByUserIdAndIsReadFalseAndIsArchivedFalse(userId);
        if (!unread.isEmpty()) {
            unread.forEach(n -> n.setRead(true));
            notificationRepository.saveAll(unread);
            log.info("Marked {} active notifications as read for user {}", unread.size(), userId);
        }
    }

    /**
     * Archive all active notifications for a user (Soft Clear).
     */
    public void archiveAllNotifications(String userId) {
        List<Notification> active = notificationRepository.findByUserIdAndIsArchivedFalse(userId);
        if (!active.isEmpty()) {
            active.forEach(n -> n.setArchived(true));
            notificationRepository.saveAll(active);
            log.info("Archived {} notifications for user {}", active.size(), userId);
        }
    }

    /**
     * Delete all notifications for a user (Permanent Clear).
     */
    public void deleteAllNotifications(String userId) {
        notificationRepository.deleteByUserId(userId);
        log.info("Deleted all notifications for user {}", userId);
    }

    /**
     * Get the count of active unread notifications for a user.
     */
    public long getUnreadCount(String userId) {
        return notificationRepository.countByUserIdAndIsReadFalseAndIsArchivedFalse(userId);
    }
}
