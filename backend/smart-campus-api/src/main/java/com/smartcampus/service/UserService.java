package com.smartcampus.service;

import com.smartcampus.model.Role;
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

    @Autowired
    public UserService(UserRepository userRepository, PasswordEncoder passwordEncoder, EmailService emailService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.emailService = emailService;
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
            
            return userRepository.save(user);
        }
        throw new RuntimeException("User not found with id: " + id);
    }

    public void deleteUser(String id) {
        userRepository.deleteById(id);
    }
}
