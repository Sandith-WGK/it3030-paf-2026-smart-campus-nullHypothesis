package com.smartcampus.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "tickets")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Ticket {

    @Id
    private String id;

    private String ticketCode;

    private String resourceId;         

    @NotBlank(message = "Reporter ID is required")
    private String reporterId;         

    private String assigneeId;         
    @NotBlank(message = "Category is required")
    private String category;          

    @NotBlank(message = "Description is required")
    private String description;

    @NotNull(message = "Priority is required")
    private Priority priority;         

    @Builder.Default
    private TicketStatus status = TicketStatus.OPEN;

    private String contactDetails;     

    
    @Builder.Default
    @Size(max = 3, message = "Maximum 3 attachments allowed")
    private List<Attachment> attachments = new ArrayList<>();

    private String resolutionNote;     

    private String rejectionReason;    

    @CreatedDate
    private Instant createdAt;

    private Instant resolvedAt; 
    
    private Instant firstResponseAt;
}