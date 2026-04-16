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
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;

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
        
        notificationRepository.save(notification);
    }

    /**
     * Fetch all notifications for a specific user, ordered by newest first.
     */
    public List<NotificationDto> getNotificationsForUser(String userId) {
        return notificationRepository.findByUserIdOrderByCreatedAtDesc(userId).stream()
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
     * Get the count of unread notifications for a user.
     */
    public long getUnreadCount(String userId) {
        return notificationRepository.countByUserIdAndIsReadFalse(userId);
    }
}
