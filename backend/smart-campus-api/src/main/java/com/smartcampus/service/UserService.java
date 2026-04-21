package com.smartcampus.service;

import com.smartcampus.model.NotifType;
import com.smartcampus.model.Role;
import com.smartcampus.model.Severity;
import com.smartcampus.model.User;
import com.smartcampus.repository.UserRepository;
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

    @Autowired
    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder, 
                       EmailService emailService, NotificationService notificationService,
                       UserActivityService userActivityService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.notificationService = notificationService;
        this.userActivityService = userActivityService;
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
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
                .role(role != null ? role : Role.UNDERGRADUATE_STUDENT)
                .createdAt(Instant.now());

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

                // If promoted to Manager, notify other managers for audit
                if (role == Role.MANAGER) {
                    List<User> admins = userRepository.findByRole(Role.MANAGER);
                    for (User admin : admins) {
                        if (!admin.getId().equals(id)) {
                            notificationService.sendNotification(
                                admin.getId(),
                                String.format("Audit: %s has been promoted to MANAGER role.", user.getName()),
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
                    List<User> admins = userRepository.findByRole(Role.MANAGER);
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

    public List<com.smartcampus.model.UserActivity> getUserActivity(String userId) {
        return userActivityService.getUserActivity(userId);
    }

    public void deleteUser(String id) {
        userRepository.deleteById(id);
    }
}
