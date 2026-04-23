package com.smartcampus.service;

import com.smartcampus.dto.comment.CommentCreateRequest;
import com.smartcampus.dto.comment.CommentResponse;
import com.smartcampus.exception.TicketNotFoundException;
import com.smartcampus.exception.CommentNotFoundException;
import com.smartcampus.exception.UnauthorizedActionException;
import com.smartcampus.model.Comment;
import com.smartcampus.model.Ticket;
import com.smartcampus.repository.CommentRepository;
import com.smartcampus.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;
import com.smartcampus.model.Ticket;
import com.smartcampus.model.User;
import com.smartcampus.model.Role;
import com.smartcampus.model.NotifType;
import com.smartcampus.model.Severity;
import com.smartcampus.repository.UserRepository;

@Service
@RequiredArgsConstructor
public class CommentServiceImpl implements CommentService {

    private final CommentRepository commentRepository;
    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Override
    public CommentResponse addComment(String ticketId, CommentCreateRequest request, String authorId) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new TicketNotFoundException(ticketId));

        Comment comment = Comment.builder()
                .ticketId(ticketId)
                .authorId(authorId)
                .content(request.getContent())
                .build();

        Comment savedComment = commentRepository.save(comment);
        
        // If commenter is NOT the reporter and ticket hasn't been responded to yet, set firstResponseAt
        if (!authorId.equals(ticket.getReporterId()) && ticket.getFirstResponseAt() == null) {
            ticket.setFirstResponseAt(Instant.now());
            ticketRepository.save(ticket);
        }
        
        // Notify the relevant party
        User author = userRepository.findById(authorId).orElse(null);
        String authorName = (author != null) ? author.getName() : "A user";

        if (!authorId.equals(ticket.getReporterId())) {
            // Admin/Technician commented -> Notify Reporter
            notificationService.sendNotification(
                ticket.getReporterId(),
                String.format("%s replied to your ticket regarding %s.", authorName, ticket.getCategory()),
                NotifType.COMMENT_ADDED,
                Severity.INFO,
                ticket.getId(),
                "TICKET"
            );
        } else {
            // Reporter commented -> Notify Assignee or Admins
            if (ticket.getAssigneeId() != null) {
                notificationService.sendNotification(
                    ticket.getAssigneeId(),
                    String.format("%s added a comment to their ticket regarding %s.", authorName, ticket.getCategory()),
                    NotifType.COMMENT_ADDED,
                    Severity.INFO,
                    ticket.getId(),
                    "TICKET"
                );
            } else {
                List<User> admins = userRepository.findByRole(Role.ADMIN);
                for (User admin : admins) {
                    notificationService.sendNotification(
                        admin.getId(),
                        String.format("%s commented on an unassigned ticket regarding %s.", authorName, ticket.getCategory()),
                        NotifType.COMMENT_ADDED,
                        Severity.INFO,
                        ticket.getId(),
                        "TICKET"
                    );
                }
            }
        }

        return mapToResponse(savedComment);
    }

    @Override
    public List<CommentResponse> getCommentsByTicket(String ticketId) {
        if (!ticketRepository.existsById(ticketId)) {
            throw new TicketNotFoundException(ticketId);
        }
        return commentRepository.findByTicketIdOrderByCreatedAtAsc(ticketId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public CommentResponse editComment(String commentId, String newContent, String requesterId) {
        Comment comment = getCommentEntity(commentId);

        if (!comment.getAuthorId().equals(requesterId)) {
            throw new UnauthorizedActionException("You can only edit your own comments");
        }

        comment.setContent(newContent);
        return mapToResponse(commentRepository.save(comment));
    }

    @Override
    public void deleteComment(String commentId, String requesterId, boolean isAdmin) {
        Comment comment = getCommentEntity(commentId);

        if (!comment.getAuthorId().equals(requesterId) && !isAdmin) {
            throw new UnauthorizedActionException("You don't have permission to delete this comment");
        }

        commentRepository.delete(comment);
    }

    private Comment getCommentEntity(String id) {
        return commentRepository.findById(id)
                .orElseThrow(() -> new CommentNotFoundException(id));
    }

    private CommentResponse mapToResponse(Comment comment) {
        return CommentResponse.builder()
                .id(comment.getId())
                .ticketId(comment.getTicketId())
                .authorId(comment.getAuthorId())
                .content(comment.getContent())
                .createdAt(comment.getCreatedAt())
                .build();
    }
}
