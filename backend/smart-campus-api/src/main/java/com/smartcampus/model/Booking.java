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
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

@Document(collection = "bookings")
// Race-condition guard: only one APPROVED booking may occupy an exact
// (resourceId, date, startTime, endTime) slot.
// Multiple PENDING requests are allowed for admin arbitration.
@CompoundIndexes({
    @CompoundIndex(
        name = "unique_slot",
        def  = "{'resourceId': 1, 'date': 1, 'startTime': 1, 'endTime': 1}",
        unique = true,
        partialFilter = "{ 'status': 'APPROVED' }"
    )
})
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

    // Immutable audit snapshots captured at booking creation time.
    private String resourceNameSnapshot;
    private String resourceLocationSnapshot;
    private String userNameSnapshot;
    private String userEmailSnapshot;

    @NotNull(message = "Booking date is required")
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
