package com.smartcampus.service;

import com.smartcampus.dto.booking.BookingAnalyticsResponse;
import com.smartcampus.dto.booking.BookingRejectRequest;
import com.smartcampus.dto.booking.BookingRequest;
import com.smartcampus.dto.booking.BookingResponse;
import com.smartcampus.dto.booking.BookingUpdateRequest;
import com.smartcampus.dto.booking.MostBookedResourceResponse;
import com.smartcampus.dto.booking.PublicBookingVerificationResponse;
import com.smartcampus.dto.PagedResponse;
import com.smartcampus.exception.BookingConflictException;
import com.smartcampus.exception.InvalidBookingStateException;
import com.smartcampus.exception.ResourceNotFoundException;
import com.smartcampus.exception.UnauthorizedAccessException;
import com.smartcampus.model.*;
import com.smartcampus.repository.BookingRepository;
import com.smartcampus.repository.ResourceRepository;
import com.smartcampus.repository.UserRepository;
import com.smartcampus.security.BookingVerificationTokenService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Sort;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.format.TextStyle;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class BookingService {
    static final ZoneId BOOKING_ZONE = ZoneId.of("Asia/Colombo");
    static final String AUTO_EXPIRED_REJECTION_REASON = "Expired: request not approved before booking date.";

    private final BookingRepository bookingRepository;
    private final ResourceRepository resourceRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;
    private final BookingVerificationTokenService bookingVerificationTokenService;
    private final MongoTemplate mongoTemplate;

    // ── Create ──────────────────────────────────────────────────────────────

    public BookingResponse createBooking(BookingRequest request, String userId) {
        Resource resource = resourceRepository.findById(request.getResourceId())
                .orElseThrow(() -> new ResourceNotFoundException("Resource", "id", request.getResourceId()));
        User user = userRepository.findById(userId).orElse(null);

        validateResourceAvailability(resource);
        validateTimeRange(request.getStartTime(), request.getEndTime());
        validateNotPastDate(request.getDate());
        validateWithinAvailabilityWindow(resource, request.getStartTime(), request.getEndTime());
        validateRequiredAttendees(resource, request.getExpectedAttendees());
        validatePositiveAttendees(request.getExpectedAttendees());
        validateCapacity(resource, request.getExpectedAttendees());
        checkForDuplicateBooking(request.getResourceId(), userId, request.getDate(), request.getStartTime(), request.getEndTime(), null);
        checkForConflicts(request.getResourceId(), request.getDate(), request.getStartTime(), request.getEndTime(), null);

        Booking booking = Booking.builder()
                .resourceId(request.getResourceId())
                .userId(userId)
                .resourceNameSnapshot(resource.getName())
                .resourceLocationSnapshot(resource.getLocation())
                .userNameSnapshot(user != null ? user.getName() : null)
                .userEmailSnapshot(user != null ? user.getEmail() : null)
                .date(request.getDate())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .purpose(request.getPurpose())
                .expectedAttendees(request.getExpectedAttendees())
                .status(BookingStatus.PENDING)
                .build();

        Booking saved = bookingRepository.save(booking);
        
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

    public PagedResponse<BookingResponse> getMyBookings(String userId, BookingStatus status, int page, int size) {
        Query query = new Query().addCriteria(Criteria.where("userId").is(userId));
        if (status != null) {
            query.addCriteria(Criteria.where("status").is(status));
        }
        query.with(Sort.by(Sort.Direction.DESC, "date", "startTime"));
        return queryBookingsWithPagination(query, page, size, userId);
    }

    public List<BookingResponse> getMyRecentBookings(String userId, int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 10));
        Query query = new Query()
                .addCriteria(Criteria.where("userId").is(userId))
                .addCriteria(Criteria.where("status").ne(BookingStatus.PENDING))
                .with(Sort.by(Sort.Direction.DESC, "date", "startTime"))
                .limit(safeLimit);

        List<Booking> bookings = mongoTemplate.find(query, Booking.class);
        Map<String, Resource> resourceMap = buildResourceMap(bookings);
        User user = userRepository.findById(userId).orElse(null);

        return bookings.stream()
                .map(b -> BookingResponse.from(b, resourceMap.get(b.getResourceId()), user))
                .collect(Collectors.toList());
    }

    public List<MostBookedResourceResponse> getMyMostBookedResources(String userId, int limit) {
        int safeLimit = Math.max(1, Math.min(limit, 10));
        Query query = new Query()
                .addCriteria(Criteria.where("userId").is(userId))
                .addCriteria(Criteria.where("status").ne(BookingStatus.PENDING));

        List<Booking> bookings = mongoTemplate.find(query, Booking.class);
        if (bookings.isEmpty()) {
            return List.of();
        }

        Map<String, ResourceBookingAggregate> aggregates = new HashMap<>();
        for (Booking booking : bookings) {
            String key = booking.getResourceId() != null ? booking.getResourceId() : "unknown-resource";
            ResourceBookingAggregate aggregate = aggregates.computeIfAbsent(key, ignored -> new ResourceBookingAggregate());
            aggregate.count += 1;

            if (aggregate.latestBooking == null || compareBookingRecency(booking, aggregate.latestBooking) < 0) {
                aggregate.latestBooking = booking;
            }
            if ((aggregate.resourceName == null || aggregate.resourceName.isBlank())
                    && booking.getResourceNameSnapshot() != null
                    && !booking.getResourceNameSnapshot().isBlank()) {
                aggregate.resourceName = booking.getResourceNameSnapshot();
            }
        }

        List<String> missingNameIds = aggregates.entrySet().stream()
                .filter(entry -> entry.getValue().resourceName == null || entry.getValue().resourceName.isBlank())
                .map(Map.Entry::getKey)
                .filter(id -> !"unknown-resource".equals(id))
                .collect(Collectors.toList());
        if (!missingNameIds.isEmpty()) {
            Map<String, String> resourceNameMap = resourceRepository.findAllById(missingNameIds).stream()
                    .collect(Collectors.toMap(Resource::getId, Resource::getName));
            for (String resourceId : missingNameIds) {
                ResourceBookingAggregate aggregate = aggregates.get(resourceId);
                if (aggregate != null) {
                    aggregate.resourceName = resourceNameMap.getOrDefault(resourceId, resourceId);
                }
            }
        }

        return aggregates.entrySet().stream()
                .map(entry -> {
                    String resourceId = entry.getKey();
                    ResourceBookingAggregate aggregate = entry.getValue();
                    Booking latest = aggregate.latestBooking;
                    return MostBookedResourceResponse.builder()
                            .resourceId(resourceId)
                            .resourceName(
                                    aggregate.resourceName != null && !aggregate.resourceName.isBlank()
                                            ? aggregate.resourceName
                                            : resourceId
                            )
                            .bookCount(aggregate.count)
                            .lastBookedAt(latest != null ? latest.getCreatedAt() : null)
                            .latestBookingId(latest != null ? latest.getId() : null)
                            .build();
                })
                .sorted(
                        Comparator.comparingLong(MostBookedResourceResponse::getBookCount).reversed()
                                .thenComparing(
                                        MostBookedResourceResponse::getLastBookedAt,
                                        Comparator.nullsLast(Comparator.reverseOrder())
                                )
                                .thenComparing(MostBookedResourceResponse::getResourceName, Comparator.nullsLast(String::compareToIgnoreCase))
                )
                .limit(safeLimit)
                .collect(Collectors.toList());
    }

    public PagedResponse<BookingResponse> getAllBookings(BookingStatus status, String resourceId,
                                                         String userId, LocalDate bookingDate, LocalDate submittedDate,
                                                         int page, int size) {
        Query query = new Query();
        if (status != null) query.addCriteria(Criteria.where("status").is(status));
        if (resourceId != null && !resourceId.isBlank()) query.addCriteria(Criteria.where("resourceId").is(resourceId));
        if (userId != null && !userId.isBlank()) query.addCriteria(Criteria.where("userId").is(userId));
        if (bookingDate != null) query.addCriteria(Criteria.where("date").is(bookingDate));
        if (submittedDate != null) {
            Instant dayStart = submittedDate.atStartOfDay(BOOKING_ZONE).toInstant();
            Instant nextDayStart = submittedDate.plusDays(1).atStartOfDay(BOOKING_ZONE).toInstant();
            query.addCriteria(Criteria.where("createdAt")
                    .gte(Objects.requireNonNull(dayStart))
                    .lt(Objects.requireNonNull(nextDayStart)));
        }

        if (page < 0) page = 0;
        if (size <= 0) size = 20;
        if (size > 100) size = 100;

        List<Booking> filtered = new ArrayList<>(mongoTemplate.find(query, Booking.class));
        LocalDate today = LocalDate.now(BOOKING_ZONE);
        filtered.sort(adminPracticalComparator(today));

        long total = filtered.size();
        int fromIndex = Math.min(page * size, filtered.size());
        int toIndex = Math.min(fromIndex + size, filtered.size());
        List<Booking> paged = filtered.subList(fromIndex, toIndex);

        Map<String, Resource> resourceMap = buildResourceMap(paged);
        Map<String, User> userMap = buildUserMap(paged);
        List<BookingResponse> rows = paged.stream()
                .map(b -> BookingResponse.from(b, resourceMap.get(b.getResourceId()), userMap.get(b.getUserId())))
                .collect(Collectors.toList());

        int totalPages = total == 0 ? 0 : (int) Math.ceil((double) total / size);
        boolean hasNext = (long) (page + 1) * size < total;
        return PagedResponse.<BookingResponse>builder()
                .content(rows)
                .page(page)
                .size(size)
                .totalElements(total)
                .totalPages(totalPages)
                .hasNext(hasNext)
                .build();
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
        validateNotPastDate(request.getDate());

        Resource resource = resourceRepository.findById(booking.getResourceId())
                .orElseThrow(() -> new ResourceNotFoundException("Resource", "id", booking.getResourceId()));

        validateResourceAvailability(resource);
        validateWithinAvailabilityWindow(resource, request.getStartTime(), request.getEndTime());
        validateRequiredAttendees(resource, request.getExpectedAttendees());
        validatePositiveAttendees(request.getExpectedAttendees());
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

        // Guard against approval races by serializing approval decisions per
        // resource/date and re-checking overlap within that critical section.
        boolean approved = bookingRepository.transitionPendingToApprovedIfNoOverlap(
                booking.getId(),
                booking.getResourceId(),
                booking.getDate(),
                booking.getStartTime(),
                booking.getEndTime()
        );
        if (!approved) {
            throw new BookingConflictException("This slot was just approved by another request. Please refresh and try again.");
        }
        booking.setStatus(BookingStatus.APPROVED);
        Booking saved = booking;

        String resourceName = resource.getName();

        notificationService.sendNotification(
                booking.getUserId(),
                String.format("Your booking for %s on %s has been approved.", resourceName, booking.getDate()),
                NotifType.BOOKING_APPROVED,
                Severity.SUCCESS,
                booking.getId(),
                "BOOKING"
        );

        // Auto-reject overlapping PENDING requests
        List<Booking> overlappingPending = bookingRepository.findOverlappingPendingBookings(
                booking.getResourceId(), booking.getDate(), booking.getStartTime(), booking.getEndTime());

        for (Booking pending : overlappingPending) {
            if (!pending.getId().equals(booking.getId())) {
                pending.setStatus(BookingStatus.REJECTED);
                pending.setRejectionReason("Time slot has been filled by another approved request.");
                bookingRepository.save(pending);

                notificationService.sendNotification(
                        pending.getUserId(),
                        String.format("Your booking for %s on %s was rejected: %s",
                                resourceName, pending.getDate(), pending.getRejectionReason()),
                        NotifType.BOOKING_REJECTED,
                        Severity.ALERT,
                        pending.getId(),
                        "BOOKING"
                );
            }
        }

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

    // ── QR Code Check-In Verification ──────────────────────────────────────

    /**
     * Verifies a booking for QR code check-in.
     * Validates that the booking exists, is APPROVED, and its date is today.
     * Returns full booking details so the person scanning can verify identity.
     */
    public BookingResponse verifyBookingForCheckIn(String id, String requestingUserId, boolean isAdmin) {
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Booking", "id", id));

        if (!isAdmin && !booking.getUserId().equals(requestingUserId)) {
            throw new UnauthorizedAccessException("You do not have permission to verify this booking.");
        }

        if (booking.getStatus() != BookingStatus.APPROVED) {
            throw new InvalidBookingStateException(
                    String.format("This booking is not valid for check-in (status: %s). Only APPROVED bookings can be verified.",
                            booking.getStatus()));
        }

        LocalDate today = LocalDate.now(BOOKING_ZONE);
        if (!booking.getDate().equals(today)) {
            throw new InvalidBookingStateException(
                    String.format("This booking is for %s, but today is %s. Check-in is only allowed on the booking date.",
                            booking.getDate(), today));
        }

        Resource resource = resourceRepository.findById(booking.getResourceId()).orElse(null);
        User user = userRepository.findById(booking.getUserId()).orElse(null);
        return BookingResponse.from(booking, resource, user);
    }

    public String generateVerifyToken(String bookingId, String userId, boolean isAdmin) {
        Booking booking = findBookingOrThrow(bookingId);
        if (!isAdmin && !booking.getUserId().equals(userId)) {
            throw new UnauthorizedAccessException("You can only generate a QR token for your own booking");
        }
        if (booking.getStatus() != BookingStatus.APPROVED) {
            throw new InvalidBookingStateException("Only approved bookings can be verified via QR");
        }
        return bookingVerificationTokenService.generateToken(booking);
    }

    public PublicBookingVerificationResponse verifyBookingByToken(String token) {
        String bookingId = bookingVerificationTokenService.validateAndGetBookingId(token);
        Booking booking = findBookingOrThrow(bookingId);

        if (booking.getStatus() != BookingStatus.APPROVED) {
            throw new InvalidBookingStateException(
                    String.format("This booking is not valid for check-in (status: %s). Only APPROVED bookings can be verified.",
                            booking.getStatus()));
        }

        LocalDate today = LocalDate.now(BOOKING_ZONE);
        if (!booking.getDate().equals(today)) {
            throw new InvalidBookingStateException(
                    String.format("This booking is for %s, but today is %s. Check-in is only allowed on the booking date.",
                            booking.getDate(), today));
        }

        Resource resource = resourceRepository.findById(booking.getResourceId()).orElse(null);
        return PublicBookingVerificationResponse.from(booking, resource);
    }

    /**
     * Automatically expires stale pending bookings once per day.
     * A booking becomes stale when its date is before "today" in Asia/Colombo.
     */
    @Scheduled(cron = "0 5 0 * * *")
    public void expirePastPendingBookings() {
        LocalDate today = LocalDate.now(BOOKING_ZONE);
        List<Booking> stalePending = bookingRepository.findByStatusAndDateBefore(BookingStatus.PENDING, today);

        for (Booking booking : stalePending) {
            booking.setStatus(BookingStatus.REJECTED);
            if (booking.getRejectionReason() == null || booking.getRejectionReason().isBlank()) {
                booking.setRejectionReason(AUTO_EXPIRED_REJECTION_REASON);
            }
            bookingRepository.save(booking);

            Resource resource = resourceRepository.findById(booking.getResourceId()).orElse(null);
            String resourceName = resource != null ? resource.getName() : "resource";
            notificationService.sendNotification(
                    booking.getUserId(),
                    String.format("Your booking for %s on %s was rejected: %s",
                            resourceName, booking.getDate(), booking.getRejectionReason()),
                    NotifType.BOOKING_REJECTED,
                    Severity.ALERT,
                    booking.getId(),
                    "BOOKING"
            );
        }
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

    /**
     * Rejects bookings with a date in the past (server-side guard).
     * The DTO has @FutureOrPresent but that relies on timezone; this is an explicit check
     * using the Sri Lanka timezone (IST, Asia/Colombo) to match the QR verify logic.
     */
    private void validateNotPastDate(LocalDate date) {
        LocalDate today = LocalDate.now(BOOKING_ZONE);
        if (date.isBefore(today)) {
            throw new InvalidBookingStateException("Cannot book a date in the past");
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

    private void validatePositiveAttendees(Integer expectedAttendees) {
        if (expectedAttendees == null) {
            return;
        }
        if (expectedAttendees <= 0) {
            throw new InvalidBookingStateException("Expected attendees must be a positive number");
        }
    }

    private void validateRequiredAttendees(Resource resource, Integer expectedAttendees) {
        // For capacity-based resources (rooms, labs, halls), attendees are mandatory.
        if (resource.getCapacity() != null && expectedAttendees == null) {
            throw new InvalidBookingStateException("Expected attendees is required for this resource");
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

    private PagedResponse<BookingResponse> queryBookingsWithPagination(Query query, int page, int size, String fixedUserId) {
        if (page < 0) page = 0;
        if (size <= 0) size = 20;
        if (size > 100) size = 100;

        long total = mongoTemplate.count(query, Booking.class);
        Query paged = query.skip((long) page * size).limit(size);
        List<Booking> bookings = mongoTemplate.find(paged, Booking.class);

        Map<String, Resource> resourceMap = buildResourceMap(bookings);
        Map<String, User> userMap;
        if (fixedUserId != null) {
            userMap = new java.util.HashMap<>();
            userMap.put(fixedUserId, userRepository.findById(fixedUserId).orElse(null));
        } else {
            userMap = buildUserMap(bookings);
        }

        List<BookingResponse> rows = bookings.stream()
                .map(b -> BookingResponse.from(b, resourceMap.get(b.getResourceId()),
                        fixedUserId != null ? userMap.get(fixedUserId) : userMap.get(b.getUserId())))
                .collect(Collectors.toList());

        int totalPages = total == 0 ? 0 : (int) Math.ceil((double) total / size);
        boolean hasNext = (long) (page + 1) * size < total;

        return PagedResponse.<BookingResponse>builder()
                .content(rows)
                .page(page)
                .size(size)
                .totalElements(total)
                .totalPages(totalPages)
                .hasNext(hasNext)
                .build();
    }

    private Comparator<Booking> adminPracticalComparator(LocalDate today) {
        Comparator<Booking> pendingComparator = Comparator
                .comparing((Booking b) -> b.getDate(), Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(b -> b.getStartTime(), Comparator.nullsLast(Comparator.naturalOrder()))
                .thenComparing(b -> b.getCreatedAt(), Comparator.nullsLast(Comparator.naturalOrder()));

        Comparator<Booking> nonPendingComparator = Comparator
                .comparing((Booking b) -> b.getDate(), Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(b -> b.getStartTime(), Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(b -> b.getCreatedAt(), Comparator.nullsLast(Comparator.reverseOrder()));

        return (a, b) -> {
            boolean aPending = a.getStatus() == BookingStatus.PENDING;
            boolean bPending = b.getStatus() == BookingStatus.PENDING;
            if (aPending != bPending) {
                return aPending ? -1 : 1;
            }

            if (aPending) {
                int aUrgency = pendingUrgencyBucket(a.getDate(), today);
                int bUrgency = pendingUrgencyBucket(b.getDate(), today);
                if (aUrgency != bUrgency) {
                    return Integer.compare(aUrgency, bUrgency);
                }
                return pendingComparator.compare(a, b);
            }

            return nonPendingComparator.compare(a, b);
        };
    }

    private int pendingUrgencyBucket(LocalDate bookingDate, LocalDate today) {
        if (bookingDate == null) return 3;
        if (bookingDate.isBefore(today)) return 0;
        if (bookingDate.isEqual(today)) return 1;
        return 2;
    }

    private int compareBookingRecency(Booking a, Booking b) {
        Comparator<Booking> recencyComparator = Comparator
                .comparing(Booking::getDate, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(Booking::getStartTime, Comparator.nullsLast(Comparator.reverseOrder()))
                .thenComparing(Booking::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder()));
        return recencyComparator.compare(a, b);
    }

    private static class ResourceBookingAggregate {
        private long count;
        private String resourceName;
        private Booking latestBooking;
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
