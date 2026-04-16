package com.smartcampus.service;

import com.smartcampus.dto.comment.CommentCreateRequest;
import com.smartcampus.dto.comment.CommentResponse;
import com.smartcampus.exception.TicketNotFoundException;
import com.smartcampus.exception.CommentNotFoundException;
import com.smartcampus.exception.UnauthorizedActionException;
import com.smartcampus.model.Comment;
import com.smartcampus.repository.CommentRepository;
import com.smartcampus.repository.TicketRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CommentServiceImpl implements CommentService {

    private final CommentRepository commentRepository;
    private final TicketRepository ticketRepository;

    @Override
    public CommentResponse addComment(String ticketId, CommentCreateRequest request, String authorId) {
        if (!ticketRepository.existsById(ticketId)) {
            throw new TicketNotFoundException(ticketId);
        }

        Comment comment = Comment.builder()
                .ticketId(ticketId)
                .authorId(authorId)
                .content(request.getContent())
                .build();

        return mapToResponse(commentRepository.save(comment));
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
