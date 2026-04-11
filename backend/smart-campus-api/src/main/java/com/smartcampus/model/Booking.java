package com.smartcampus.model;

import jakarta.validation.constraints.FutureOrPresent;
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
import java.time.LocalDate;
import java.time.LocalTime;

@Document(collection = "bookings")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Booking {

    @Id
    private String id;

    @NotBlank(message = "Resource ID is required")
    private String resourceId;         // ref to resources collection

    @NotBlank(message = "User ID is required")
    private String userId;             // ref to users collection

    @NotNull(message = "Booking date is required")
    @FutureOrPresent(message = "Booking date must be today or in the future")
    private LocalDate date;

    @NotNull(message = "Start time is required")
    private LocalTime startTime;

    @NotNull(message = "End time is required")
    private LocalTime endTime;

    @NotBlank(message = "Purpose is required")
    private String purpose;

    @Positive(message = "Expected attendees must be positive")
    private Integer expectedAttendees; // nullable for equipment bookings

    @Builder.Default
    private BookingStatus status = BookingStatus.PENDING;

    private String rejectionReason;    // set when status = REJECTED

    @CreatedDate
    private Instant createdAt;
}
