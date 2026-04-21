package com.smartcampus.service;

import com.smartcampus.dto.ticket.TicketCreateRequest;
import com.smartcampus.dto.ticket.TicketResponse;
import com.smartcampus.exception.TicketNotFoundException;
import com.smartcampus.model.Ticket;
import com.smartcampus.model.Priority;
import com.smartcampus.model.TicketStatus;
import com.smartcampus.repository.TicketRepository;
import com.smartcampus.exception.MaxAttachmentsExceededException;
import com.smartcampus.model.Attachment;
import org.springframework.web.multipart.MultipartFile;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;
import java.util.stream.Collectors;
import com.smartcampus.service.NotificationService;
import com.smartcampus.repository.UserRepository;
import com.smartcampus.model.User;
import com.smartcampus.model.Role;
import com.smartcampus.model.NotifType;
import com.smartcampus.model.Severity;

@Service
@RequiredArgsConstructor
public class TicketServiceImpl implements TicketService {

    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final AttachmentService attachmentService;
    private final NotificationService notificationService;

    @Override
    public TicketResponse createTicket(TicketCreateRequest request, String reporterId) {
        Ticket ticket = Ticket.builder()
                .category(request.getCategory())
                .description(request.getDescription())
                .priority(request.getPriority())
                .resourceId(request.getResourceId())
                .contactDetails(request.getContactDetails())
                .reporterId(reporterId)
                .status(TicketStatus.OPEN)
                .build();
        Ticket saved = ticketRepository.save(ticket);
        
        // Notify the reporter
        notificationService.sendNotification(
            reporterId,
            "Your maintenance ticket has been created and is awaiting review.",
            NotifType.TICKET_UPDATED,
            Severity.INFO,
            saved.getId(),
            "TICKET"
        );

        // Notify all admins about the new ticket
        List<User> admins = userRepository.findByRole(Role.MANAGER);
        User reporter = userRepository.findById(reporterId).orElse(null);
        String reporterName = (reporter != null) ? reporter.getName() : "A user";
        
        for (User admin : admins) {
            notificationService.sendNotification(
                admin.getId(),
                String.format("New Maintenance Ticket: %s has reported an issue regarding %s.", 
                              reporterName, saved.getCategory()),
                NotifType.TICKET_CREATED,
                Severity.INFO,
                saved.getId(),
                "TICKET"
            );
        }

        return mapToResponse(saved);
    }

    @Override
    public TicketResponse getTicketById(String id) {
        return mapToResponse(getTicketEntity(id));
    }

    @Override
    public List<TicketResponse> getAllTickets(TicketStatus status, Priority priority) {
        List<Ticket> tickets;
        if (status != null && priority != null) {
            tickets = ticketRepository.findByStatusAndPriority(status, priority);
        } else if (status != null) {
            tickets = ticketRepository.findByStatus(status);
        } else if (priority != null) {
            tickets = ticketRepository.findByPriority(priority);
        } else {
            tickets = ticketRepository.findAll();
        }
        return tickets.stream().map(this::mapToResponse).collect(Collectors.toList());
    }

