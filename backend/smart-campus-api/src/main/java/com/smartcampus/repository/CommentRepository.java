package com.smartcampus.repository;

import com.smartcampus.model.Comment;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface CommentRepository extends MongoRepository<Comment, String> {

    // Get all comments for a ticket, oldest first (chronological order)
    List<Comment> findByTicketIdOrderByCreatedAtAsc(String ticketId);

    // Delete all comments when a ticket is deleted
    void deleteByTicketId(String ticketId);

    // Count comments on a ticket
    long countByTicketId(String ticketId);
}