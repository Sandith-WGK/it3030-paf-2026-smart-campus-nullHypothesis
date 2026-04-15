package com.smartcampus.model;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.time.LocalTime;

@Document(collection = "resources")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Resource {

    @Id
    private String id;

    @NotBlank(message = "Resource name is required")
    private String name;

    @NotNull(message = "Resource type is required")
    private ResourceType type;         // HALL, LAB, ROOM, EQUIPMENT

    @Positive(message = "Capacity must be a positive number")
    private Integer capacity;          // nullable for equipment

    @NotBlank(message = "Location is required")
    private String location;           // e.g. "Block A, Level 2"

    @Builder.Default
    private ResourceStatus status = ResourceStatus.ACTIVE;

    private LocalTime availabilityStart;   // e.g. 08:00
    private LocalTime availabilityEnd;     // e.g. 18:00

    private String description;

    @CreatedDate
    private Instant createdAt;
}