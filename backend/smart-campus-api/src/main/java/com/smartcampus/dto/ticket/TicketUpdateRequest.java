package com.smartcampus.dto.ticket;

import com.smartcampus.model.TicketStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TicketUpdateRequest {

    private TicketStatus status;
    private String assigneeId;
    private String resolutionNote;
    private String rejectionReason;
}
