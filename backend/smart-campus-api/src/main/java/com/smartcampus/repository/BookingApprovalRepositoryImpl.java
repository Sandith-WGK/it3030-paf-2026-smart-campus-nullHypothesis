package com.smartcampus.repository;

import com.mongodb.DuplicateKeyException;
import com.smartcampus.model.Booking;
import com.smartcampus.model.BookingStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.MongoTemplate;
import org.springframework.data.mongodb.core.query.Criteria;
import org.springframework.data.mongodb.core.query.Query;
import org.springframework.data.mongodb.core.query.Update;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

public class BookingApprovalRepositoryImpl implements BookingApprovalRepository {

    private static final long LOCK_SECONDS = 30;
    private static final String LOCK_COLLECTION = "booking_approval_locks";

    private final MongoTemplate mongoTemplate;

    public BookingApprovalRepositoryImpl(MongoTemplate mongoTemplate) {
        this.mongoTemplate = mongoTemplate;
    }

    @Override
    public boolean transitionPendingToApprovedIfNoOverlap(
            String bookingId,
            String resourceId,
            LocalDate date,
            LocalTime startTime,
            LocalTime endTime
    ) {
        String lockId = resourceId + "|" + date;
        if (!tryAcquireLock(lockId)) {
            return false;
        }

        try {
            Query conflictQuery = new Query().addCriteria(
                    Criteria.where("resourceId").is(resourceId)
                            .and("date").is(date)
                            .and("status").is(BookingStatus.APPROVED)
                            .and("startTime").lt(endTime)
                            .and("endTime").gt(startTime)
            ).limit(1);

            boolean hasConflict = mongoTemplate.exists(conflictQuery, Booking.class);
            if (hasConflict) {
                return false;
            }

            Query updateQuery = new Query().addCriteria(
                    Criteria.where("id").is(bookingId)
                            .and("status").is(BookingStatus.PENDING)
            );
            Update update = new Update().set("status", BookingStatus.APPROVED);

            return mongoTemplate.updateFirst(updateQuery, update, Booking.class).getModifiedCount() == 1;
        } finally {
            mongoTemplate.remove(Query.query(Criteria.where("_id").is(lockId)), ApprovalLock.class, LOCK_COLLECTION);
        }
    }

    private boolean tryAcquireLock(String lockId) {
        Instant now = Instant.now();
        Instant expiresAt = now.plusSeconds(LOCK_SECONDS);

        ApprovalLock lock = new ApprovalLock(lockId, expiresAt);
        try {
            mongoTemplate.insert(lock, LOCK_COLLECTION);
            return true;
        } catch (DuplicateKeyException ex) {
            Query staleQuery = new Query().addCriteria(
                    Criteria.where("_id").is(lockId).and("expiresAt").lt(now)
            );
            mongoTemplate.remove(staleQuery, ApprovalLock.class, LOCK_COLLECTION);

            try {
                mongoTemplate.insert(lock, LOCK_COLLECTION);
                return true;
            } catch (DuplicateKeyException retryEx) {
                return false;
            }
        }
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    private static class ApprovalLock {
        @Id
        private String id;
        private Instant expiresAt;
    }
}
