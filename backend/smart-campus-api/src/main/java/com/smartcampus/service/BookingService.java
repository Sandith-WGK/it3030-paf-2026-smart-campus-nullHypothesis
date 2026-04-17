package com.smartcampus.service;

import com.smartcampus.dto.booking.BookingRejectRequest;
import com.smartcampus.dto.booking.BookingRequest;
import com.smartcampus.dto.booking.BookingResponse;
import com.smartcampus.dto.booking.BookingUpdateRequest;
import com.smartcampus.exception.BookingConflictException;
import com.smartcampus.exception.InvalidBookingStateException;
import com.smartcampus.exception.ResourceNotFoundException;
import com.smartcampus.exception.UnauthorizedAccessException;
import com.smartcampus.model.Booking;
import com.smartcampus.model.BookingStatus;
import com.smartcampus.model.Notification;
import com.smartcampus.model.NotifType;
import com.smartcampus.model.Resource;
import com.smartcampus.model.ResourceStatus;
import com.smartcampus.model.User;
import com.smartcampus.repository.BookingRepository;
import com.smartcampus.repository.NotificationRepository;
import com.smartcampus.repository.ResourceRepository;
import com.smartcampus.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository bookingRepository;
    private final ResourceRepository resourceRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;

    // ── Create ──────────────────────────────────────────────────────────────

    public BookingResponse createBooking(BookingRequest request, String userId) {
        Resource resource = resourceRepository.findById(request.getResourceId())
                .orElseThrow(() -> new ResourceNotFoundException("Resource", "id", request.getResourceId()));

        validateResourceAvailability(resource);
        validateTimeRange(request.getStartTime(), request.getEndTime());
        validateWithinAvailabilityWindow(resource, request.getStartTime(), request.getEndTime());
        validateCapacity(resource, request.getExpectedAttendees());
        checkForDuplicateBooking(request.getResourceId(), userId, request.getDate(), request.getStartTime(), request.getEndTime(), null);
        validateAggregateCapacity(resource, request.getResourceId(), request.getDate(), request.getStartTime(), request.getEndTime(), request.getExpectedAttendees(), null);
        checkForConflicts(request.getResourceId(), request.getDate(), request.getStartTime(), request.getEndTime(), null);

        Booking booking = Booking.builder()
                .resourceId(request.getResourceId())
                .userId(userId)
                .date(request.getDate())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .purpose(request.getPurpose())
                .expectedAttendees(request.getExpectedAttendees())
                .status(BookingStatus.PENDING)
                .build();

        Booking saved = bookingRepository.save(booking);
        User user = userRepository.findById(userId).orElse(null);
        return BookingResponse.from(saved, resource, user);
    }

    // ── Read ─────────────────────────────────────────────────────────────────

    public BookingResponse getBookingById(String bookingId, String userId, boolean isAdmin) {
        Booking booking = findBookingOrThrow(bookingId);

        if (!isAdmin && !booking.getUserId().equals(userId)) {
            throw new UnauthorizedAccessException("You can only view your own bookings");
        }

        Resource resource = resourceRepository.findById(booking.getResourceId()).orElse(null);
        User user = userRepository.findById(booking.getUserId()).orElse(null);
        return BookingResponse.from(booking, resource, user);
    }

    public List<BookingResponse> getMyBookings(String userId, BookingStatus status, int page, int size) {
        List<Booking> bookings = (status != null)
                ? bookingRepository.findByUserIdAndStatus(userId, status)
                : bookingRepository.findByUserId(userId);

        User user = userRepository.findById(userId).orElse(null);
        Map<String, Resource> resourceMap = buildResourceMap(bookings);

        List<BookingResponse> sorted = bookings.stream()
                .sorted(Comparator.comparing(Booking::getDate).reversed()
                        .thenComparing(Comparator.comparing(Booking::getStartTime).reversed()))
                .map(b -> BookingResponse.from(b, resourceMap.get(b.getResourceId()), user))
                .collect(Collectors.toList());

        return paginate(sorted, page, size);
    }

    public List<BookingResponse> getAllBookings(BookingStatus status, String resourceId,
                                                String userId, LocalDate date, int page, int size) {
        List<Booking> bookings;

        if (status != null && resourceId != null) {
            bookings = bookingRepository.findByResourceId(resourceId).stream()
                    .filter(b -> b.getStatus() == status)
                    .collect(Collectors.toList());
        } else if (status != null && userId != null) {
            bookings = bookingRepository.findByUserIdAndStatus(userId, status);
        } else if (status != null) {
            bookings = bookingRepository.findByStatus(status);
        } else if (resourceId != null) {
            bookings = bookingRepository.findByResourceId(resourceId);
        } else if (userId != null) {
            bookings = bookingRepository.findByUserId(userId);
        } else {
            bookings = bookingRepository.findAll();
        }

        if (date != null) {
            bookings = bookings.stream()
                    .filter(b -> b.getDate().equals(date))
                    .collect(Collectors.toList());
        }

        Map<String, Resource> resourceMap = buildResourceMap(bookings);
        Map<String, User> userMap = buildUserMap(bookings);

        List<BookingResponse> sorted = bookings.stream()
                .sorted(Comparator.comparing(Booking::getCreatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())))
                .map(b -> BookingResponse.from(b, resourceMap.get(b.getResourceId()), userMap.get(b.getUserId())))
                .collect(Collectors.toList());

        return paginate(sorted, page, size);
    }

    // ── Update ───────────────────────────────────────────────────────────────

    public BookingResponse updateBooking(String bookingId, BookingUpdateRequest request, String userId) {
        Booking booking = findBookingOrThrow(bookingId);

        if (!booking.getUserId().equals(userId)) {
            throw new UnauthorizedAccessException("You can only update your own bookings");
        }
        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new InvalidBookingStateException("Only pending bookings can be updated");
        }

        validateTimeRange(request.getStartTime(), request.getEndTime());

        Resource resource = resourceRepository.findById(booking.getResourceId())
                .orElseThrow(() -> new ResourceNotFoundException("Resource", "id", booking.getResourceId()));

        validateResourceAvailability(resource);
        validateWithinAvailabilityWindow(resource, request.getStartTime(), request.getEndTime());
        validateCapacity(resource, request.getExpectedAttendees());
        checkForDuplicateBooking(booking.getResourceId(), userId, request.getDate(), request.getStartTime(), request.getEndTime(), bookingId);
        validateAggregateCapacity(resource, booking.getResourceId(), request.getDate(), request.getStartTime(), request.getEndTime(), request.getExpectedAttendees(), bookingId);
        checkForConflicts(booking.getResourceId(), request.getDate(), request.getStartTime(), request.getEndTime(), bookingId);

        booking.setDate(request.getDate());
        booking.setStartTime(request.getStartTime());
        booking.setEndTime(request.getEndTime());
        booking.setPurpose(request.getPurpose());
        booking.setExpectedAttendees(request.getExpectedAttendees());

        Booking updated = bookingRepository.save(booking);
        User user = userRepository.findById(userId).orElse(null);
        return BookingResponse.from(updated, resource, user);
    }

    // ── Approve ──────────────────────────────────────────────────────────────

    public BookingResponse approveBooking(String bookingId) {
        Booking booking = findBookingOrThrow(bookingId);

        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new InvalidBookingStateException("Only pending bookings can be approved");
        }

        checkForConflicts(booking.getResourceId(), booking.getDate(),
                booking.getStartTime(), booking.getEndTime(), null);

        booking.setStatus(BookingStatus.APPROVED);
        Booking saved = bookingRepository.save(booking);

        Resource resource = resourceRepository.findById(booking.getResourceId()).orElse(null);
        String resourceName = resource != null ? resource.getName() : "resource";

        notificationRepository.save(Notification.builder()
                .userId(booking.getUserId())
                .type(NotifType.BOOKING_APPROVED)
                .message(String.format("Your booking for %s on %s has been approved.", resourceName, booking.getDate()))
                .referenceId(booking.getId())
                .referenceType("BOOKING")
                .build());

        User user = userRepository.findById(booking.getUserId()).orElse(null);
        return BookingResponse.from(saved, resource, user);
    }

    // ── Reject ───────────────────────────────────────────────────────────────

    public BookingResponse rejectBooking(String bookingId, BookingRejectRequest request) {
        Booking booking = findBookingOrThrow(bookingId);

        if (booking.getStatus() != BookingStatus.PENDING) {
            throw new InvalidBookingStateException("Only pending bookings can be rejected");
        }

        booking.setStatus(BookingStatus.REJECTED);
        booking.setRejectionReason(request.getRejectionReason());
        Booking saved = bookingRepository.save(booking);

        Resource resource = resourceRepository.findById(booking.getResourceId()).orElse(null);
        String resourceName = resource != null ? resource.getName() : "resource";

        notificationRepository.save(Notification.builder()
                .userId(booking.getUserId())
                .type(NotifType.BOOKING_REJECTED)
                .message(String.format("Your booking for %s on %s was rejected: %s",
                        resourceName, booking.getDate(), request.getRejectionReason()))
                .referenceId(booking.getId())
                .referenceType("BOOKING")
                .build());

        User user = userRepository.findById(booking.getUserId()).orElse(null);
        return BookingResponse.from(saved, resource, user);
    }

    // ── Cancel ───────────────────────────────────────────────────────────────

    public BookingResponse cancelBooking(String bookingId, String userId, boolean isAdmin) {
        Booking booking = findBookingOrThrow(bookingId);

        if (!isAdmin && !booking.getUserId().equals(userId)) {
            throw new UnauthorizedAccessException("You can only cancel your own bookings");
        }
        if (booking.getStatus() != BookingStatus.APPROVED) {
            throw new InvalidBookingStateException("Only approved bookings can be cancelled");
        }

        booking.setStatus(BookingStatus.CANCELLED);
        Booking saved = bookingRepository.save(booking);

        Resource resource = resourceRepository.findById(booking.getResourceId()).orElse(null);

        // Notify only when an admin cancels on behalf of the user
        if (isAdmin && !booking.getUserId().equals(userId)) {
            String resourceName = resource != null ? resource.getName() : "resource";
            notificationRepository.save(Notification.builder()
                    .userId(booking.getUserId())
                    .type(NotifType.BOOKING_CANCELLED)
                    .message(String.format("Your booking for %s on %s has been cancelled by an administrator.",
                            resourceName, booking.getDate()))
                    .referenceId(booking.getId())
                    .referenceType("BOOKING")
                    .build());
        }

        User user = userRepository.findById(booking.getUserId()).orElse(null);
        return BookingResponse.from(saved, resource, user);
    }

    // ── Delete ───────────────────────────────────────────────────────────────

    public void deleteBooking(String bookingId, String userId, boolean isAdmin) {
        Booking booking = findBookingOrThrow(bookingId);

        if (!isAdmin && !booking.getUserId().equals(userId)) {
            throw new UnauthorizedAccessException("You can only delete your own bookings");
        }
        if (!isAdmin) {
            if (booking.getStatus() != BookingStatus.PENDING && booking.getStatus() != BookingStatus.CANCELLED) {
                throw new InvalidBookingStateException("You can only delete pending or cancelled bookings");
            }
        }

        bookingRepository.delete(booking);
    }

    // ── Resource Schedule ─────────────────────────────────────────────────────

    public List<BookingResponse> getResourceSchedule(String resourceId, LocalDate date) {
        Resource resource = resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Resource", "id", resourceId));
        // Return both APPROVED and PENDING so the timeline shows all active bookings
        List<Booking> approved = bookingRepository
                .findByResourceIdAndDateAndStatus(resourceId, date, BookingStatus.APPROVED);
        List<Booking> pending = bookingRepository
                .findByResourceIdAndDateAndStatus(resourceId, date, BookingStatus.PENDING);
        List<Booking> bookings = new ArrayList<>();
        bookings.addAll(approved);
        bookings.addAll(pending);
        Map<String, User> userMap = buildUserMap(bookings);
        return bookings.stream()
                .map(b -> BookingResponse.from(b, resource, userMap.get(b.getUserId())))
                .collect(Collectors.toList());
    }

    // ── Private helpers ───────────────────────────────────────────────────────

    private Booking findBookingOrThrow(String bookingId) {
        return bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking", "id", bookingId));
    }

    private void validateResourceAvailability(Resource resource) {
        if (resource.getStatus() != ResourceStatus.ACTIVE) {
            throw new InvalidBookingStateException(
                    "Resource '" + resource.getName() + "' is not available for booking (status: " + resource.getStatus() + ")");
        }
    }

    private void validateTimeRange(LocalTime startTime, LocalTime endTime) {
        if (!startTime.isBefore(endTime)) {
            throw new InvalidBookingStateException("Start time must be before end time");
        }
    }

    private void validateWithinAvailabilityWindow(Resource resource, LocalTime startTime, LocalTime endTime) {
        LocalTime windowStart = resource.getAvailabilityStart();
        LocalTime windowEnd = resource.getAvailabilityEnd();

        if (windowStart == null || windowEnd == null) {
            return; // no availability window defined — all times allowed
        }

        if (startTime.isBefore(windowStart) || endTime.isAfter(windowEnd)) {
            throw new InvalidBookingStateException(String.format(
                    "Booking time is outside resource availability window (%s – %s)",
                    windowStart, windowEnd));
        }
    }

    private void validateCapacity(Resource resource, Integer expectedAttendees) {
        if (resource.getCapacity() == null || expectedAttendees == null) {
            return;
        }
        if (expectedAttendees > resource.getCapacity()) {
            throw new InvalidBookingStateException(String.format(
                    "Expected attendees (%d) exceeds resource capacity (%d)",
                    expectedAttendees, resource.getCapacity()));
        }
    }

    /**
     * Validates that the sum of expected attendees across ALL overlapping APPROVED/PENDING
     * bookings (excluding the booking being updated) does not exceed resource capacity.
     * This prevents multiple concurrent bookings from collectively overflowing the room.
     */
    private void validateAggregateCapacity(Resource resource, String resourceId,
            LocalDate date, LocalTime startTime, LocalTime endTime,
            Integer expectedAttendees, String excludeBookingId) {
        if (resource.getCapacity() == null || expectedAttendees == null) return;

        List<Booking> overlapping = bookingRepository
                .findOverlappingActiveBookings(resourceId, date, startTime, endTime);

        if (excludeBookingId != null) {
            overlapping = overlapping.stream()
                    .filter(b -> !b.getId().equals(excludeBookingId))
                    .collect(Collectors.toList());
        }

        int existingTotal = overlapping.stream()
                .mapToInt(b -> b.getExpectedAttendees() != null ? b.getExpectedAttendees() : 0)
                .sum();

        if (existingTotal + expectedAttendees > resource.getCapacity()) {
            int remaining = resource.getCapacity() - existingTotal;
            throw new InvalidBookingStateException(String.format(
                    "Total attendees (%d existing + %d new = %d) exceed resource capacity (%d). " +
                    "Only %d spot(s) remaining in this time slot.",
                    existingTotal, expectedAttendees,
                    existingTotal + expectedAttendees,
                    resource.getCapacity(), Math.max(remaining, 0)));
        }
    }

    /**
     * Throws BookingConflictException if the requesting user already has an active
     * (PENDING or APPROVED) booking for the same resource at an overlapping time.
     * Prevents duplicate bookings from the same user.
     */
    private void checkForDuplicateBooking(String resourceId, String userId,
            LocalDate date, LocalTime startTime, LocalTime endTime,
            String excludeBookingId) {
        List<Booking> duplicates = bookingRepository
                .findUserOverlappingBookings(resourceId, userId, date, startTime, endTime);

        if (excludeBookingId != null) {
            duplicates = duplicates.stream()
                    .filter(b -> !b.getId().equals(excludeBookingId))
                    .collect(Collectors.toList());
        }

        if (!duplicates.isEmpty()) {
            Booking existing = duplicates.get(0);
            throw new BookingConflictException(String.format(
                    "You already have a %s booking for this resource on %s (%s – %s). " +
                    "Please edit or cancel your existing booking instead.",
                    existing.getStatus(), existing.getDate(),
                    existing.getStartTime(), existing.getEndTime()));
        }
    }

    /**
     * Throws BookingConflictException if any APPROVED booking overlaps the requested slot.
     * The excludeBookingId parameter is reserved for future use (e.g., update self-check).
     */
    private void checkForConflicts(String resourceId, LocalDate date,
                                   LocalTime startTime, LocalTime endTime,
                                   String excludeBookingId) {
        List<Booking> conflicts = bookingRepository.findConflictingBookings(resourceId, date, startTime, endTime);

        if (excludeBookingId != null) {
            conflicts = conflicts.stream()
                    .filter(b -> !b.getId().equals(excludeBookingId))
                    .collect(Collectors.toList());
        }

        if (!conflicts.isEmpty()) {
            Booking conflict = conflicts.get(0);
            throw new BookingConflictException(String.format(
                    "Time slot conflicts with an existing approved booking (%s – %s on %s)",
                    conflict.getStartTime(), conflict.getEndTime(), conflict.getDate()));
        }
    }

    private <T> List<T> paginate(List<T> list, int page, int size) {
        if (size <= 0) return list;
        int from = page * size;
        if (from >= list.size()) return List.of();
        int to = Math.min(from + size, list.size());
        return list.subList(from, to);
    }

    private Map<String, Resource> buildResourceMap(List<Booking> bookings) {
        List<String> resourceIds = bookings.stream()
                .map(Booking::getResourceId)
                .distinct()
                .collect(Collectors.toList());
        return resourceRepository.findAllById(resourceIds).stream()
                .collect(Collectors.toMap(Resource::getId, Function.identity()));
    }

    private Map<String, User> buildUserMap(List<Booking> bookings) {
        List<String> userIds = bookings.stream()
                .map(Booking::getUserId)
                .distinct()
                .collect(Collectors.toList());
        return userRepository.findAllById(userIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));
    }
}
