package com.smartcampus.dto.booking;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO returned by GET /api/v1/bookings/analytics.
 * All aggregation is performed in BookingService using Java streams.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingAnalyticsResponse {

    // ── Status summary ─────────────────────────────────────────────────────────
    private long totalBookings;
    private long approvedCount;
    private long rejectedCount;
    private long cancelledCount;
    private long pendingCount;

    /** approved / (approved + rejected) × 100  — NaN-safe, 0 when denominator is 0 */
    private double approvalRate;

    // ── Top resources ──────────────────────────────────────────────────────────
    /** Top 5 most-booked resources, sorted by bookingCount descending */
    private List<ResourceUsage> topResources;

    // ── Time patterns ──────────────────────────────────────────────────────────
    /** Bookings per start-hour (0-23) */
    private List<HourlyCount> peakHours;

    /** Bookings per day-of-week (MON … SUN) */
    private List<DayOfWeekCount> bookingsByDayOfWeek;

    // ── Top users ──────────────────────────────────────────────────────────────
    /** Top 5 users by total booking count */
    private List<UserBookingCount> topUsers;

    // ══ Nested static types ════════════════════════════════════════════════════

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class ResourceUsage {
        private String resourceId;
        private String resourceName;
        private long bookingCount;
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class HourlyCount {
        /** 0-23 */
        private int hour;
        private long count;
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class DayOfWeekCount {
        /** "MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN" */
        private String day;
        private long count;
    }

    @Data
    @AllArgsConstructor
    @NoArgsConstructor
    public static class UserBookingCount {
        private String userId;
        private String userName;
        private long bookingCount;
    }
}
