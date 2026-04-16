/**
 * @author Daniru
 */
package com.smartcampus.dto;

import com.smartcampus.model.NotifType;
import com.smartcampus.model.Notification;
import com.smartcampus.model.Severity;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationDto {
    private String id;
    private String userId;
    private NotifType type;
    private Severity severity;
    private String message;
    private boolean isRead;
    private String referenceId;
    private String referenceType;
    private Instant createdAt;

    public static NotificationDto from(Notification notification) {
        if (notification == null) return null;
        return NotificationDto.builder()
                .id(notification.getId())
                .userId(notification.getUserId())
                .type(notification.getType())
                .severity(notification.getSeverity())
                .message(notification.getMessage())
                .isRead(notification.isRead())
                .referenceId(notification.getReferenceId())
                .referenceType(notification.getReferenceType())
                .createdAt(notification.getCreatedAt())
                .build();
    }
}
