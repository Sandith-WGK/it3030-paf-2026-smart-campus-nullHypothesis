package com.smartcampus.service;

import com.smartcampus.model.UserActivity;
import com.smartcampus.repository.UserActivityRepository;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.Instant;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class UserActivityService {

    private final UserActivityRepository userActivityRepository;

    public void logActivity(String userId, String action) {
        try {
            org.springframework.web.context.request.RequestAttributes attrs = org.springframework.web.context.request.RequestContextHolder.getRequestAttributes();
            if (attrs instanceof org.springframework.web.context.request.ServletRequestAttributes) {
                HttpServletRequest request = ((org.springframework.web.context.request.ServletRequestAttributes) attrs).getRequest();
                logActivity(userId, action, request);
            } else {
                log.warn("AUDIT FAIL: No HttpServletRequest context found for User {} Action {}", userId, action);
                // Fallback: save with null request details
                saveActivity(userId, action, null, null, "Unknown");
            }
        } catch (Exception e) {
            log.error("CRITICAL AUDIT ERROR: Failed to log activity for user {}: {}", userId, e.getMessage());
        }
    }

    public void logActivity(String userId, String action, HttpServletRequest request) {
        String ipAddress = getClientIp(request);
        String userAgent = request.getHeader("User-Agent");
        String deviceType = parseDeviceType(userAgent);
        saveActivity(userId, action, ipAddress, userAgent, deviceType);
    }

    private void saveActivity(String userId, String action, String ip, String ua, String device) {
        UserActivity activity = UserActivity.builder()
                .userId(userId)
                .action(action)
                .timestamp(Instant.now())
                .ipAddress(ip)
                .userAgent(ua)
                .deviceType(device)
                .build();

        userActivityRepository.save(activity);
        log.info("Audit: {} for user {} saved successfully", action, userId);
    }

    public List<UserActivity> getUserActivity(String userId) {
        return userActivityRepository.findByUserIdOrderByTimestampDesc(userId);
    }

    private String getClientIp(HttpServletRequest request) {
        String xfHeader = request.getHeader("X-Forwarded-For");
        if (xfHeader == null) {
            return request.getRemoteAddr();
        }
        return xfHeader.split(",")[0];
    }

    private String parseDeviceType(String userAgent) {
        if (userAgent == null) return "Unknown";
        String ua = userAgent.toLowerCase();
        
        if (ua.contains("tablet") || ua.contains("ipad") || (ua.contains("android") && !ua.contains("mobile"))) {
            return "Tablet";
        } else if (ua.contains("mobile") || ua.contains("iphone") || ua.contains("android")) {
            return "Mobile";
        } else if (ua.contains("windows") || ua.contains("macintosh") || ua.contains("linux")) {
            return "Desktop";
        }
        
        return "Desktop"; // Default for unknown browser-like agents
    }
}
