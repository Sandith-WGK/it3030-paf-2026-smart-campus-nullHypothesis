package com.smartcampus.controller;

import com.smartcampus.dto.ApiResponse;
import com.smartcampus.dto.ticket.TicketCreateRequest;
import com.smartcampus.dto.ticket.TicketResponse;
import com.smartcampus.dto.ticket.TicketUpdateRequest;
import com.smartcampus.model.Priority;
import com.smartcampus.model.TicketStatus;
import com.smartcampus.security.UserPrincipal;
import com.smartcampus.service.TicketService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/tickets")
@RequiredArgsConstructor
public class TicketController {

    private final TicketService ticketService;

    @PostMapping
    public ResponseEntity<ApiResponse<TicketResponse>> createTicket(
            @Valid @RequestBody TicketCreateRequest request,
            @AuthenticationPrincipal UserPrincipal principal) {
        TicketResponse response = ticketService.createTicket(request, principal.getId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Ticket created successfully", response));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<TicketResponse>> getTicketById(@PathVariable String id) {
        TicketResponse response = ticketService.getTicketById(id);
        return ResponseEntity.ok(ApiResponse.success("Ticket retrieved successfully", response));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<List<TicketResponse>>> getAllTickets(
            @RequestParam(required = false) TicketStatus status,
            @RequestParam(required = false) Priority priority) {
        List<TicketResponse> responses = ticketService.getAllTickets(status, priority);
        return ResponseEntity.ok(ApiResponse.success("Tickets retrieved successfully", responses));
    }

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<List<TicketResponse>>> getMyTickets(
            @AuthenticationPrincipal UserPrincipal principal) {
        List<TicketResponse> responses = ticketService.getTicketsByReporter(principal.getId());
        return ResponseEntity.ok(ApiResponse.success("Your tickets retrieved successfully", responses));
    }

    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('ADMIN') or hasRole('TECHNICIAN')")
    public ResponseEntity<ApiResponse<TicketResponse>> updateTicketStatus(
            @PathVariable String id,
            @RequestBody TicketUpdateRequest request) {
        TicketResponse response = ticketService.updateTicketStatus(
                id, request.getStatus(), request.getResolutionNote(), request.getRejectionReason());
        return ResponseEntity.ok(ApiResponse.success("Ticket status updated successfully", response));
    }

    @PutMapping("/{id}/assign")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<TicketResponse>> assignTechnician(
            @PathVariable String id,
            @RequestBody TicketUpdateRequest request) {
        TicketResponse response = ticketService.assignTechnician(id, request.getAssigneeId());
        return ResponseEntity.ok(ApiResponse.success("Ticket assigned successfully", response));
    }

    @PostMapping(value = "/{id}/attachments", consumes = "multipart/form-data")
    public ResponseEntity<ApiResponse<TicketResponse>> addAttachments(
            @PathVariable String id,
            @RequestParam("files") List<MultipartFile> files) {
        if (files.size() > 3) {
            throw new com.smartcampus.exception.MaxAttachmentsExceededException("Cannot upload more than 3 attachments at once.");
        }
        TicketResponse response = ticketService.addAttachments(id, files);
        return ResponseEntity.ok(ApiResponse.success("Attachments added successfully", response));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteTicket(@PathVariable String id) {
        ticketService.deleteTicket(id);
        return ResponseEntity.noContent().build();
    }
}
