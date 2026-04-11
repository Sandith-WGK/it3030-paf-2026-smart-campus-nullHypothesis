package com.smartcampus.repository;

import com.smartcampus.model.Booking;
import com.smartcampus.model.BookingStatus;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Repository
public interface BookingRepository extends MongoRepository<Booking, String> {

    // Get all bookings by a specific user
    List<Booking> findByUserId(String userId);

    // Get all bookings for a specific resource
    List<Booking> findByResourceId(String resourceId);

    // Get bookings by status — admin uses this to see all PENDING requests
    List<Booking> findByStatus(BookingStatus status);

    // Get bookings for a user filtered by status
    List<Booking> findByUserIdAndStatus(String userId, BookingStatus status);

    // Get all bookings for a specific resource on a given date with a specific status
    List<Booking> findByResourceIdAndDateAndStatus(String resourceId, LocalDate date, BookingStatus status);

    // ── Conflict detection ──────────────────────────────────────────────────
    // Find any APPROVED booking for the same resource on the same date
    // where the time ranges overlap.
    // Overlap condition: existing.startTime < newEnd AND existing.endTime > newStart
    @Query("{ " +
           "  'resourceId': ?0, " +
           "  'date':       ?1, " +
           "  'status':     'APPROVED', " +
           "  'startTime':  { $lt: ?3 }, " +
           "  'endTime':    { $gt: ?2 }  " +
           "}")
    List<Booking> findConflictingBookings(
            String resourceId,
            LocalDate date,
            LocalTime newStart,
            LocalTime newEnd
    );
}
