package com.smartcampus.service;

import com.smartcampus.model.NotifType;
import com.smartcampus.model.Role;
import com.smartcampus.model.Severity;
import com.smartcampus.model.User;
import com.smartcampus.repository.UserRepository;
import com.smartcampus.repository.BookingRepository;
import com.smartcampus.repository.TicketRepository;
import com.smartcampus.model.Booking;
import com.smartcampus.model.BookingStatus;
import com.smartcampus.model.Ticket;
import com.smartcampus.model.TicketStatus;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.Instant;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Service
public class UserService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final NotificationService notificationService;
    private final UserActivityService userActivityService;
    private final BookingRepository bookingRepository;
    private final TicketRepository ticketRepository;

    @Autowired
    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder, 
                       EmailService emailService, NotificationService notificationService,
                       UserActivityService userActivityService,
                       BookingRepository bookingRepository,
                       TicketRepository ticketRepository) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.notificationService = notificationService;
        this.userActivityService = userActivityService;
        this.bookingRepository = bookingRepository;
        this.ticketRepository = ticketRepository;
    }

    public List<User> getAllUsers() {
        // Only return active, non-deleted users for the management panel
        List<User> users = userRepository.findAll().stream()
                .filter(u -> !u.isDeleted())
                .collect(java.util.stream.Collectors.toList());
        
        boolean changed = false;
        
        for (User user : users) {
            if (user.getRole() == Role.TECHNICIAN && (user.getTechnicianId() == null || user.getTechnicianId().isBlank())) {
                long techCount = userRepository.countByRole(Role.TECHNICIAN);
                user.setTechnicianId(String.format("TECH-%03d", techCount + 1));
                userRepository.save(user);
                changed = true;
            } else if (user.getRole() != Role.TECHNICIAN && user.getTechnicianId() != null) {
                // Cleanup: Clear IDs if role was downgraded without clearing ID
                user.setTechnicianId(null);
                userRepository.save(user);
                changed = true;
            }
        }
        
        return changed ? getAllUsers() : users; // Recursive call to get refreshed list if count changed
    }

    public User getUserById(String id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));
    }

    public User createUser(String email, String name, Role role, String password) {
        // Prevent duplicates
        if (userRepository.existsByEmail(email)) {
             throw new RuntimeException("User already exists with email: " + email);
        }

        User.UserBuilder builder = User.builder()
                .email(email)
                .name(name)
                .role(role != null ? role : Role.USER)
                .createdAt(Instant.now());

        if (role == Role.TECHNICIAN) {
            long techCount = userRepository.countByRole(Role.TECHNICIAN);
            builder.technicianId(String.format("TECH-%03d", techCount + 1));
        }

        if (password != null && !password.isBlank()) {
            // Admin is creating a LOCAL user with a password
            builder.provider("LOCAL")
                   .password(passwordEncoder.encode(password))
                   .enabled(true); // Admin-created users skip email verification
        } else {
            // Stub user for Google OAuth flow
            builder.provider("GOOGLE");
        }

        return userRepository.save(builder.build());
    }

    public User updateUser(String id, String email, String name, Role role, String password, String picture, boolean requireEmailReverification) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            boolean isLocalProvider = "LOCAL".equalsIgnoreCase(user.getProvider());
            Role oldRole = user.getRole();
            
            // Re-verification logic if email changes
            if (StringUtils.hasText(email) && !email.equalsIgnoreCase(user.getEmail())) {
                System.out.println("DEBUG: Email change attempted. Old: " + user.getEmail() + " New: " + email);
                // Policy: Only LOCAL users can change their email. Google identities are fixed.
                if (!isLocalProvider) {
                    System.out.println("DEBUG: Rejecting email change for non-local provider: " + user.getProvider());
                    throw new RuntimeException("Email addresses for Google-linked accounts cannot be modified here.");
                }

                // Prevent duplicate email collisions (Mongo has unique index on email)
                userRepository.findByEmail(email).ifPresent(existing -> {
                    if (!existing.getId().equals(user.getId())) {
                        throw new IllegalArgumentException("Email is already in use.");
                    }
                });
                
                user.setEmail(email);
                if (requireEmailReverification) {
                    user.setEnabled(false);
                    // Standardize on 6-digit numeric verification code
                    String verificationCode = String.valueOf((int)((Math.random() * 900000) + 100000));
                    user.setVerificationCode(verificationCode);

                    // Trigger the actual email sending
                    try {
                        emailService.sendVerificationEmail(email, verificationCode);
                    } catch (Exception e) {
                        System.err.println("Failed to send verification email during profile update: " + e.getMessage());
                    }
                } else {
                    // Admin-managed email update for another user should not lock the account.
                    user.setEnabled(true);
                    user.setVerificationCode(null);
                }
            }
            
            if (StringUtils.hasText(name)) user.setName(name);
            
            // Role can be changed for both LOCAL and GOOGLE users
            if (role != null) {
                user.setRole(role);
                // Clear technicianId if the user is no longer a technician
                if (role != Role.TECHNICIAN) {
                    user.setTechnicianId(null);
                }
            }

            // Auto-generate ID if user becomes a technician and doesn't have one
            if (user.getRole() == Role.TECHNICIAN && (user.getTechnicianId() == null || user.getTechnicianId().isBlank())) {
                long techCount = userRepository.countByRole(Role.TECHNICIAN);
                user.setTechnicianId(String.format("TECH-%03d", techCount + 1));
            }
            
            // Handle Profile Picture
            if (StringUtils.hasText(picture)) {
                user.setPicture(picture);
                user.setHasCustomAvatar(true);
            }
            
            // Handle Password Update
            if (StringUtils.hasText(password)) {
                if (!isLocalProvider) {
                    throw new RuntimeException("Passwords cannot be set for Google-linked accounts.");
                }
                user.setPassword(passwordEncoder.encode(password));
            }
            
            // Security Notification Trigger
            boolean emailChanged = StringUtils.hasText(email) && !email.equalsIgnoreCase(user.getEmail());
            boolean passwordChanged = StringUtils.hasText(password);
            boolean roleChanged = role != null && role != oldRole;

            User savedUser = userRepository.save(user);

            if (roleChanged) {
                // Notify User of role change
                notificationService.sendNotification(
                    user.getId(),
                    String.format("Security: Your account access level has been updated to %S.", role),
                    NotifType.SECURITY_UPDATE,
                    Severity.ALERT,
                    id,
                    "USER"
                );

                // If promoted to Admin, notify other admins for audit
                if (role == Role.ADMIN) {
                    List<User> admins = userRepository.findByRole(Role.ADMIN);
                    for (User admin : admins) {
                        if (!admin.getId().equals(id)) {
                            notificationService.sendNotification(
                                admin.getId(),
                                String.format("Audit: %s has been promoted to ADMINISTRATOR role.", user.getName()),
                                NotifType.SECURITY_UPDATE,
                                Severity.ALERT,
                                id,
                                "USER"
                            );
                        }
                    }
                }
            }

            if (emailChanged || passwordChanged) {
                // Tier 2: Log security update
                userActivityService.logActivity(user.getId(), "SECURITY_UPDATE");

                if (requireEmailReverification) {
                    // SELF UPDATE -> Notify Admins
                    List<User> admins = userRepository.findByRole(Role.ADMIN);
                    for (User admin : admins) {
                        notificationService.sendNotification(
                            admin.getId(), 
                            "Security: User " + user.getName() + " updated their credentials (" + (emailChanged ? "Email" : "") + (emailChanged && passwordChanged ? " & " : "") + (passwordChanged ? "Password" : "") + ")",
                            NotifType.SECURITY_UPDATE,
                            Severity.ALERT,
                            user.getId(),
                            "USER"
                        );
                    }
                } else {
                    // ADMIN UPDATE -> Notify User
                    notificationService.sendNotification(
                        user.getId(),
                        "Security: An administrator has updated your account credentials. If this was not you, please contact support immediately.",
                        NotifType.SECURITY_UPDATE,
                        Severity.ALERT,
                        id,
                        "USER"
                    );
                }
            }

            return savedUser;
        }
        throw new RuntimeException("User not found with id: " + id);
    }

    public User updateUserPreferences(String identifier, com.smartcampus.dto.UserPreferenceUpdateRequest request) {
        // Find the primary record being updated
        User primaryUser = userRepository.findById(identifier)
                .orElseGet(() -> userRepository.findByEmail(identifier).orElse(null));

        if (primaryUser == null) {
            throw new RuntimeException("User not found: " + identifier);
        }

        // Find ALL records sharing the same email to ensure global synchronization
        String email = primaryUser.getEmail();
        List<User> linkedUsers = (email != null) ? userRepository.findAllByEmail(email) : List.of(primaryUser);
        
        User savedPrimary = null;
        for (User u : linkedUsers) {
            com.smartcampus.model.UserPreference prefs = u.getPreferences();
            if (prefs == null) {
                prefs = new com.smartcampus.model.UserPreference();
            }

            if (request.getTheme() != null) prefs.setTheme(request.getTheme());
            if (request.getEnableSounds() != null) prefs.setEnableSounds(request.getEnableSounds());
            if (request.getEnableEmailNotifications() != null) prefs.setEnableEmailNotifications(request.getEnableEmailNotifications());
            if (request.getEnablePushNotifications() != null) prefs.setEnablePushNotifications(request.getEnablePushNotifications());

            u.setPreferences(prefs);
            User saved = userRepository.save(u);
            if (u.getId().equals(primaryUser.getId())) {
                savedPrimary = saved;
            }
        }

        return savedPrimary != null ? savedPrimary : primaryUser;
    }

    public User updateNotificationPreferences(String userId, com.smartcampus.model.NotificationPreference prefs) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));
        user.setNotificationPreferences(prefs);
        return userRepository.save(user);
    }

    public List<com.smartcampus.model.UserActivity> getUserActivity(String userId) {
        return userActivityService.getUserActivity(userId);
    }

    public void deleteUser(String id) {
        User user = getUserById(id);

        // 1. Booking Cleanup: Cancel all future bookings before deleting the user
        java.time.LocalDate today = java.time.LocalDate.now();
        java.time.LocalTime now = java.time.LocalTime.now();
        
        List<Booking> futureBookings = bookingRepository.findByUserId(id).stream()
                .filter(b -> b.getDate().isAfter(today) || 
                           (b.getDate().isEqual(today) && b.getStartTime().isAfter(now)))
                .filter(b -> b.getStatus() == BookingStatus.APPROVED || b.getStatus() == BookingStatus.PENDING)
                .collect(java.util.stream.Collectors.toList());
        
        for (Booking booking : futureBookings) {
            booking.setStatus(BookingStatus.REJECTED);
            booking.setRejectionReason("User account deleted.");
            bookingRepository.save(booking);
        }

        // 2. Ticket Cleanup
        // Unassign tickets assigned to this technician
        List<Ticket> assignedTickets = ticketRepository.findByAssigneeId(id);
        for (Ticket ticket : assignedTickets) {
            ticket.setAssigneeId(null);
            if (ticket.getStatus() == TicketStatus.IN_PROGRESS) {
                ticket.setStatus(TicketStatus.OPEN);
            }
            ticketRepository.save(ticket);
        }

        // 3. Hard Delete the User
        userRepository.delete(user);
        System.out.println("DEBUG: Hard deleted user from database: " + id);
    }
}
