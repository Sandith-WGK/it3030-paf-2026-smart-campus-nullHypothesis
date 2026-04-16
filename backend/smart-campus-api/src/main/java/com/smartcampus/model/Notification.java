/**
 * @author Daniru
 */
package com.smartcampus.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Document(collection = "notifications")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Notification {

    @Id
    private String id;

    @Indexed // speeds up queries by userId
    private String userId; // ref to users collection

    private NotifType type;

    private Severity severity;

    private String message; // human-readable e.g. "Your booking was approved"

    @Builder.Default
    private boolean isRead = false;

    private String referenceId; // the booking or ticket id this is about

    private String referenceType; // "BOOKING" or "TICKET"

    @CreatedDate
    private Instant createdAt;
}