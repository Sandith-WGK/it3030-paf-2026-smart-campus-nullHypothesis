package com.smartcampus.dto.ticket;

import com.smartcampus.model.Attachment;
import com.smartcampus.model.Priority;
import com.smartcampus.model.TicketStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TicketResponse {

    private String id;
    private String resourceId;
    private String reporterId;
    private String assigneeId;
    private String category;
    private String description;
    private Priority priority;
    private TicketStatus status;
    private String contactDetails;
    private List<Attachment> attachments;
    private String resolutionNote;
    private String rejectionReason;
    private Instant createdAt;
    private Instant resolvedAt;
}
