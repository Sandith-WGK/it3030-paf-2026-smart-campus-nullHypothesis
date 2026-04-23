package com.smartcampus.dto.booking;

import com.smartcampus.model.Booking;
import com.smartcampus.model.BookingStatus;
import com.smartcampus.model.Resource;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PublicBookingVerificationResponse {

    private String id;
    private String resourceName;
    private String resourceLocation;
    private LocalDate date;
    private LocalTime startTime;
    private LocalTime endTime;
    private BookingStatus status;

    public static PublicBookingVerificationResponse from(Booking booking, Resource resource) {
        return PublicBookingVerificationResponse.builder()
                .id(booking.getId())
                .resourceName(resource != null && resource.getName() != null
                        ? resource.getName()
                        : booking.getResourceNameSnapshot())
                .resourceLocation(resource != null && resource.getLocation() != null
                        ? resource.getLocation()
                        : booking.getResourceLocationSnapshot())
                .date(booking.getDate())
                .startTime(booking.getStartTime())
                .endTime(booking.getEndTime())
                .status(booking.getStatus())
                .build();
    }
}
