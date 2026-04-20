package com.smartcampus.controller;

import com.smartcampus.dto.ApiResponse;
import com.smartcampus.dto.comment.CommentCreateRequest;
import com.smartcampus.dto.comment.CommentResponse;
import com.smartcampus.security.UserPrincipal;
import com.smartcampus.service.CommentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/tickets/{ticketId}/comments")
@RequiredArgsConstructor
public class CommentController {

    private final CommentService commentService;

    @PostMapping
    public ResponseEntity<ApiResponse<CommentResponse>> addComment(
            @PathVariable String ticketId,
            @Valid @RequestBody CommentCreateRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        CommentResponse response = commentService.addComment(ticketId, request, principal.getId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Comment added successfully", response));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<CommentResponse>>> getCommentsByTicket(
            @PathVariable String ticketId) {
        List<CommentResponse> responses = commentService.getCommentsByTicket(ticketId);
        return ResponseEntity.ok(ApiResponse.success("Comments retrieved successfully", responses));
    }

    @PutMapping("/{commentId}")
    public ResponseEntity<ApiResponse<CommentResponse>> editComment(
            @PathVariable String ticketId,
            @PathVariable String commentId,
            @Valid @RequestBody CommentCreateRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        CommentResponse response = commentService.editComment(commentId, request.getContent(), principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Comment updated successfully", response));
    }

    @DeleteMapping("/{commentId}")
    public ResponseEntity<Void> deleteComment(
            @PathVariable String ticketId,
            @PathVariable String commentId,
            @AuthenticationPrincipal UserPrincipal principal) {
        boolean isAdmin = principal.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"));
                
        commentService.deleteComment(commentId, principal.getId(), isAdmin);
        return ResponseEntity.noContent().build();
    }
}
