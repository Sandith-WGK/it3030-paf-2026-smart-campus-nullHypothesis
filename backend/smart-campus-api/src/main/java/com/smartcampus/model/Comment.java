package com.smartcampus.model;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

// Separate collection — NOT embedded — because comments can grow
// large and need individual edit/delete operations
@Document(collection = "comments")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Comment {

    @Id
    private String id;

    @NotBlank(message = "Ticket ID is required")
    private String ticketId;       // ref to tickets collection

    @NotBlank(message = "Author ID is required")
    private String authorId;       // ref to users collection

    @NotBlank(message = "Comment content cannot be empty")
    private String content;

    @CreatedDate
    private Instant createdAt;
}