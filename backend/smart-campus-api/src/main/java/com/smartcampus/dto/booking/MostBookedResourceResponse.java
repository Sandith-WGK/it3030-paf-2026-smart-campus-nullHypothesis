package com.smartcampus.dto.booking;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MostBookedResourceResponse {
    private String resourceId;
    private String resourceName;
    private long bookCount;
    private Instant lastBookedAt;
    private String latestBookingId;
}
