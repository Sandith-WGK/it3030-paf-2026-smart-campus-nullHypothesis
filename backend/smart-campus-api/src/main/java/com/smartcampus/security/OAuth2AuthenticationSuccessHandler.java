package com.smartcampus.security;

import com.smartcampus.model.Role;
import com.smartcampus.model.User;
import com.smartcampus.repository.UserRepository;
import com.smartcampus.service.EmailService;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.security.web.authentication.SimpleUrlAuthenticationSuccessHandler;
import org.springframework.stereotype.Component;
import org.springframework.web.util.UriComponentsBuilder;

import java.io.IOException;
import java.time.Instant;
import java.time.temporal.ChronoUnit;

@Component
public class OAuth2AuthenticationSuccessHandler extends SimpleUrlAuthenticationSuccessHandler {

    @Autowired
    private JwtProvider jwtProvider;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private EmailService emailService;

    @Autowired
    private com.smartcampus.service.UserActivityService userActivityService;

    @Value("${app.oauth2.redirectUri}")
    private String redirectUri;

    @Override
    public void onAuthenticationSuccess(HttpServletRequest request, HttpServletResponse response, Authentication authentication) throws IOException, ServletException {
        // VIVA PREP: This method fires immediately after Google successfully authenticates the user.
        // It checks if the user exists in our MongoDB. If they have an ADMIN/TECHNICIAN role,
        // it halts the redirect and forces the 2FA flow. Otherwise, it issues a JWT.
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        User user = userRepository.findById(userPrincipal.getUserId()).orElse(null);

        if (user == null) {
            String errorUrl = UriComponentsBuilder.fromUriString(redirectUri)
                    .queryParam("error", "User not found.")
                    .build().toUriString();
            getRedirectStrategy().sendRedirect(request, response, errorUrl);
            return;
        }

        if (user.getRole() == Role.ADMIN || user.getRole() == Role.TECHNICIAN) {
            String otp = String.valueOf((int) ((Math.random() * 900000) + 100000));
            user.setTwoFactorCode(otp);
            user.setTwoFactorCodeExpiresAt(Instant.now().plus(5, ChronoUnit.MINUTES));
            userRepository.save(user);

            try {
                emailService.sendTwoFactorOtpEmail(user.getEmail(), otp);
            } catch (Exception e) {
                System.err.println("Failed to send OAuth2 2FA email: " + e.getMessage());
            }

            String twoFaUrl = UriComponentsBuilder.fromUriString(redirectUri)
                    .queryParam("status", "2FA_REQUIRED")
                    .queryParam("userId", user.getId())
                    .queryParam("email", user.getEmail())
                    .build().toUriString();
            getRedirectStrategy().sendRedirect(request, response, twoFaUrl);
            return;
        }

        user.setTwoFactorCode(null);
        user.setTwoFactorCodeExpiresAt(null);
        userRepository.save(user);

        // Tier 2: Log successful social login
        userActivityService.logActivity(user.getId(), "LOGIN_SUCCESS_SOCIAL", request);

        String token = jwtProvider.generateToken(authentication);

        String targetUrl = UriComponentsBuilder.fromUriString(redirectUri)
                .queryParam("token", token)
                .build().toUriString();

        getRedirectStrategy().sendRedirect(request, response, targetUrl);
    }
}
