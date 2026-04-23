package com.smartcampus.service;

import com.smartcampus.dto.booking.BookingRequest;
import com.smartcampus.dto.booking.BookingResponse;
import com.smartcampus.exception.BookingConflictException;
import com.smartcampus.exception.InvalidBookingStateException;
import com.smartcampus.model.*;
import com.smartcampus.repository.BookingRepository;
import com.smartcampus.repository.ResourceRepository;
import com.smartcampus.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/**
 * Tests that verify the integration between Member 1's Resource management
 * and Member 2's Booking workflow. These focus on cross-cutting concerns:
 * resource status affecting bookings, availability windows, capacity checks,
 * and the full create-approve-conflict lifecycle.
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("Booking ↔ Resource Integration")
class BookingResourceIntegrationTest {

    @Mock private BookingRepository bookingRepository;
    @Mock private ResourceRepository resourceRepository;
    @Mock private UserRepository userRepository;
    @Mock private NotificationService notificationService;

    @InjectMocks
    private BookingService bookingService;

    @InjectMocks
    private ResourceService resourceService;

    private final String USER_ID = "user-integration";
    private final LocalDate FUTURE_DATE = LocalDate.now().plusDays(10);

    private User testUser;

    @BeforeEach
    void setUp() {
        testUser = User.builder()
                .id(USER_ID)
                .name("Integration Tester")
                .email("integtest@sliit.lk")
                .build();
    }

    // ── Scenario 1: Resource status change blocks new bookings ──────────────

    @Nested
    @DisplayName("Scenario: Admin marks resource OUT_OF_SERVICE → booking rejected")
    class ResourceStatusBlocksBooking {

        @Test
        @DisplayName("booking fails when resource was just set to OUT_OF_SERVICE")
        void bookingFailsAfterStatusChange() {
            Resource room = Resource.builder()
                    .id("room-A1")
                    .name("Lecture Hall A1")
                    .type(ResourceType.HALL)
                    .capacity(100)
                    .location("Block A, Level 1")
                    .status(ResourceStatus.ACTIVE)
                    .availabilityStart(LocalTime.of(8, 0))
                    .availabilityEnd(LocalTime.of(18, 0))
                    .build();

            // Simulate: admin changes status to OUT_OF_SERVICE
            when(resourceRepository.findById("room-A1")).thenReturn(Optional.of(room));
            when(resourceRepository.save(any(Resource.class))).thenAnswer(inv -> inv.getArgument(0));

            Resource updated = resourceService.updateResourceStatus("room-A1", ResourceStatus.OUT_OF_SERVICE);
            assertThat(updated.getStatus()).isEqualTo(ResourceStatus.OUT_OF_SERVICE);

            // Now user tries to book the same resource
            when(resourceRepository.findById("room-A1")).thenReturn(Optional.of(updated));

            BookingRequest request = BookingRequest.builder()
                    .resourceId("room-A1")
                    .date(FUTURE_DATE)
                    .startTime(LocalTime.of(10, 0))
                    .endTime(LocalTime.of(11, 0))
                    .purpose("Lecture on Data Structures")
                    .expectedAttendees(50)
                    .build();

            assertThatThrownBy(() -> bookingService.createBooking(request, USER_ID))
                    .isInstanceOf(InvalidBookingStateException.class)
                    .hasMessageContaining("not available");
        }
    }

    // ── Scenario 2: Resource availability window constrains booking times ───

    @Nested
    @DisplayName("Scenario: Resource availability window constrains bookable times")
    class AvailabilityWindowConstraint {

        private Resource labWithNarrowWindow;

        @BeforeEach
        void setUp() {
            labWithNarrowWindow = Resource.builder()
                    .id("lab-101")
                    .name("Physics Lab 101")
                    .type(ResourceType.LAB)
                    .capacity(30)
                    .location("Block C, Level 2")
                    .status(ResourceStatus.ACTIVE)
                    .availabilityStart(LocalTime.of(9, 0))
                    .availabilityEnd(LocalTime.of(16, 0))
                    .build();
        }

        @Test
        @DisplayName("booking within window succeeds")
        void withinWindowSucceeds() {
            when(resourceRepository.findById("lab-101")).thenReturn(Optional.of(labWithNarrowWindow));
            when(bookingRepository.findConflictingBookings(anyString(), any(), any(), any()))
                    .thenReturn(List.of());
            when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> {
                Booking b = inv.getArgument(0);
                b.setId("b-ok");
                return b;
            });
            when(userRepository.findById(USER_ID)).thenReturn(Optional.of(testUser));
            when(userRepository.findByRole(Role.ADMIN)).thenReturn(List.of());

            BookingRequest request = BookingRequest.builder()
                    .resourceId("lab-101")
                    .date(FUTURE_DATE)
                    .startTime(LocalTime.of(10, 0))
                    .endTime(LocalTime.of(12, 0))
                    .purpose("Physics lab practical session")
                    .expectedAttendees(25)
                    .build();

            BookingResponse result = bookingService.createBooking(request, USER_ID);
            assertThat(result).isNotNull();
            assertThat(result.getResourceName()).isEqualTo("Physics Lab 101");
        }

        @Test
        @DisplayName("booking starting before window opens is rejected")
        void beforeWindowRejected() {
            when(resourceRepository.findById("lab-101")).thenReturn(Optional.of(labWithNarrowWindow));

            BookingRequest request = BookingRequest.builder()
                    .resourceId("lab-101")
                    .date(FUTURE_DATE)
                    .startTime(LocalTime.of(7, 0))
                    .endTime(LocalTime.of(9, 30))
                    .purpose("Early access lab session")
                    .expectedAttendees(10)
                    .build();

            assertThatThrownBy(() -> bookingService.createBooking(request, USER_ID))
                    .isInstanceOf(InvalidBookingStateException.class)
                    .hasMessageContaining("availability window")
                    .hasMessageContaining("09:00")
                    .hasMessageContaining("16:00");
        }

        @Test
        @DisplayName("booking ending after window closes is rejected")
        void afterWindowRejected() {
            when(resourceRepository.findById("lab-101")).thenReturn(Optional.of(labWithNarrowWindow));

            BookingRequest request = BookingRequest.builder()
                    .resourceId("lab-101")
                    .date(FUTURE_DATE)
                    .startTime(LocalTime.of(15, 0))
                    .endTime(LocalTime.of(17, 0))
                    .purpose("Late evening lab session")
                    .expectedAttendees(10)
                    .build();

            assertThatThrownBy(() -> bookingService.createBooking(request, USER_ID))
                    .isInstanceOf(InvalidBookingStateException.class)
                    .hasMessageContaining("availability window");
        }
    }

    // ── Scenario 3: Capacity validation across resource types ───────────────

    @Nested
    @DisplayName("Scenario: Resource capacity constrains booking attendees")
    class CapacityConstraint {

        @Test
        @DisplayName("booking for small room rejects too many attendees")
        void smallRoomRejectsLargeGroup() {
            Resource smallRoom = Resource.builder()
                    .id("room-S1")
                    .name("Study Room S1")
                    .type(ResourceType.ROOM)
                    .capacity(6)
                    .location("Library, Level 3")
                    .status(ResourceStatus.ACTIVE)
                    .availabilityStart(LocalTime.of(8, 0))
                    .availabilityEnd(LocalTime.of(22, 0))
                    .build();

            when(resourceRepository.findById("room-S1")).thenReturn(Optional.of(smallRoom));

            BookingRequest request = BookingRequest.builder()
                    .resourceId("room-S1")
                    .date(FUTURE_DATE)
                    .startTime(LocalTime.of(14, 0))
                    .endTime(LocalTime.of(16, 0))
                    .purpose("Group study session together")
                    .expectedAttendees(15)
                    .build();

            assertThatThrownBy(() -> bookingService.createBooking(request, USER_ID))
                    .isInstanceOf(InvalidBookingStateException.class)
                    .hasMessageContaining("exceeds resource capacity");
        }

        @Test
        @DisplayName("equipment booking with null capacity and null attendees succeeds")
        void equipmentBookingIgnoresCapacity() {
            Resource projector = Resource.builder()
                    .id("equip-P1")
                    .name("Portable Projector")
                    .type(ResourceType.EQUIPMENT)
                    .capacity(null)
                    .location("IT Store")
                    .status(ResourceStatus.ACTIVE)
                    .availabilityStart(LocalTime.of(8, 0))
                    .availabilityEnd(LocalTime.of(18, 0))
                    .build();

            when(resourceRepository.findById("equip-P1")).thenReturn(Optional.of(projector));
            when(bookingRepository.findConflictingBookings(anyString(), any(), any(), any()))
                    .thenReturn(List.of());
            when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> {
                Booking b = inv.getArgument(0);
                b.setId("b-equip");
                return b;
            });
            when(userRepository.findById(USER_ID)).thenReturn(Optional.of(testUser));
            when(userRepository.findByRole(Role.ADMIN)).thenReturn(List.of());

            BookingRequest request = BookingRequest.builder()
                    .resourceId("equip-P1")
                    .date(FUTURE_DATE)
                    .startTime(LocalTime.of(10, 0))
                    .endTime(LocalTime.of(12, 0))
                    .purpose("Projector for seminar presentation")
                    .expectedAttendees(null)
                    .build();

            BookingResponse result = bookingService.createBooking(request, USER_ID);
            assertThat(result).isNotNull();
        }
    }

    // ── Scenario 4: Full booking lifecycle with conflict guard ──────────────

    @Nested
    @DisplayName("Scenario: Two bookings for same resource/slot — only one can be approved")
    class ConflictLifecycle {

        @Test
        @DisplayName("second approval fails due to conflict with first approved booking")
        void secondApprovalFailsDueToConflict() {
            Booking firstBooking = Booking.builder()
                    .id("booking-A")
                    .resourceId("res-001")
                    .userId("user-A")
                    .date(FUTURE_DATE)
                    .startTime(LocalTime.of(10, 0))
                    .endTime(LocalTime.of(12, 0))
                    .status(BookingStatus.PENDING)
                    .build();

            Booking secondBooking = Booking.builder()
                    .id("booking-B")
                    .resourceId("res-001")
                    .userId("user-B")
                    .date(FUTURE_DATE)
                    .startTime(LocalTime.of(11, 0))
                    .endTime(LocalTime.of(13, 0))
                    .status(BookingStatus.PENDING)
                    .build();

            Resource room = Resource.builder()
                    .id("res-001")
                    .name("Conference Room")
                    .type(ResourceType.ROOM)
                    .capacity(20)
                    .location("Block D")
                    .status(ResourceStatus.ACTIVE)
                    .availabilityStart(LocalTime.of(8, 0))
                    .availabilityEnd(LocalTime.of(18, 0))
                    .build();

            // Step 1: Approve first booking (no conflicts exist yet)
            when(bookingRepository.findById("booking-A")).thenReturn(Optional.of(firstBooking));
            when(bookingRepository.findConflictingBookings("res-001", FUTURE_DATE,
                    LocalTime.of(10, 0), LocalTime.of(12, 0)))
                    .thenReturn(List.of());
            when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> inv.getArgument(0));
            when(resourceRepository.findById("res-001")).thenReturn(Optional.of(room));
            when(userRepository.findById("user-A")).thenReturn(Optional.of(
                    User.builder().id("user-A").name("User A").email("a@sliit.lk").build()));

            BookingResponse first = bookingService.approveBooking("booking-A");
            assertThat(first.getStatus()).isEqualTo(BookingStatus.APPROVED);

            // Step 2: Try to approve second booking — conflict detection kicks in
            Booking firstNowApproved = Booking.builder()
                    .id("booking-A")
                    .resourceId("res-001")
                    .date(FUTURE_DATE)
                    .startTime(LocalTime.of(10, 0))
                    .endTime(LocalTime.of(12, 0))
                    .status(BookingStatus.APPROVED)
                    .build();

            when(bookingRepository.findById("booking-B")).thenReturn(Optional.of(secondBooking));
            when(bookingRepository.findConflictingBookings("res-001", FUTURE_DATE,
                    LocalTime.of(11, 0), LocalTime.of(13, 0)))
                    .thenReturn(List.of(firstNowApproved));

            assertThatThrownBy(() -> bookingService.approveBooking("booking-B"))
                    .isInstanceOf(BookingConflictException.class)
                    .hasMessageContaining("conflicts");
        }

        @Test
        @DisplayName("adjacent (non-overlapping) bookings can both be approved")
        void adjacentBookingsBothApproved() {
            Booking morningBooking = Booking.builder()
                    .id("booking-morning")
                    .resourceId("res-001")
                    .userId("user-A")
                    .date(FUTURE_DATE)
                    .startTime(LocalTime.of(9, 0))
                    .endTime(LocalTime.of(11, 0))
                    .status(BookingStatus.PENDING)
                    .build();

            Booking afternoonBooking = Booking.builder()
                    .id("booking-afternoon")
                    .resourceId("res-001")
                    .userId("user-B")
                    .date(FUTURE_DATE)
                    .startTime(LocalTime.of(11, 0))
                    .endTime(LocalTime.of(13, 0))
                    .status(BookingStatus.PENDING)
                    .build();

            Resource room = Resource.builder()
                    .id("res-001")
                    .name("Conference Room")
                    .type(ResourceType.ROOM)
                    .capacity(20)
                    .location("Block D")
                    .status(ResourceStatus.ACTIVE)
                    .availabilityStart(LocalTime.of(8, 0))
                    .availabilityEnd(LocalTime.of(18, 0))
                    .build();

            // Approve morning booking
            when(bookingRepository.findById("booking-morning")).thenReturn(Optional.of(morningBooking));
            when(bookingRepository.findConflictingBookings("res-001", FUTURE_DATE,
                    LocalTime.of(9, 0), LocalTime.of(11, 0)))
                    .thenReturn(List.of());
            when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> inv.getArgument(0));
            when(resourceRepository.findById("res-001")).thenReturn(Optional.of(room));
            when(userRepository.findById("user-A")).thenReturn(Optional.of(
                    User.builder().id("user-A").name("User A").email("a@sliit.lk").build()));

            BookingResponse morningResult = bookingService.approveBooking("booking-morning");
            assertThat(morningResult.getStatus()).isEqualTo(BookingStatus.APPROVED);

            // Approve afternoon booking — no conflict because times are adjacent
            when(bookingRepository.findById("booking-afternoon")).thenReturn(Optional.of(afternoonBooking));
            when(bookingRepository.findConflictingBookings("res-001", FUTURE_DATE,
                    LocalTime.of(11, 0), LocalTime.of(13, 0)))
                    .thenReturn(List.of());
            when(userRepository.findById("user-B")).thenReturn(Optional.of(
                    User.builder().id("user-B").name("User B").email("b@sliit.lk").build()));

            BookingResponse afternoonResult = bookingService.approveBooking("booking-afternoon");
            assertThat(afternoonResult.getStatus()).isEqualTo(BookingStatus.APPROVED);
        }
    }

    // ── Scenario 5: Booking response enrichment from Resource data ──────────

    @Nested
    @DisplayName("Scenario: Booking responses include resource metadata")
    class ResponseEnrichment {

        @Test
        @DisplayName("booking response includes resource name, type, and location")
        void responseIncludesResourceMetadata() {
            Resource room = Resource.builder()
                    .id("res-enriched")
                    .name("Innovation Lab")
                    .type(ResourceType.LAB)
                    .capacity(40)
                    .location("Block E, Level 4")
                    .status(ResourceStatus.ACTIVE)
                    .availabilityStart(LocalTime.of(8, 0))
                    .availabilityEnd(LocalTime.of(20, 0))
                    .build();

            when(resourceRepository.findById("res-enriched")).thenReturn(Optional.of(room));
            when(bookingRepository.findConflictingBookings(anyString(), any(), any(), any()))
                    .thenReturn(List.of());
            when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> {
                Booking b = inv.getArgument(0);
                b.setId("b-enrich");
                return b;
            });
            when(userRepository.findById(USER_ID)).thenReturn(Optional.of(testUser));
            when(userRepository.findByRole(Role.ADMIN)).thenReturn(List.of());

            BookingRequest request = BookingRequest.builder()
                    .resourceId("res-enriched")
                    .date(FUTURE_DATE)
                    .startTime(LocalTime.of(10, 0))
                    .endTime(LocalTime.of(12, 0))
                    .purpose("Innovation workshop session")
                    .expectedAttendees(30)
                    .build();

            BookingResponse result = bookingService.createBooking(request, USER_ID);

            assertThat(result.getResourceName()).isEqualTo("Innovation Lab");
            assertThat(result.getResourceType()).isEqualTo("LAB");
            assertThat(result.getResourceLocation()).isEqualTo("Block E, Level 4");
            assertThat(result.getUserName()).isEqualTo("Integration Tester");
        }

        @Test
        @DisplayName("booking response handles deleted resource gracefully")
        void handlesDeletedResource() {
            Booking booking = Booking.builder()
                    .id("b-orphan")
                    .resourceId("res-deleted")
                    .userId(USER_ID)
                    .resourceNameSnapshot("Old Networking Lab")
                    .userNameSnapshot("Integration Tester")
                    .date(FUTURE_DATE)
                    .startTime(LocalTime.of(10, 0))
                    .endTime(LocalTime.of(11, 0))
                    .status(BookingStatus.PENDING)
                    .build();

            when(bookingRepository.findById("b-orphan")).thenReturn(Optional.of(booking));
            when(resourceRepository.findById("res-deleted")).thenReturn(Optional.empty());
            when(userRepository.findById(USER_ID)).thenReturn(Optional.of(testUser));

            BookingResponse result = bookingService.getBookingById("b-orphan", USER_ID, false);

            assertThat(result.getResourceName()).isEqualTo("Old Networking Lab");
            assertThat(result.isResourceRecordDeleted()).isTrue();
        }
    }
}