    @Override
    public List<TicketResponse> getTicketsByReporter(String reporterId) {
        return ticketRepository.findByReporterId(reporterId).stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    public TicketResponse updateTicketStatus(String id, TicketStatus newStatus, String resolutionNote, String rejectionReason) {
        Ticket ticket = getTicketEntity(id);
        TicketStatus currentStatus = ticket.getStatus();

        boolean validTransition = false;
        if (newStatus == TicketStatus.REJECTED) {
            validTransition = true;
        } else if (currentStatus == TicketStatus.OPEN && newStatus == TicketStatus.IN_PROGRESS) {
            validTransition = true;
        } else if (currentStatus == TicketStatus.IN_PROGRESS && newStatus == TicketStatus.RESOLVED) {
            validTransition = true;
        } else if (currentStatus == TicketStatus.RESOLVED && newStatus == TicketStatus.CLOSED) {
            validTransition = true;
        }

        if (!validTransition && currentStatus != newStatus) {
            throw new IllegalArgumentException("Invalid state transition from " + currentStatus + " to " + newStatus);
        }

        ticket.setStatus(newStatus);
        if (resolutionNote != null) ticket.setResolutionNote(resolutionNote);
        if (rejectionReason != null) ticket.setRejectionReason(rejectionReason);

        if (newStatus == TicketStatus.RESOLVED || newStatus == TicketStatus.CLOSED || newStatus == TicketStatus.REJECTED) {
            if (ticket.getResolvedAt() == null) {
                ticket.setResolvedAt(Instant.now());
            }
        }

        Ticket saved = ticketRepository.save(ticket);

        // Notify the reporter about status change
        com.smartcampus.model.Severity severity = com.smartcampus.model.Severity.INFO;
        if (newStatus == TicketStatus.RESOLVED) severity = com.smartcampus.model.Severity.SUCCESS;
        if (newStatus == TicketStatus.REJECTED) severity = com.smartcampus.model.Severity.ALERT;

        notificationService.sendNotification(
                saved.getReporterId(),
                String.format("Ticket Status Update: Your ticket #%s has been marked as %s.", saved.getId(), newStatus),
                com.smartcampus.model.NotifType.TICKET_UPDATED,
                severity,
                saved.getId(),
                "TICKET"
        );

        return mapToResponse(saved);
    }

    @Override
    public TicketResponse assignTechnician(String ticketId, String technicianId) {
        Ticket ticket = getTicketEntity(ticketId);
        ticket.setAssigneeId(technicianId);
        Ticket saved = ticketRepository.save(ticket);

        // Notify the technician
        notificationService.sendNotification(
                technicianId,
                String.format("New Ticket Assignment: You have been assigned to ticket #%s.", saved.getId()),
                com.smartcampus.model.NotifType.TICKET_ASSIGNED,
                com.smartcampus.model.Severity.INFO,
                saved.getId(),
                "TICKET"
        );

        return mapToResponse(saved);
    }

    @Override
    public TicketResponse addAttachments(String ticketId, List<MultipartFile> files) {
        Ticket ticket = getTicketEntity(ticketId);

        if (ticket.getAttachments() == null) {
            ticket.setAttachments(new java.util.ArrayList<>());
        }

        if (ticket.getAttachments().size() + files.size() > 3) {
            throw new MaxAttachmentsExceededException("Ticket cannot have more than 3 attachments in total.");
        }

        for (MultipartFile file : files) {
            String fileUrl = attachmentService.storeFile(file);
            Attachment attachment = Attachment.builder()
                    .fileName(file.getOriginalFilename())
                    .fileUrl(fileUrl)
                    .uploadedAt(Instant.now())
                    .build();
            ticket.getAttachments().add(attachment);
        }

        return mapToResponse(ticketRepository.save(ticket));
    }

    @Override
    public void deleteTicket(String id) {
        Ticket ticket = getTicketEntity(id);
        ticketRepository.delete(ticket);
    }

    private Ticket getTicketEntity(String id) {
        return ticketRepository.findById(id)
                .orElseThrow(() -> new TicketNotFoundException(id));
    }

    private TicketResponse mapToResponse(Ticket ticket) {
        return TicketResponse.builder()
                .id(ticket.getId())
                .resourceId(ticket.getResourceId())
                .reporterId(ticket.getReporterId())
                .assigneeId(ticket.getAssigneeId())
                .category(ticket.getCategory())
                .description(ticket.getDescription())
                .priority(ticket.getPriority())
                .status(ticket.getStatus())
                .contactDetails(ticket.getContactDetails())
                .attachments(ticket.getAttachments())
                .resolutionNote(ticket.getResolutionNote())
                .rejectionReason(ticket.getRejectionReason())
                .createdAt(ticket.getCreatedAt())
                .resolvedAt(ticket.getResolvedAt())
                .build();
    }
}
