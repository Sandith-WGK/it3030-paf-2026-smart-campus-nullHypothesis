package com.smartcampus.service;

import com.smartcampus.dto.booking.BookingRejectRequest;
import com.smartcampus.dto.booking.BookingRequest;
import com.smartcampus.dto.booking.BookingResponse;
import com.smartcampus.dto.booking.BookingUpdateRequest;
import com.smartcampus.dto.booking.PublicBookingVerificationResponse;
import com.smartcampus.exception.BookingConflictException;
import com.smartcampus.exception.InvalidBookingStateException;
import com.smartcampus.exception.ResourceNotFoundException;
import com.smartcampus.exception.UnauthorizedAccessException;
import com.smartcampus.model.*;
import com.smartcampus.repository.BookingRepository;
import com.smartcampus.repository.ResourceRepository;
import com.smartcampus.repository.UserRepository;
import com.smartcampus.security.BookingVerificationTokenService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Query;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookingServiceTest {

    @Mock private BookingRepository bookingRepository;
    @Mock private ResourceRepository resourceRepository;
    @Mock private UserRepository userRepository;
    @Mock private NotificationService notificationService;
    @Mock private BookingVerificationTokenService bookingVerificationTokenService;
    @Mock private MongoTemplate mongoTemplate;

    @InjectMocks
    private BookingService bookingService;

    private Resource activeRoom;
    private Resource outOfServiceRoom;
    private User testUser;
    private BookingRequest validRequest;
    private final String USER_ID = "user-001";
    private final LocalDate FUTURE_DATE = LocalDate.now().plusDays(7);

    @BeforeEach
    void setUp() {
        activeRoom = Resource.builder()
                .id("res-001")
                .name("Meeting Room A")
                .type(ResourceType.ROOM)
                .capacity(20)
                .location("Block A, Level 2")
                .status(ResourceStatus.ACTIVE)
                .availabilityStart(LocalTime.of(8, 0))
                .availabilityEnd(LocalTime.of(18, 0))
                .build();

        outOfServiceRoom = Resource.builder()
                .id("res-002")
                .name("Lab 101")
                .type(ResourceType.LAB)
                .capacity(30)
                .location("Block B")
                .status(ResourceStatus.OUT_OF_SERVICE)
                .availabilityStart(LocalTime.of(8, 0))
                .availabilityEnd(LocalTime.of(18, 0))
                .build();

        testUser = User.builder()
                .id(USER_ID)
                .name("Test User")
                .email("test@sliit.lk")
                .build();

        validRequest = BookingRequest.builder()
                .resourceId("res-001")
                .date(FUTURE_DATE)
                .startTime(LocalTime.of(10, 0))
                .endTime(LocalTime.of(11, 0))
                .purpose("Team meeting for project review")
                .expectedAttendees(10)
                .build();
    }

    // ── CREATE BOOKING ──────────────────────────────────────────────────────

    @Nested
    @DisplayName("createBooking")
    class CreateBooking {

        @Test
        @DisplayName("creates booking successfully with PENDING status")
        void createsPendingBooking() {
            when(resourceRepository.findById("res-001")).thenReturn(Optional.of(activeRoom));
            when(bookingRepository.findConflictingBookings(anyString(), any(), any(), any()))
                    .thenReturn(List.of());
            when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> {
                Booking b = inv.getArgument(0);
                b.setId("booking-001");
                return b;
            });
            when(userRepository.findById(USER_ID)).thenReturn(Optional.of(testUser));
            when(userRepository.findByRole(Role.ADMIN)).thenReturn(List.of());

            BookingResponse result = bookingService.createBooking(validRequest, USER_ID);

            assertThat(result.getStatus()).isEqualTo(BookingStatus.PENDING);
            assertThat(result.getResourceName()).isEqualTo("Meeting Room A");
            assertThat(result.getUserName()).isEqualTo("Test User");
        }

        @Test
        @DisplayName("rejects booking for nonexistent resource")
        void rejectsNonexistentResource() {
            when(resourceRepository.findById("bad-id")).thenReturn(Optional.empty());

            BookingRequest request = BookingRequest.builder()
                    .resourceId("bad-id")
                    .date(FUTURE_DATE)
                    .startTime(LocalTime.of(10, 0))
                    .endTime(LocalTime.of(11, 0))
                    .purpose("Some meeting purpose here")
                    .build();

            assertThatThrownBy(() -> bookingService.createBooking(request, USER_ID))
                    .isInstanceOf(ResourceNotFoundException.class);
        }

        @Test
        @DisplayName("rejects booking for OUT_OF_SERVICE resource")
        void rejectsOutOfServiceResource() {
            when(resourceRepository.findById("res-002")).thenReturn(Optional.of(outOfServiceRoom));

            BookingRequest request = BookingRequest.builder()
                    .resourceId("res-002")
                    .date(FUTURE_DATE)
                    .startTime(LocalTime.of(10, 0))
                    .endTime(LocalTime.of(11, 0))
                    .purpose("Lab session for testing")
                    .build();

            assertThatThrownBy(() -> bookingService.createBooking(request, USER_ID))
                    .isInstanceOf(InvalidBookingStateException.class)
                    .hasMessageContaining("not available");
        }

        @Test
        @DisplayName("rejects booking when start time is after end time")
        void rejectsInvalidTimeRange() {
            when(resourceRepository.findById("res-001")).thenReturn(Optional.of(activeRoom));

            BookingRequest request = BookingRequest.builder()
                    .resourceId("res-001")
                    .date(FUTURE_DATE)
                    .startTime(LocalTime.of(14, 0))
                    .endTime(LocalTime.of(10, 0))
                    .purpose("Meeting with reversed times")
                    .build();

            assertThatThrownBy(() -> bookingService.createBooking(request, USER_ID))
                    .isInstanceOf(InvalidBookingStateException.class)
                    .hasMessageContaining("before end time");
        }

        @Test
        @DisplayName("rejects booking outside resource availability window")
        void rejectsOutsideAvailabilityWindow() {
            when(resourceRepository.findById("res-001")).thenReturn(Optional.of(activeRoom));

            BookingRequest request = BookingRequest.builder()
                    .resourceId("res-001")
                    .date(FUTURE_DATE)
                    .startTime(LocalTime.of(6, 0))
                    .endTime(LocalTime.of(7, 30))
                    .purpose("Early morning booking test")
                    .build();

            assertThatThrownBy(() -> bookingService.createBooking(request, USER_ID))
                    .isInstanceOf(InvalidBookingStateException.class)
                    .hasMessageContaining("availability window");
        }

        @Test
        @DisplayName("rejects booking when attendees exceed resource capacity")
        void rejectsExceedingCapacity() {
            when(resourceRepository.findById("res-001")).thenReturn(Optional.of(activeRoom));

            BookingRequest request = BookingRequest.builder()
                    .resourceId("res-001")
                    .date(FUTURE_DATE)
                    .startTime(LocalTime.of(10, 0))
                    .endTime(LocalTime.of(11, 0))
                    .purpose("Large group meeting overflow")
                    .expectedAttendees(50)
                    .build();

            assertThatThrownBy(() -> bookingService.createBooking(request, USER_ID))
                    .isInstanceOf(InvalidBookingStateException.class)
                    .hasMessageContaining("exceeds resource capacity");
        }

        @Test
        @DisplayName("rejects booking when expected attendees is zero")
        void rejectsZeroAttendees() {
            when(resourceRepository.findById("res-001")).thenReturn(Optional.of(activeRoom));

            BookingRequest request = BookingRequest.builder()
                    .resourceId("res-001")
                    .date(FUTURE_DATE)
                    .startTime(LocalTime.of(10, 0))
                    .endTime(LocalTime.of(11, 0))
                    .purpose("Standup meeting")
                    .expectedAttendees(0)
                    .build();

            assertThatThrownBy(() -> bookingService.createBooking(request, USER_ID))
                    .isInstanceOf(InvalidBookingStateException.class)
                    .hasMessageContaining("positive number");
        }

        @Test
        @DisplayName("rejects booking when expected attendees is missing for capacity resource")
        void rejectsMissingAttendeesForCapacityResource() {
            when(resourceRepository.findById("res-001")).thenReturn(Optional.of(activeRoom));

            BookingRequest request = BookingRequest.builder()
                    .resourceId("res-001")
                    .date(FUTURE_DATE)
                    .startTime(LocalTime.of(10, 0))
                    .endTime(LocalTime.of(11, 0))
                    .purpose("Project sync meeting")
                    .expectedAttendees(null)
                    .build();

            assertThatThrownBy(() -> bookingService.createBooking(request, USER_ID))
                    .isInstanceOf(InvalidBookingStateException.class)
                    .hasMessageContaining("required");
        }
    }

    // ── CONFLICT DETECTION ──────────────────────────────────────────────────

    @Nested
    @DisplayName("Conflict Detection")
    class ConflictDetection {

        @Test
        @DisplayName("rejects booking when time slot conflicts with approved booking")
        void rejectsConflictingSlot() {
            Booking existingApproved = Booking.builder()
                    .id("existing-001")
                    .resourceId("res-001")
                    .date(FUTURE_DATE)
                    .startTime(LocalTime.of(10, 0))
                    .endTime(LocalTime.of(11, 0))
                    .status(BookingStatus.APPROVED)
                    .build();

            when(resourceRepository.findById("res-001")).thenReturn(Optional.of(activeRoom));
            when(bookingRepository.findConflictingBookings("res-001", FUTURE_DATE,
                    LocalTime.of(10, 30), LocalTime.of(11, 30)))
                    .thenReturn(List.of(existingApproved));

            BookingRequest overlappingRequest = BookingRequest.builder()
                    .resourceId("res-001")
                    .date(FUTURE_DATE)
                    .startTime(LocalTime.of(10, 30))
                    .endTime(LocalTime.of(11, 30))
                    .purpose("Overlapping meeting request")
                    .expectedAttendees(5)
                    .build();

            assertThatThrownBy(() -> bookingService.createBooking(overlappingRequest, USER_ID))
                    .isInstanceOf(BookingConflictException.class)
                    .hasMessageContaining("conflicts");
        }

        @Test
        @DisplayName("allows booking in non-overlapping time slot")
        void allowsNonOverlapping() {
            when(resourceRepository.findById("res-001")).thenReturn(Optional.of(activeRoom));
            when(bookingRepository.findConflictingBookings(anyString(), any(), any(), any()))
                    .thenReturn(List.of());
            when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> {
                Booking b = inv.getArgument(0);
                b.setId("booking-new");
                return b;
            });
            when(userRepository.findById(USER_ID)).thenReturn(Optional.of(testUser));
            when(userRepository.findByRole(Role.ADMIN)).thenReturn(List.of());

            BookingRequest afterExisting = BookingRequest.builder()
                    .resourceId("res-001")
                    .date(FUTURE_DATE)
                    .startTime(LocalTime.of(14, 0))
                    .endTime(LocalTime.of(15, 0))
                    .purpose("Afternoon meeting, no conflict")
                    .expectedAttendees(5)
                    .build();

            BookingResponse result = bookingService.createBooking(afterExisting, USER_ID);

            assertThat(result.getStatus()).isEqualTo(BookingStatus.PENDING);
        }

        @Test
        @DisplayName("re-checks conflicts at approval time (race condition guard)")
        void checksConflictsOnApproval() {
            Booking pendingBooking = Booking.builder()
                    .id("booking-pending")
                    .resourceId("res-001")
                    .userId(USER_ID)
                    .date(FUTURE_DATE)
                    .startTime(LocalTime.of(10, 0))
                    .endTime(LocalTime.of(11, 0))
                    .status(BookingStatus.PENDING)
                    .build();

            Booking alreadyApproved = Booking.builder()
                    .id("booking-approved")
                    .resourceId("res-001")
                    .date(FUTURE_DATE)
                    .startTime(LocalTime.of(10, 0))
                    .endTime(LocalTime.of(11, 0))
                    .status(BookingStatus.APPROVED)
                    .build();

            when(resourceRepository.findById("res-001")).thenReturn(Optional.of(activeRoom));
            when(bookingRepository.findById("booking-pending")).thenReturn(Optional.of(pendingBooking));
            when(bookingRepository.findConflictingBookings("res-001", FUTURE_DATE,
                    LocalTime.of(10, 0), LocalTime.of(11, 0)))
                    .thenReturn(List.of(alreadyApproved));

            assertThatThrownBy(() -> bookingService.approveBooking("booking-pending"))
                    .isInstanceOf(BookingConflictException.class)
                    .hasMessageContaining("conflicts");
        }
    }

    // ── WORKFLOW: APPROVE / REJECT / CANCEL ─────────────────────────────────

    @Nested
    @DisplayName("Booking Workflow")
    class BookingWorkflow {

        private Booking pendingBooking;

        @BeforeEach
        void setUpPending() {
            pendingBooking = Booking.builder()
                    .id("booking-001")
                    .resourceId("res-001")
                    .userId(USER_ID)
                    .date(FUTURE_DATE)
                    .startTime(LocalTime.of(10, 0))
                    .endTime(LocalTime.of(11, 0))
                    .purpose("Team standup meeting")
                    .status(BookingStatus.PENDING)
                    .build();
        }

        @Test
        @DisplayName("PENDING -> APPROVED creates notification")
        void approveCreatesNotification() {
            when(bookingRepository.findById("booking-001")).thenReturn(Optional.of(pendingBooking));
            when(bookingRepository.findConflictingBookings(anyString(), any(), any(), any()))
                    .thenReturn(List.of());
            when(bookingRepository.transitionPendingToApprovedIfNoOverlap(
                    eq("booking-001"),
                    eq("res-001"),
                    eq(FUTURE_DATE),
                    eq(LocalTime.of(10, 0)),
                    eq(LocalTime.of(11, 0))
            )).thenReturn(true);
            when(resourceRepository.findById("res-001")).thenReturn(Optional.of(activeRoom));
            when(userRepository.findById(USER_ID)).thenReturn(Optional.of(testUser));

            BookingResponse result = bookingService.approveBooking("booking-001");

            assertThat(result.getStatus()).isEqualTo(BookingStatus.APPROVED);

            verify(notificationService).sendNotification(
                    eq(USER_ID),
                    contains("Meeting Room A"),
                    eq(NotifType.BOOKING_APPROVED),
                    eq(Severity.SUCCESS),
                    eq("booking-001"),
                    eq("BOOKING")
            );
        }

        @Test
        @DisplayName("PENDING -> REJECTED stores reason and notifies user")
        void rejectStoresReasonAndNotifies() {
            when(bookingRepository.findById("booking-001")).thenReturn(Optional.of(pendingBooking));
            when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> inv.getArgument(0));
            when(resourceRepository.findById("res-001")).thenReturn(Optional.of(activeRoom));
            when(userRepository.findById(USER_ID)).thenReturn(Optional.of(testUser));

            BookingRejectRequest rejectReq = BookingRejectRequest.builder()
                    .rejectionReason("Room is being renovated next week")
                    .build();

            BookingResponse result = bookingService.rejectBooking("booking-001", rejectReq);

            assertThat(result.getStatus()).isEqualTo(BookingStatus.REJECTED);
            assertThat(result.getRejectionReason()).isEqualTo("Room is being renovated next week");
            verify(notificationService).sendNotification(anyString(), anyString(), any(), any(), anyString(), anyString());
        }

        @Test
        @DisplayName("cannot approve a non-PENDING booking")
        void cannotApproveNonPending() {
            Booking approved = Booking.builder()
                    .id("booking-002")
                    .status(BookingStatus.APPROVED)
                    .build();
            when(bookingRepository.findById("booking-002")).thenReturn(Optional.of(approved));

            assertThatThrownBy(() -> bookingService.approveBooking("booking-002"))
                    .isInstanceOf(InvalidBookingStateException.class)
                    .hasMessageContaining("pending");
        }

        @Test
        @DisplayName("APPROVED -> CANCELLED by owner (no notification)")
        void cancelByOwner() {
            Booking approved = Booking.builder()
                    .id("booking-003")
                    .resourceId("res-001")
                    .userId(USER_ID)
                    .status(BookingStatus.APPROVED)
                    .build();

            when(bookingRepository.findById("booking-003")).thenReturn(Optional.of(approved));
            when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> inv.getArgument(0));
            User adminUser = User.builder().id("admin-001").role(Role.ADMIN).build();
            when(userRepository.findByRole(Role.ADMIN)).thenReturn(List.of(adminUser));
            when(userRepository.findById(USER_ID)).thenReturn(Optional.of(testUser));
            when(resourceRepository.findById("res-001")).thenReturn(Optional.of(activeRoom));

            BookingResponse result = bookingService.cancelBooking("booking-003", USER_ID, false);

            assertThat(result.getStatus()).isEqualTo(BookingStatus.CANCELLED);
            verify(notificationService).sendNotification(
                    eq("admin-001"),
                    contains("has cancelled their booking"),
                    eq(NotifType.BOOKING_CANCELLED),
                    eq(Severity.INFO),
                    eq("booking-003"),
                    eq("BOOKING")
            );
        }

        @Test
        @DisplayName("APPROVED -> CANCELLED by admin sends notification to owner")
        void cancelByAdminNotifiesOwner() {
            Booking approved = Booking.builder()
                    .id("booking-003")
                    .resourceId("res-001")
                    .userId(USER_ID)
                    .date(FUTURE_DATE)
                    .status(BookingStatus.APPROVED)
                    .build();

            when(bookingRepository.findById("booking-003")).thenReturn(Optional.of(approved));
            when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> inv.getArgument(0));
            when(resourceRepository.findById("res-001")).thenReturn(Optional.of(activeRoom));
            when(userRepository.findById(USER_ID)).thenReturn(Optional.of(testUser));

            bookingService.cancelBooking("booking-003", "admin-001", true);

            verify(notificationService).sendNotification(
                    eq(USER_ID),
                    anyString(),
                    eq(NotifType.BOOKING_CANCELLED),
                    eq(Severity.ALERT),
                    eq("booking-003"),
                    eq("BOOKING")
            );
        }

        @Test
        @DisplayName("cannot cancel a PENDING booking")
        void cannotCancelPending() {
            when(bookingRepository.findById("booking-001")).thenReturn(Optional.of(pendingBooking));

            assertThatThrownBy(() -> bookingService.cancelBooking("booking-001", USER_ID, false))
                    .isInstanceOf(InvalidBookingStateException.class)
                    .hasMessageContaining("approved");
        }
    }

    // ── UPDATE ──────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("updateBooking")
    class UpdateBooking {

        @Test
        @DisplayName("updates pending booking successfully")
        void updatesPendingBooking() {
            Booking pending = Booking.builder()
                    .id("booking-001")
                    .resourceId("res-001")
                    .userId(USER_ID)
                    .status(BookingStatus.PENDING)
                    .build();

            when(bookingRepository.findById("booking-001")).thenReturn(Optional.of(pending));
            when(resourceRepository.findById("res-001")).thenReturn(Optional.of(activeRoom));
            when(bookingRepository.findConflictingBookings(anyString(), any(), any(), any()))
                    .thenReturn(List.of());
            when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> inv.getArgument(0));
            when(userRepository.findById(USER_ID)).thenReturn(Optional.of(testUser));

            BookingUpdateRequest updateReq = BookingUpdateRequest.builder()
                    .date(FUTURE_DATE)
                    .startTime(LocalTime.of(14, 0))
                    .endTime(LocalTime.of(15, 0))
                    .purpose("Rescheduled team review meeting")
                    .expectedAttendees(8)
                    .build();

            BookingResponse result = bookingService.updateBooking("booking-001", updateReq, USER_ID);

            assertThat(result.getStartTime()).isEqualTo(LocalTime.of(14, 0));
        }

        @Test
        @DisplayName("prevents non-owner from updating")
        void preventsNonOwnerUpdate() {
            Booking pending = Booking.builder()
                    .id("booking-001")
                    .userId("other-user")
                    .status(BookingStatus.PENDING)
                    .build();

            when(bookingRepository.findById("booking-001")).thenReturn(Optional.of(pending));

            BookingUpdateRequest updateReq = BookingUpdateRequest.builder()
                    .date(FUTURE_DATE)
                    .startTime(LocalTime.of(14, 0))
                    .endTime(LocalTime.of(15, 0))
                    .purpose("Unauthorized update attempt here")
                    .build();

            assertThatThrownBy(() -> bookingService.updateBooking("booking-001", updateReq, USER_ID))
                    .isInstanceOf(UnauthorizedAccessException.class);
        }

        @Test
        @DisplayName("prevents update of non-PENDING booking")
        void preventsUpdateOfApproved() {
            Booking approved = Booking.builder()
                    .id("booking-001")
                    .userId(USER_ID)
                    .status(BookingStatus.APPROVED)
                    .build();

            when(bookingRepository.findById("booking-001")).thenReturn(Optional.of(approved));

            BookingUpdateRequest updateReq = BookingUpdateRequest.builder()
                    .date(FUTURE_DATE)
                    .startTime(LocalTime.of(14, 0))
                    .endTime(LocalTime.of(15, 0))
                    .purpose("Try updating approved booking")
                    .build();

            assertThatThrownBy(() -> bookingService.updateBooking("booking-001", updateReq, USER_ID))
                    .isInstanceOf(InvalidBookingStateException.class);
        }
    }

    // ── DELETE ───────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("deleteBooking")
    class DeleteBooking {

        @Test
        @DisplayName("user can delete own PENDING booking")
        void userDeletesOwnPending() {
            Booking pending = Booking.builder()
                    .id("booking-001")
                    .userId(USER_ID)
                    .status(BookingStatus.PENDING)
                    .build();

            when(bookingRepository.findById("booking-001")).thenReturn(Optional.of(pending));

            bookingService.deleteBooking("booking-001", USER_ID, false);

            verify(bookingRepository).delete(pending);
        }

        @Test
        @DisplayName("user cannot delete APPROVED booking")
        void userCannotDeleteApproved() {
            Booking approved = Booking.builder()
                    .id("booking-001")
                    .userId(USER_ID)
                    .status(BookingStatus.APPROVED)
                    .build();

            when(bookingRepository.findById("booking-001")).thenReturn(Optional.of(approved));

            assertThatThrownBy(() -> bookingService.deleteBooking("booking-001", USER_ID, false))
                    .isInstanceOf(InvalidBookingStateException.class);
        }

        @Test
        @DisplayName("admin can delete any booking regardless of status")
        void adminDeletesAny() {
            Booking approved = Booking.builder()
                    .id("booking-001")
                    .userId("other-user")
                    .status(BookingStatus.APPROVED)
                    .build();

            when(bookingRepository.findById("booking-001")).thenReturn(Optional.of(approved));

            bookingService.deleteBooking("booking-001", "admin-001", true);

            verify(bookingRepository).delete(approved);
        }
    }

    // ── RESOURCE SCHEDULE ───────────────────────────────────────────────────

    @Nested
    @DisplayName("getResourceSchedule")
    class ResourceSchedule {

        @Test
        @DisplayName("returns APPROVED and own PENDING bookings; anonymises other users' PENDING bookings")
        void returnsApprovedAndPendingBookings() {
            Booking approved = Booking.builder()
                    .id("booking-001")
                    .resourceId("res-001")
                    .userId(USER_ID)
                    .date(FUTURE_DATE)
                    .startTime(LocalTime.of(10, 0))
                    .endTime(LocalTime.of(11, 0))
                    .status(BookingStatus.APPROVED)
                    .build();

            when(resourceRepository.findById("res-001")).thenReturn(Optional.of(activeRoom));
            when(bookingRepository.findByResourceIdAndDateAndStatus("res-001", FUTURE_DATE, BookingStatus.APPROVED))
                    .thenReturn(List.of(approved));
            when(bookingRepository.findByResourceIdAndDateAndStatus("res-001", FUTURE_DATE, BookingStatus.PENDING))
                    .thenReturn(List.of());
            when(userRepository.findAllById(List.of(USER_ID))).thenReturn(List.of(testUser));

            // Task 7: pass requestingUserId as third argument
            List<BookingResponse> schedule = bookingService.getResourceSchedule("res-001", FUTURE_DATE, USER_ID);

            assertThat(schedule).hasSize(1);
            assertThat(schedule.get(0).getResourceName()).isEqualTo("Meeting Room A");
        }
    }

    @Nested
    @DisplayName("QR Verify Token")
    class VerifyToken {
        @Test
        @DisplayName("verifies approved booking by valid token")
        void verifiesByValidToken() {
            Booking approved = Booking.builder()
                    .id("booking-verify")
                    .resourceId("res-001")
                    .userId(USER_ID)
                    .date(LocalDate.now(java.time.ZoneId.of("Asia/Colombo")))
                    .startTime(LocalTime.of(10, 0))
                    .endTime(LocalTime.of(11, 0))
                    .status(BookingStatus.APPROVED)
                    .build();

            when(bookingVerificationTokenService.validateAndGetBookingId("valid-token"))
                    .thenReturn("booking-verify");
            when(bookingRepository.findById("booking-verify")).thenReturn(Optional.of(approved));
            when(resourceRepository.findById("res-001")).thenReturn(Optional.of(activeRoom));

            PublicBookingVerificationResponse response = bookingService.verifyBookingByToken("valid-token");
            assertThat(response.getStatus()).isEqualTo(BookingStatus.APPROVED);
            assertThat(response.getId()).isEqualTo("booking-verify");
            assertThat(response.getResourceName()).isEqualTo("Meeting Room A");
        }
    }

    @Nested
    @DisplayName("Pagination")
    class Pagination {
        @Test
        @DisplayName("returns paged my bookings metadata")
        void returnsPagedMyBookings() {
            Booking booking = Booking.builder()
                    .id("booking-page-1")
                    .resourceId("res-001")
                    .userId(USER_ID)
                    .date(FUTURE_DATE)
                    .startTime(LocalTime.of(9, 0))
                    .endTime(LocalTime.of(10, 0))
                    .status(BookingStatus.PENDING)
                    .build();

            when(mongoTemplate.count(any(Query.class), eq(Booking.class))).thenReturn(35L);
            when(mongoTemplate.find(any(Query.class), eq(Booking.class))).thenReturn(List.of(booking));
            when(resourceRepository.findAllById(anyList())).thenReturn(List.of(activeRoom));
            when(userRepository.findById(USER_ID)).thenReturn(Optional.of(testUser));

            var page = bookingService.getMyBookings(USER_ID, null, 0, 20);
            assertThat(page.getContent()).hasSize(1);
            assertThat(page.getTotalElements()).isEqualTo(35L);
            assertThat(page.isHasNext()).isTrue();
            assertThat(page.getTotalPages()).isEqualTo(2);
        }
    }
}
