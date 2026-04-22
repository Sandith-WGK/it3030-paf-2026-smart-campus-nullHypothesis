package com.smartcampus.service;

import com.smartcampus.dto.comment.CommentCreateRequest;
import com.smartcampus.dto.comment.CommentResponse;

import java.util.List;

public interface CommentService {
    CommentResponse addComment(String ticketId, CommentCreateRequest request, String authorId);
    List<CommentResponse> getCommentsByTicket(String ticketId);
    CommentResponse editComment(String commentId, String newContent, String requesterId);
    void deleteComment(String commentId, String requesterId, boolean isAdmin);
}
