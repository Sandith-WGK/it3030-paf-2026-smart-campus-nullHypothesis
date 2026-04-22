package com.smartcampus.repository;

import com.smartcampus.model.Notification;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface NotificationRepository extends MongoRepository<Notification, String> {

    // Get all notifications for a user (History Page)
    List<Notification> findByUserIdOrderByCreatedAtDesc(String userId);

    // Get only active (non-archived) notifications for the quick panel
    List<Notification> findByUserIdAndIsArchivedFalseOrderByCreatedAtDesc(String userId);

    // Count unread active — used for the notification badge number in UI
    long countByUserIdAndIsReadFalseAndIsArchivedFalse(String userId);

    // Get unread active list — used for bulk marking as read in quick panel
    List<Notification> findByUserIdAndIsReadFalseAndIsArchivedFalse(String userId);

    // Get all non-archived (used for Clear All / Archiving)
    List<Notification> findByUserIdAndIsArchivedFalse(String userId);

    // Delete all notifications for a user (Physical delete if ever needed)
    void deleteByUserId(String userId);

    // Maintenance: Delete notifications older than a specific date (Auto-Clean)
    void deleteByCreatedAtBefore(java.time.Instant date);
}