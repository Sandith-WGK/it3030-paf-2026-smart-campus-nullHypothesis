package com.smartcampus.service;

import com.smartcampus.dto.booking.BookingAnalyticsResponse;
import com.smartcampus.dto.booking.BookingRejectRequest;
import com.smartcampus.dto.booking.BookingRequest;
import com.smartcampus.dto.booking.BookingResponse;
import com.smartcampus.dto.booking.BookingUpdateRequest;
import com.smartcampus.exception.BookingConflictException;
import com.smartcampus.exception.InvalidBookingStateException;
import com.smartcampus.exception.ResourceNotFoundException;
import com.smartcampus.exception.UnauthorizedAccessException;
import com.smartcampus.model.*;
import com.smartcampus.repository.BookingRepository;
import com.smartcampus.repository.ResourceRepository;
import com.smartcampus.repository.UserRepository;
import com.smartcampus.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BookingService {

    private final BookingRepository bookingRepository;
    private final ResourceRepository resourceRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    // ── Create ──────────────────────────────────────────────────────────────

    public BookingResponse createBooking(BookingRequest request, String userId) {
        Resource resource = resourceRepository.findById(request.getResourceId())
                .orElseThrow(() -> new ResourceNotFoundException("Resource", "id", request.getResourceId()));

        validateResourceAvailability(resource);
        validateTimeRange(request.getStartTime(), request.getEndTime());
        validateWithinAvailabilityWindow(resource, request.getStartTime(), request.getEndTime());
        validateCapacity(resource, request.getExpectedAttendees());
        checkForDuplicateBooking(request.getResourceId(), userId, request.getDate(), request.getStartTime(), request.getEndTime(), null);
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
        
        // Notify all admins about the new booking
        List<User> admins = userRepository.findByRole(Role.ADMIN);
        String userName = user != null ? user.getName() : "A user";
        String resourceName = resource != null ? resource.getName() : "resource";
        for (User admin : admins) {
            notificationService.sendNotification(
                    admin.getId(),
                    String.format("%s has requested a booking for %s on %s", userName, resourceName, saved.getDate()),
                    NotifType.BOOKING_CREATED,
                    Severity.INFO,
                    saved.getId(),
                    "BOOKING"
            );
        }
        
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

        Resource resource = resourceRepository.findById(booking.getResourceId())
                .orElseThrow(() -> new ResourceNotFoundException("Resource", "id", booking.getResourceId()));

        // Exclusive mode: block if any other APPROVED booking overlaps this slot.
        // PENDING bookings are not counted — admin may approve whichever one they choose first.
        checkForConflicts(booking.getResourceId(), booking.getDate(),
                booking.getStartTime(), booking.getEndTime(), booking.getId());

        booking.setStatus(BookingStatus.APPROVED);
        Booking saved = bookingRepository.save(booking);

        String resourceName = resource.getName();

        notificationService.sendNotification(
                booking.getUserId(),
                String.format("Your booking for %s on %s has been approved.", resourceName, booking.getDate()),
                NotifType.BOOKING_APPROVED,
                Severity.SUCCESS,
                booking.getId(),
                "BOOKING"
        );

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

        notificationService.sendNotification(
                booking.getUserId(),
                String.format("Your booking for %s on %s was rejected: %s",
                        resourceName, booking.getDate(), request.getRejectionReason()),
                NotifType.BOOKING_REJECTED,
                Severity.ALERT,
                booking.getId(),
                "BOOKING"
        );

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
            notificationService.sendNotification(
                    booking.getUserId(),
                    String.format("Your booking for %s on %s has been cancelled by an administrator.",
                            resourceName, booking.getDate()),
                    NotifType.BOOKING_CANCELLED,
                    Severity.ALERT,
                    booking.getId(),
                    "BOOKING"
            );
        } else if (!isAdmin && booking.getUserId().equals(userId)) {
            // Notify all admins when a user cancels their own booking
            List<User> admins = userRepository.findByRole(Role.ADMIN);
            User user = userRepository.findById(userId).orElse(null);
            String userName = user != null ? user.getName() : "A user";
            String resourceName = resource != null ? resource.getName() : "resource";
            
            for (User admin : admins) {
                notificationService.sendNotification(
                        admin.getId(),
                        String.format("%s has cancelled their booking for %s on %s", 
                                userName, resourceName, saved.getDate()),
                        NotifType.BOOKING_CANCELLED,
                        Severity.INFO,
                        saved.getId(),
                        "BOOKING"
                );
            }
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

    // ── Analytics ─────────────────────────────────────────────────────────────

    /**
     * Aggregates all booking data for the admin analytics dashboard.
     * Performs in-memory stream aggregation over all bookings.
     */
    public BookingAnalyticsResponse getBookingAnalytics() {
        List<Booking> all = bookingRepository.findAll();

        // ── Status counts ──────────────────────────────────────────────────────
        long approved  = all.stream().filter(b -> b.getStatus() == BookingStatus.APPROVED).count();
        long rejected  = all.stream().filter(b -> b.getStatus() == BookingStatus.REJECTED).count();
        long cancelled = all.stream().filter(b -> b.getStatus() == BookingStatus.CANCELLED).count();
        long pending   = all.stream().filter(b -> b.getStatus() == BookingStatus.PENDING).count();
        long total     = all.size();

        double approvalRate = (approved + rejected) == 0
                ? 0.0
                : Math.round((approved * 100.0 / (approved + rejected)) * 10.0) / 10.0;

        // ── Top 5 resources ────────────────────────────────────────────────────
        Map<String, Long> resourceCounts = all.stream()
                .collect(Collectors.groupingBy(Booking::getResourceId, Collectors.counting()));

        // Resolve resource names in one batch query
        List<String> topResourceIds = resourceCounts.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(5)
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());

        Map<String, Resource> resourceMap = resourceRepository.findAllById(topResourceIds).stream()
                .collect(Collectors.toMap(Resource::getId, Function.identity()));

        List<BookingAnalyticsResponse.ResourceUsage> topResources = topResourceIds.stream()
                .map(id -> {
                    Resource r = resourceMap.get(id);
                    String name = r != null ? r.getName() : id;
                    return new BookingAnalyticsResponse.ResourceUsage(id, name, resourceCounts.get(id));
                })
                .collect(Collectors.toList());

        // ── Peak hours (0-23) ──────────────────────────────────────────────────
        Map<Integer, Long> hourMap = all.stream()
                .filter(b -> b.getStartTime() != null)
                .collect(Collectors.groupingBy(
                        b -> b.getStartTime().getHour(),
                        Collectors.counting()));

        List<BookingAnalyticsResponse.HourlyCount> peakHours = hourMap.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> new BookingAnalyticsResponse.HourlyCount(e.getKey(), e.getValue()))
                .collect(Collectors.toList());

        // ── Bookings by day-of-week ────────────────────────────────────────────
        // Preserve MON→SUN order using a LinkedHashMap seeded with all 7 days
        Map<DayOfWeek, Long> dowMap = all.stream()
                .filter(b -> b.getDate() != null)
                .collect(Collectors.groupingBy(
                        b -> b.getDate().getDayOfWeek(),
                        Collectors.counting()));

        List<BookingAnalyticsResponse.DayOfWeekCount> bookingsByDay = new ArrayList<>();
        for (DayOfWeek dow : DayOfWeek.values()) {
            String label = dow.getDisplayName(TextStyle.SHORT, Locale.ENGLISH).toUpperCase();
            bookingsByDay.add(new BookingAnalyticsResponse.DayOfWeekCount(
                    label, dowMap.getOrDefault(dow, 0L)));
        }

        // ── Top 5 users ────────────────────────────────────────────────────────
        Map<String, Long> userCounts = all.stream()
                .collect(Collectors.groupingBy(Booking::getUserId, Collectors.counting()));

        List<String> topUserIds = userCounts.entrySet().stream()
                .sorted(Map.Entry.<String, Long>comparingByValue().reversed())
                .limit(5)
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());

        Map<String, User> userMap = userRepository.findAllById(topUserIds).stream()
                .collect(Collectors.toMap(User::getId, Function.identity()));

        List<BookingAnalyticsResponse.UserBookingCount> topUsers = topUserIds.stream()
                .map(id -> {
                    User u = userMap.get(id);
                    String name = u != null ? u.getName() : id;
                    return new BookingAnalyticsResponse.UserBookingCount(id, name, userCounts.get(id));
                })
                .collect(Collectors.toList());

        return BookingAnalyticsResponse.builder()
                .totalBookings(total)
                .approvedCount(approved)
                .rejectedCount(rejected)
                .cancelledCount(cancelled)
                .pendingCount(pending)
                .approvalRate(approvalRate)
                .topResources(topResources)
                .peakHours(peakHours)
                .bookingsByDayOfWeek(bookingsByDay)
                .topUsers(topUsers)
                .build();
    }

    // ── Resource Schedule ─────────────────────────────────────────────────────

    // Task 7: Privacy fix for getResourceSchedule.
    // APPROVED bookings are returned in full (all authenticated users need to see them to
    // judge availability before booking).
    // PENDING bookings: the requesting user sees their own in full (so the frontend
    // userDuplicate check still works). Other users' PENDING bookings are anonymised —
    // we expose only timing/status so they know the slot is "tentatively busy", but
    // no userId, name, email, or purpose is leaked.
    public List<BookingResponse> getResourceSchedule(String resourceId, LocalDate date, String requestingUserId) {
        Resource resource = resourceRepository.findById(resourceId)
                .orElseThrow(() -> new ResourceNotFoundException("Resource", "id", resourceId));

        List<Booking> approved = bookingRepository
                .findByResourceIdAndDateAndStatus(resourceId, date, BookingStatus.APPROVED);
        List<Booking> pending = bookingRepository
                .findByResourceIdAndDateAndStatus(resourceId, date, BookingStatus.PENDING);

        // Build a user map only for the approved bookings + the requesting user's own pending ones
        List<Booking> fullDetailBookings = new ArrayList<>();
        fullDetailBookings.addAll(approved);
        pending.stream()
               .filter(b -> b.getUserId().equals(requestingUserId))
               .forEach(fullDetailBookings::add);

        Map<String, User> userMap = buildUserMap(fullDetailBookings);

        List<BookingResponse> result = new ArrayList<>();

        // Full detail for APPROVED bookings
        for (Booking b : approved) {
            result.add(BookingResponse.from(b, resource, userMap.get(b.getUserId())));
        }

        // PENDING: own = full detail, others = anonymous "Busy" block
        for (Booking b : pending) {
            if (b.getUserId().equals(requestingUserId)) {
                result.add(BookingResponse.from(b, resource, userMap.get(b.getUserId())));
            } else {
                // Strip PII — only expose timing so the frontend avoids the slot
                result.add(BookingResponse.builder()
                        .id(b.getId())
                        .resourceId(b.getResourceId())
                        .resourceName(resource.getName())
                        .date(b.getDate())
                        .startTime(b.getStartTime())
                        .endTime(b.getEndTime())
                        .status(b.getStatus())
                        // userId / userName / userEmail / purpose intentionally omitted
                        .build());
            }
        }

        return result;
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
                    "Time slot conflicts with an existing approved booking [ID: %s] (%s – %s on %s)",
                    conflict.getId(), conflict.getStartTime(), conflict.getEndTime(), conflict.getDate()));
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
