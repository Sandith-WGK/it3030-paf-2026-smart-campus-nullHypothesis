package com.smartcampus.controller;

import com.smartcampus.dto.AuthResponse;
import com.smartcampus.dto.ForgotPasswordRequest;
import com.smartcampus.dto.LoginRequest;
import com.smartcampus.dto.ResendTwoFactorRequest;
import com.smartcampus.dto.ResendVerificationRequest;
import com.smartcampus.dto.ResetPasswordRequest;
import com.smartcampus.dto.SignupRequest;
import com.smartcampus.dto.VerifyRequest;
import com.smartcampus.dto.VerifyTwoFactorRequest;
import com.smartcampus.model.Role;
import com.smartcampus.model.User;
import com.smartcampus.repository.UserRepository;
import com.smartcampus.security.JwtProvider;
import com.smartcampus.security.RoleAccess;
import com.smartcampus.security.UserPrincipal;
import com.smartcampus.service.EmailService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    @Autowired
    private AuthenticationManager authenticationManager;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtProvider jwtProvider;

    @Autowired
    private EmailService emailService;

    @Autowired
    private com.smartcampus.service.UserActivityService userActivityService;

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@RequestBody LoginRequest loginRequest, jakarta.servlet.http.HttpServletRequest request) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(
                        loginRequest.getEmail(),
                        loginRequest.getPassword()
                )
        );

        SecurityContextHolder.getContext().setAuthentication(authentication);

        String jwt = jwtProvider.generateToken(authentication);
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        
        String role = userPrincipal.getAuthorities().stream()
                .findFirst()
                .map(a -> a.getAuthority().replace("ROLE_", ""))
                .orElse(Role.UNDERGRADUATE_STUDENT.name());

        User user = userRepository.findById(userPrincipal.getUserId()).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body("Error: User not found.");
        }

        if (RoleAccess.requiresTwoFactor(user.getRole())) {
            String otp = String.valueOf((int) ((Math.random() * 900000) + 100000));
            user.setTwoFactorCode(otp);
            user.setTwoFactorCodeExpiresAt(Instant.now().plus(5, ChronoUnit.MINUTES));
            userRepository.save(user);

            try {
                emailService.sendTwoFactorOtpEmail(user.getEmail(), otp);
            } catch (Exception e) {
                System.err.println("Failed to send 2FA email: " + e.getMessage());
            }

            return ResponseEntity.ok(Map.of(
                    "status", "2FA_REQUIRED",
                    "userId", user.getId()
            ));
        }

        // Clear stale 2FA state for non-privileged login path.
        user.setTwoFactorCode(null);
        user.setTwoFactorCodeExpiresAt(null);
        userRepository.save(user);

        // Tier 2: Log successful login
        userActivityService.logActivity(user.getId(), "LOGIN_SUCCESS", request);

        return ResponseEntity.ok(new AuthResponse(jwt, userPrincipal.getUsername(), role));
    }

    @PostMapping("/verify-2fa")
    public ResponseEntity<?> verifyTwoFactor(@RequestBody VerifyTwoFactorRequest request, jakarta.servlet.http.HttpServletRequest httpRequest) {
        User user = userRepository.findById(request.getUserId()).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body("Error: User not found.");
        }

        if (!RoleAccess.requiresTwoFactor(user.getRole())) {
            return ResponseEntity.badRequest().body("Error: 2FA is not required for this account.");
        }

        if (user.getTwoFactorCode() == null || user.getTwoFactorCodeExpiresAt() == null) {
            return ResponseEntity.badRequest().body("Error: No active 2FA session. Please log in again.");
        }

        if (user.getTwoFactorCodeExpiresAt().isBefore(Instant.now())) {
            user.setTwoFactorCode(null);
            user.setTwoFactorCodeExpiresAt(null);
            userRepository.save(user);
            return ResponseEntity.badRequest().body("Error: 2FA code has expired. Please log in again.");
        }

        if (!user.getTwoFactorCode().equals(request.getOtp())) {
            return ResponseEntity.badRequest().body("Error: Invalid 2FA code.");
        }

        user.setTwoFactorCode(null);
        user.setTwoFactorCodeExpiresAt(null);
        userRepository.save(user);

        // Tier 2: Log successful login (via 2FA)
        userActivityService.logActivity(user.getId(), "LOGIN_SUCCESS_2FA", httpRequest);

        String jwt = jwtProvider.generateTokenFromUser(user);
        return ResponseEntity.ok(new AuthResponse(jwt, user.getEmail(), user.getRole().name()));
    }

    @PostMapping("/resend-2fa")
    public ResponseEntity<?> resendTwoFactor(@RequestBody ResendTwoFactorRequest request) {
        User user = userRepository.findById(request.getUserId()).orElse(null);
        if (user == null) {
            return ResponseEntity.badRequest().body("Error: User not found.");
        }

        if (!RoleAccess.requiresTwoFactor(user.getRole())) {
            return ResponseEntity.badRequest().body("Error: 2FA is not required for this account.");
        }

        String otp = String.valueOf((int) ((Math.random() * 900000) + 100000));
        user.setTwoFactorCode(otp);
        user.setTwoFactorCodeExpiresAt(Instant.now().plus(5, ChronoUnit.MINUTES));
        userRepository.save(user);

        try {
            emailService.sendTwoFactorOtpEmail(user.getEmail(), otp);
        } catch (Exception e) {
            System.err.println("Failed to resend 2FA email: " + e.getMessage());
        }

        return ResponseEntity.ok("A new 2FA code has been sent to your email.");
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerUser(@RequestBody SignupRequest signupRequest) {
        String email = signupRequest.getEmail().toLowerCase();
        
        if(userRepository.existsByEmail(email)) {
            User existingUser = userRepository.findByEmail(email).orElse(null);
            if(existingUser != null && existingUser.isEnabled()) {
                return ResponseEntity.badRequest().body("Error: Email is already registered and verified.");
            }
            // If user exists but is NOT enabled, we'll allow them to "re-register" (update code)
        }

        // Generate 6-digit verification code
        String verificationCode = String.valueOf((int)((Math.random() * 900000) + 100000));

        // Create or update user account (disabled by default)
        User user = userRepository.findByEmail(email).orElse(new User());
        user.setName(signupRequest.getName());
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(signupRequest.getPassword()));
        user.setProvider("LOCAL");
        user.setRole(Role.UNDERGRADUATE_STUDENT);
        user.setEnabled(false);
        user.setVerificationCode(verificationCode);

        userRepository.save(user);

        // Send verification email
        try {
            emailService.sendVerificationEmail(user.getEmail(), verificationCode);
        } catch (Exception e) {
            // Log the error but keep the user record (they can request resend later)
            System.err.println("Failed to send verification email: " + e.getMessage());
        }
        
        return ResponseEntity.ok("Registration successful. Please check your email for verification code.");
    }

    @PostMapping("/verify")
    public ResponseEntity<?> verifyUser(@RequestBody VerifyRequest verifyRequest) {
        String email = verifyRequest.getEmail().toLowerCase();
        User user = userRepository.findByEmail(email).orElse(null);
        
        if (user == null) {
            return ResponseEntity.badRequest().body("Error: User not found.");
        }

        if (user.isEnabled()) {
            return ResponseEntity.badRequest().body("Error: Account is already verified.");
        }

        if (user.getVerificationCode() != null && user.getVerificationCode().equals(verifyRequest.getCode())) {
            user.setEnabled(true);
            user.setVerificationCode(null); // Clear the code
            userRepository.save(user);
            return ResponseEntity.ok("Account verified successfully. You can now log in.");
        } else {
            return ResponseEntity.badRequest().body("Error: Invalid verification code.");
        }
    }

    @PostMapping("/resend-verification")
    public ResponseEntity<?> resendVerificationCode(@RequestBody ResendVerificationRequest request) {
        String email = request.getEmail().toLowerCase();
        User user = userRepository.findByEmail(email).orElse(null);

        if (user == null) {
            return ResponseEntity.badRequest().body("Error: User not found.");
        }

        if (user.isEnabled()) {
            return ResponseEntity.badRequest().body("Error: Account is already verified.");
        }

        // Generate new 6-digit verification code
        String verificationCode = String.valueOf((int)((Math.random() * 900000) + 100000));
        user.setVerificationCode(verificationCode);
        userRepository.save(user);

        try {
            emailService.sendVerificationEmail(user.getEmail(), verificationCode);
        } catch (Exception e) {
            System.err.println("Failed to resend verification email: " + e.getMessage());
        }

        return ResponseEntity.ok("Verification code resent. Please check your email.");
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<?> forgotPassword(@RequestBody ForgotPasswordRequest request) {
        String email = request.getEmail().toLowerCase();
        User user = userRepository.findByEmail(email).orElse(null);

        if (user == null) {
            // Return success even if not found for security (obscurity)
            return ResponseEntity.ok("If an account exists for " + email + ", you will receive a reset code.");
        }

        String resetCode = String.valueOf((int)((Math.random() * 900000) + 100000));
        user.setResetCode(resetCode);
        user.setResetCodeExpiresAt(Instant.now().plus(15, ChronoUnit.MINUTES));
        userRepository.save(user);

        try {
            emailService.sendPasswordResetEmail(user.getEmail(), resetCode);
        } catch (Exception e) {
            System.err.println("Failed to send reset email: " + e.getMessage());
        }

        return ResponseEntity.ok("Password reset code has been sent to your email.");
    }

    @PostMapping("/resend-reset-code")
    public ResponseEntity<?> resendResetCode(@RequestBody ForgotPasswordRequest request) {
        String email = request.getEmail().toLowerCase();
        User user = userRepository.findByEmail(email).orElse(null);

        if (user == null) {
            // Keep the same obscurity behavior as forgot-password.
            return ResponseEntity.ok("If an account exists for " + email + ", you will receive a reset code.");
        }

        String resetCode = String.valueOf((int)((Math.random() * 900000) + 100000));
        user.setResetCode(resetCode);
        user.setResetCodeExpiresAt(Instant.now().plus(15, ChronoUnit.MINUTES));
        userRepository.save(user);

        try {
            emailService.sendPasswordResetEmail(user.getEmail(), resetCode);
        } catch (Exception e) {
            System.err.println("Failed to resend reset email: " + e.getMessage());
        }

        return ResponseEntity.ok("A new password reset code has been sent to your email.");
    }

    @PostMapping("/reset-password")
    public ResponseEntity<?> resetPassword(@RequestBody ResetPasswordRequest request) {
        String email = request.getEmail().toLowerCase();
        User user = userRepository.findByEmail(email).orElse(null);

        if (user == null) {
            return ResponseEntity.badRequest().body("Error: User not found.");
        }

        if (user.getResetCode() == null || !user.getResetCode().equals(request.getCode())) {
            return ResponseEntity.badRequest().body("Error: Invalid reset code.");
        }

        if (user.getResetCodeExpiresAt().isBefore(Instant.now())) {
            return ResponseEntity.badRequest().body("Error: Reset code has expired.");
        }

        // Update password and clear reset fields
        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setResetCode(null);
        user.setResetCodeExpiresAt(null);
        userRepository.save(user);

        return ResponseEntity.ok("Password has been reset successfully. You can now log in.");
    }
}
