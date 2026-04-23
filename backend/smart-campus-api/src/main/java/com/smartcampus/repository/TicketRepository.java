package com.smartcampus.repository;

import com.smartcampus.model.Ticket;
import com.smartcampus.model.Priority;
import com.smartcampus.model.TicketStatus;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TicketRepository extends MongoRepository<Ticket, String> {

    // All tickets reported by a user
    List<Ticket> findByReporterId(String reporterId);

    // All tickets assigned to a technician - support list for dual-ID lookup (Internal ID vs TECH-XXX ID)
    List<Ticket> findByAssigneeId(String assigneeId);
    List<Ticket> findAllByAssigneeIdIn(java.util.Collection<String> assigneeIds);

    // All tickets by status — admin dashboard
    List<Ticket> findByStatus(TicketStatus status);

    // All tickets by priority
    List<Ticket> findByPriority(Priority priority);

    // All tickets for a specific resource
    List<Ticket> findByResourceId(String resourceId);

    // Filter by status AND priority
    List<Ticket> findByStatusAndPriority(TicketStatus status, Priority priority);

    // Find the latest ticket by code for sequential id generation
    java.util.Optional<Ticket> findFirstByOrderByTicketCodeDesc();
}
