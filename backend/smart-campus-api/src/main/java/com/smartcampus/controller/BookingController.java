package com.smartcampus.controller;

import com.smartcampus.dto.ApiResponse;
import com.smartcampus.dto.booking.BookingAnalyticsResponse;
import com.smartcampus.dto.booking.BookingRejectRequest;
import com.smartcampus.dto.booking.BookingRequest;
import com.smartcampus.dto.booking.BookingResponse;
import com.smartcampus.dto.booking.BookingUpdateRequest;
import com.smartcampus.model.BookingStatus;
import com.smartcampus.security.UserPrincipal;
import com.smartcampus.service.BookingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.concurrent.TimeUnit;

/**
 * REST controller for Booking Management (Module B).
 * <p>
 * Layered System: requests pass through SecurityFilterChain -> JwtAuthFilter -> this controller -> BookingService -> repositories.
 * Stateless: every request carries a JWT; no session state on the server.
 * Uniform Interface: resource-based URIs, standard HTTP methods, consistent ApiResponse wrapper.
 */
@RestController
@RequestMapping("/api/v1/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;

    // ── POST /api/v1/bookings ────────────────────────────────────────────────
    // Create a new booking (PENDING status). Returns 201 Created.

    @PostMapping
    public ResponseEntity<ApiResponse<BookingResponse>> createBooking(
            @Valid @RequestBody BookingRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {

        BookingResponse response = bookingService.createBooking(request, principal.getId());
        return ResponseEntity
                .status(HttpStatus.CREATED)
                .body(ApiResponse.success("Booking created successfully", response));
    }

    // ── GET /api/v1/bookings/my ──────────────────────────────────────────────
    // Get the authenticated user's own bookings, optionally filtered by status.

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<BookingResponse>>> getMyBookings(
            @RequestParam(required = false) BookingStatus status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @AuthenticationPrincipal UserPrincipal principal) {

        List<BookingResponse> bookings = bookingService.getMyBookings(principal.getId(), status, page, size);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noCache())
                .body(ApiResponse.success("Bookings retrieved successfully", bookings));
    }

    // ── GET /api/v1/bookings/resource-schedule ───────────────────────────────
    // Get APPROVED bookings for a specific resource on a given date.
    // Available to all authenticated users — used to show timeline availability.

    @GetMapping("/resource-schedule")
    public ResponseEntity<ApiResponse<List<BookingResponse>>> getResourceSchedule(
            @RequestParam String resourceId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @AuthenticationPrincipal UserPrincipal principal) {

        // Task 7: pass requesting user id so the service can anonymise other users' PENDING bookings
        List<BookingResponse> bookings = bookingService.getResourceSchedule(resourceId, date, principal.getId());
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(30, TimeUnit.SECONDS))
                .body(ApiResponse.success("Resource schedule retrieved", bookings));
    }

    // ── GET /api/v1/bookings ─────────────────────────────────────────────────
    // Admin-only: get all bookings with optional filters.

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<BookingResponse>>> getAllBookings(
            @RequestParam(required = false) BookingStatus status,
            @RequestParam(required = false) String resourceId,
            @RequestParam(required = false) String userId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {

        List<BookingResponse> bookings = bookingService.getAllBookings(status, resourceId, userId, date, page, size);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noCache())
                .body(ApiResponse.success("All bookings retrieved successfully", bookings));
    }

    // ── GET /api/v1/bookings/{id} ────────────────────────────────────────────
    // Get a single booking by ID. Users can only retrieve their own; admins can retrieve any.

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<BookingResponse>> getBookingById(
            @PathVariable String id,
            @AuthenticationPrincipal UserPrincipal principal) {

        boolean isAdmin = principal.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        BookingResponse response = bookingService.getBookingById(id, principal.getId(), isAdmin);
        return ResponseEntity.ok()
                .cacheControl(CacheControl.maxAge(30, TimeUnit.SECONDS))
                .body(ApiResponse.success("Booking retrieved successfully", response));
    }

    // ── PUT /api/v1/bookings/{id} ────────────────────────────────────────────
    // Update a PENDING booking (date, time, purpose, attendees). User must own the booking.

    @PutMapping("/{id}")
    public ResponseEntity<ApiResponse<BookingResponse>> updateBooking(
            @PathVariable String id,
            @Valid @RequestBody BookingUpdateRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {

        BookingResponse response = bookingService.updateBooking(id, request, principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Booking updated successfully", response));
    }

    // ── PATCH /api/v1/bookings/{id}/approve ─────────────────────────────────
    // Admin approves a PENDING booking (triggers BOOKING_APPROVED notification).

    @PatchMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<BookingResponse>> approveBooking(@PathVariable String id) {
        BookingResponse response = bookingService.approveBooking(id);
        return ResponseEntity.ok(ApiResponse.success("Booking approved successfully", response));
    }

    // ── PATCH /api/v1/bookings/{id}/reject ──────────────────────────────────
    // Admin rejects a PENDING booking with a required reason (triggers BOOKING_REJECTED notification).

    @PatchMapping("/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<BookingResponse>> rejectBooking(
            @PathVariable String id,
            @Valid @RequestBody BookingRejectRequest request) {

        BookingResponse response = bookingService.rejectBooking(id, request);
        return ResponseEntity.ok(ApiResponse.success("Booking rejected", response));
    }

    // ── PATCH /api/v1/bookings/{id}/cancel ──────────────────────────────────
    // Cancel an APPROVED booking. Users can cancel their own; admins can cancel any.

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<BookingResponse>> cancelBooking(
            @PathVariable String id,
            @AuthenticationPrincipal UserPrincipal principal) {

        boolean isAdmin = principal.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        BookingResponse response = bookingService.cancelBooking(id, principal.getId(), isAdmin);
        return ResponseEntity.ok(ApiResponse.success("Booking cancelled successfully", response));
    }

    // ── DELETE /api/v1/bookings/{id} ─────────────────────────────────────────
    // Delete a booking. Users can only delete PENDING or CANCELLED bookings they own.
    // Admins can delete any booking.

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteBooking(
            @PathVariable String id,
            @AuthenticationPrincipal UserPrincipal principal) {

        boolean isAdmin = principal.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));

        bookingService.deleteBooking(id, principal.getId(), isAdmin);
        return ResponseEntity.noContent().build();
    }

    // ── GET /api/v1/bookings/analytics ─────────────────────────────────────────
    // Admin-only: returns aggregated booking analytics used by the dashboard panel.

    @GetMapping("/analytics")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<BookingAnalyticsResponse>> getBookingAnalytics() {
        BookingAnalyticsResponse analytics = bookingService.getBookingAnalytics();
        return ResponseEntity.ok(ApiResponse.success("Analytics retrieved successfully", analytics));
    }

    // ── GET /api/v1/bookings/{id}/verify ─────────────────────────────────────
    // QR code check-in verification endpoint.
    // Validates that the booking exists, is APPROVED, and matches today's date.
    // Returns resource details, booker name, and time slot for physical verification.

    @GetMapping("/{id}/verify")
    public ResponseEntity<ApiResponse<BookingResponse>> verifyBooking(@PathVariable String id) {
        BookingResponse response = bookingService.verifyBookingForCheckIn(id);
        return ResponseEntity.ok(ApiResponse.success("Booking verified successfully", response));
    }
}
