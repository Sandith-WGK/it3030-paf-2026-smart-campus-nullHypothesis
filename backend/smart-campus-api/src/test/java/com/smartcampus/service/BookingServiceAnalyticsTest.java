package com.smartcampus.service;

import com.smartcampus.dto.booking.BookingAnalyticsResponse;
import com.smartcampus.model.*;
import com.smartcampus.repository.BookingRepository;
import com.smartcampus.repository.ResourceRepository;
import com.smartcampus.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.when;

/**
 * Unit tests for BookingService.getBookingAnalytics().
 * Validates status counts, approval-rate calculation, top-resource ordering,
 * peak-hour aggregation, and day-of-week distribution.
 */
@ExtendWith(MockitoExtension.class)
class BookingServiceAnalyticsTest {

    @Mock private BookingRepository bookingRepository;
    @Mock private ResourceRepository resourceRepository;
    @Mock private UserRepository userRepository;
    @Mock private NotificationService notificationService;

    @InjectMocks
    private BookingService bookingService;

    // ── Test data ─────────────────────────────────────────────────────────────

    private static final String RES_A = "res-a";
    private static final String RES_B = "res-b";
    private static final String USER_1 = "user-1";
    private static final String USER_2 = "user-2";

    private List<Booking> sampleBookings;

    @BeforeEach
    void setUp() {
        // Monday 2026-04-20, 09:00–10:00 → APPROVED  (res-a, user-1)
        Booking b1 = Booking.builder()
                .id("b1").resourceId(RES_A).userId(USER_1)
                .date(LocalDate.of(2026, 4, 20))   // Monday
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(10, 0))
                .purpose("Meeting").status(BookingStatus.APPROVED)
                .createdAt(Instant.now()).build();

        // Monday 2026-04-20, 09:00–11:00 → APPROVED  (res-a, user-2)
        Booking b2 = Booking.builder()
                .id("b2").resourceId(RES_A).userId(USER_2)
                .date(LocalDate.of(2026, 4, 20))   // Monday
                .startTime(LocalTime.of(9, 0)).endTime(LocalTime.of(11, 0))
                .purpose("Workshop").status(BookingStatus.APPROVED)
                .createdAt(Instant.now()).build();

        // Tuesday 2026-04-21, 14:00–15:00 → REJECTED  (res-b, user-1)
        Booking b3 = Booking.builder()
                .id("b3").resourceId(RES_B).userId(USER_1)
                .date(LocalDate.of(2026, 4, 21))   // Tuesday
                .startTime(LocalTime.of(14, 0)).endTime(LocalTime.of(15, 0))
                .purpose("Training").status(BookingStatus.REJECTED)
                .rejectionReason("Conflict")
                .createdAt(Instant.now()).build();

        // Wednesday 2026-04-22, 10:00–11:00 → PENDING  (res-a, user-1)
        Booking b4 = Booking.builder()
                .id("b4").resourceId(RES_A).userId(USER_1)
                .date(LocalDate.of(2026, 4, 22))   // Wednesday
                .startTime(LocalTime.of(10, 0)).endTime(LocalTime.of(11, 0))
                .purpose("Lecture").status(BookingStatus.PENDING)
                .createdAt(Instant.now()).build();

        // Thursday 2026-04-23, 11:00–12:00 → CANCELLED  (res-b, user-2)
        Booking b5 = Booking.builder()
                .id("b5").resourceId(RES_B).userId(USER_2)
                .date(LocalDate.of(2026, 4, 23))   // Thursday
                .startTime(LocalTime.of(11, 0)).endTime(LocalTime.of(12, 0))
                .purpose("Seminar").status(BookingStatus.CANCELLED)
                .createdAt(Instant.now()).build();

        sampleBookings = List.of(b1, b2, b3, b4, b5);

        // Resource stubs
        Resource resA = Resource.builder().id(RES_A).name("Main Hall")
                .type(ResourceType.HALL).location("Block A").build();
        Resource resB = Resource.builder().id(RES_B).name("Lab 1")
                .type(ResourceType.LAB).location("Block B").build();

        // User stubs
        User user1 = User.builder().id(USER_1).name("Alice").email("alice@sc.edu").build();
        User user2 = User.builder().id(USER_2).name("Bob").email("bob@sc.edu").build();

