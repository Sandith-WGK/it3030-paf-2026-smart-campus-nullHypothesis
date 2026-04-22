package com.smartcampus.service;

import com.smartcampus.dto.ticket.TicketCreateRequest;
import com.smartcampus.dto.ticket.TicketResponse;
import com.smartcampus.model.Priority;
import com.smartcampus.model.TicketStatus;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface TicketService {
    TicketResponse createTicket(TicketCreateRequest request, String reporterId);
    TicketResponse getTicketById(String id);
    List<TicketResponse> getAllTickets(TicketStatus status, Priority priority);
    List<TicketResponse> getTicketsByReporter(String reporterId);
    List<TicketResponse> getTicketsByAssignee(String assigneeId);
    TicketResponse updateTicketStatus(String id, TicketStatus newStatus, String resolutionNote, String rejectionReason, String authenticatedUserId, boolean isAdmin);
    TicketResponse assignTechnician(String ticketId, String technicianId);
    TicketResponse addAttachments(String ticketId, List<MultipartFile> files);
    void deleteTicket(String id);
}
