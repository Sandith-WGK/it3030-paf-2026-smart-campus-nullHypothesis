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

    @Autowired
    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder, 
                       EmailService emailService, NotificationService notificationService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
        this.notificationService = notificationService;
    }

    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    public User getUserById(String id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));
    }

    public User createUser(String email, String name, Role role) {
        // Prevent duplicates
        if (userRepository.existsByEmail(email)) {
             throw new RuntimeException("User already exists with email: " + email);
        }

        // Stub user without passport/password since we use Google OAuth
        User user = User.builder()
                .email(email)
                .name(name)
                .role(role != null ? role : Role.USER)
                .provider("GOOGLE")
                .createdAt(Instant.now())
                .build();
        return userRepository.save(user);
    }

    public User updateUser(String id, String email, String name, Role role, String password, String picture, boolean requireEmailReverification) {
        Optional<User> userOpt = userRepository.findById(id);
        if (userOpt.isPresent()) {
            User user = userOpt.get();
            boolean isLocalProvider = "LOCAL".equalsIgnoreCase(user.getProvider());
            
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

            User savedUser = userRepository.save(user);

            if (emailChanged || passwordChanged) {
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

    public User updateUserPreferences(String userId, com.smartcampus.dto.UserPreferenceUpdateRequest request) {
        User user = getUserById(userId);
        com.smartcampus.model.UserPreference prefs = user.getPreferences();
        if (prefs == null) {
            prefs = new com.smartcampus.model.UserPreference();
        }

        if (request.getTheme() != null) prefs.setTheme(request.getTheme());
        if (request.getEnableSounds() != null) prefs.setEnableSounds(request.getEnableSounds());
        if (request.getEnableEmailNotifications() != null) prefs.setEnableEmailNotifications(request.getEnableEmailNotifications());
        if (request.getEnablePushNotifications() != null) prefs.setEnablePushNotifications(request.getEnablePushNotifications());

        user.setPreferences(prefs);
        return userRepository.save(user);
    }

    public void deleteUser(String id) {
        userRepository.deleteById(id);
    }
}
