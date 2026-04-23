package com.smartcampus.dto.booking;

import com.smartcampus.model.Booking;
import com.smartcampus.model.BookingStatus;
import com.smartcampus.model.Resource;
import com.smartcampus.model.User;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingResponse {

    private String id;
    private String resourceId;
    private String resourceName;
    private String resourceType;
    private String resourceLocation;
    private String userId;
    private String userName;
    private String userEmail;
    private boolean resourceRecordDeleted;
    private boolean userRecordDeleted;
    private LocalDate date;
    private LocalTime startTime;
    private LocalTime endTime;
    private String purpose;
    private Integer expectedAttendees;
    private BookingStatus status;
    private String rejectionReason;
    private Instant createdAt;

    private static String chooseValue(String primary, String snapshot, String fallback) {
        if (primary != null && !primary.isBlank()) return primary;
        if (snapshot != null && !snapshot.isBlank()) return snapshot;
        return fallback;
    }

    public static BookingResponse from(Booking booking, Resource resource, User user) {
        return BookingResponse.builder()
                .id(booking.getId())
                .resourceId(booking.getResourceId())
                .resourceName(chooseValue(
                        resource != null ? resource.getName() : null,
                        booking.getResourceNameSnapshot(),
                        "N/A"))
                .resourceType(resource != null ? resource.getType().name() : null)
                .resourceLocation(chooseValue(
                        resource != null ? resource.getLocation() : null,
                        booking.getResourceLocationSnapshot(),
                        null))
                .userId(booking.getUserId())
                .userName(chooseValue(
                        user != null ? user.getName() : null,
                        booking.getUserNameSnapshot(),
                        "N/A"))
                .userEmail(chooseValue(
                        user != null ? user.getEmail() : null,
                        booking.getUserEmailSnapshot(),
                        null))
                .resourceRecordDeleted(resource == null)
                .userRecordDeleted(user == null || (user != null && user.isDeleted()))
                .date(booking.getDate())
                .startTime(booking.getStartTime())
                .endTime(booking.getEndTime())
                .purpose(booking.getPurpose())
                .expectedAttendees(booking.getExpectedAttendees())
                .status(booking.getStatus())
                .rejectionReason(booking.getRejectionReason())
                .createdAt(booking.getCreatedAt())
                .build();
    }
}