        when(bookingRepository.findAll()).thenReturn(sampleBookings);
        when(resourceRepository.findAllById(anyList())).thenReturn(List.of(resA, resB));
        when(userRepository.findAllById(anyList())).thenReturn(List.of(user1, user2));
    }

    // ── Tests ─────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Status counts and total are correct")
    void statusCountsAreCorrect() {
        BookingAnalyticsResponse result = bookingService.getBookingAnalytics();

        assertThat(result.getTotalBookings()).isEqualTo(5);
        assertThat(result.getApprovedCount()).isEqualTo(2);
        assertThat(result.getRejectedCount()).isEqualTo(1);
        assertThat(result.getPendingCount()).isEqualTo(1);
        assertThat(result.getCancelledCount()).isEqualTo(1);
    }

    @Test
    @DisplayName("Approval rate = approved / (approved + rejected) * 100")
    void approvalRateIsCorrect() {
        BookingAnalyticsResponse result = bookingService.getBookingAnalytics();

        // approved=2, rejected=1  →  2/3 * 100 = 66.7
        assertThat(result.getApprovalRate()).isEqualTo(66.7);
    }

    @Test
    @DisplayName("Top resources are sorted descending by booking count")
    void topResourcesSortedDescending() {
        BookingAnalyticsResponse result = bookingService.getBookingAnalytics();

        List<BookingAnalyticsResponse.ResourceUsage> top = result.getTopResources();
        assertThat(top).isNotEmpty();
        // RES_A has 3 bookings, RES_B has 2 — RES_A must be first
        assertThat(top.get(0).getResourceId()).isEqualTo(RES_A);
        assertThat(top.get(0).getBookingCount()).isEqualTo(3);
        assertThat(top.get(1).getResourceId()).isEqualTo(RES_B);
        assertThat(top.get(1).getBookingCount()).isEqualTo(2);
    }

    @Test
    @DisplayName("Resource names are resolved from repository")
    void resourceNamesAreResolved() {
        BookingAnalyticsResponse result = bookingService.getBookingAnalytics();

        assertThat(result.getTopResources().get(0).getResourceName()).isEqualTo("Main Hall");
    }

    @Test
    @DisplayName("Peak hours contain correct hours")
    void peakHoursAreAggregated() {
        BookingAnalyticsResponse result = bookingService.getBookingAnalytics();

        // hours used: 9 (×2), 14 (×1), 10 (×1), 11 (×1)
        assertThat(result.getPeakHours()).isNotEmpty();

        // Hour 9 should have count 2
        long hour9Count = result.getPeakHours().stream()
                .filter(h -> h.getHour() == 9)
                .mapToLong(BookingAnalyticsResponse.HourlyCount::getCount)
                .findFirst()
                .orElse(0L);
        assertThat(hour9Count).isEqualTo(2);
    }

    @Test
    @DisplayName("Day-of-week list always contains all 7 days in MON–SUN order")
    void bookingsByDayOfWeekContainsAllDays() {
        BookingAnalyticsResponse result = bookingService.getBookingAnalytics();

        List<BookingAnalyticsResponse.DayOfWeekCount> dow = result.getBookingsByDayOfWeek();
        assertThat(dow).hasSize(7);
        assertThat(dow.get(0).getDay()).isEqualTo("MON");
        assertThat(dow.get(6).getDay()).isEqualTo("SUN");

        // Monday has 2 bookings (b1 + b2), Tuesday has 1 (b3)
        assertThat(dow.get(0).getCount()).isEqualTo(2); // MON
        assertThat(dow.get(1).getCount()).isEqualTo(1); // TUE
    }

    @Test
    @DisplayName("Top users are sorted descending by booking count")
    void topUsersAreSortedDescending() {
        BookingAnalyticsResponse result = bookingService.getBookingAnalytics();

        List<BookingAnalyticsResponse.UserBookingCount> users = result.getTopUsers();
        assertThat(users).isNotEmpty();
        // user-1 has 3 bookings (b1, b3, b4), user-2 has 2 (b2, b5)
        assertThat(users.get(0).getUserId()).isEqualTo(USER_1);
        assertThat(users.get(0).getBookingCount()).isEqualTo(3);
        assertThat(users.get(1).getUserId()).isEqualTo(USER_2);
        assertThat(users.get(1).getBookingCount()).isEqualTo(2);
    }

    @Test
    @DisplayName("User names are resolved from repository")
    void userNamesAreResolved() {
        BookingAnalyticsResponse result = bookingService.getBookingAnalytics();

        assertThat(result.getTopUsers().get(0).getUserName()).isEqualTo("Alice");
    }
}
