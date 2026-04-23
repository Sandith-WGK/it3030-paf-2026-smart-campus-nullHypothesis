package com.smartcampus.repository;

import java.time.LocalDate;
import java.time.LocalTime;

public interface BookingApprovalRepository {

    /**
     * Atomically transitions a booking from PENDING to APPROVED only when the
     * target slot has no overlapping APPROVED booking.
     *
     * The method uses a short-lived lock per (resourceId, date) to serialize
     * competing admin approvals for the same day/resource window.
     */
    boolean transitionPendingToApprovedIfNoOverlap(
            String bookingId,
            String resourceId,
            LocalDate date,
            LocalTime startTime,
            LocalTime endTime
    );
}
