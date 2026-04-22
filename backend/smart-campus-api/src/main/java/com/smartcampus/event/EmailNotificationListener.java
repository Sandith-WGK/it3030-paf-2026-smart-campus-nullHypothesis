package com.smartcampus.event;

import com.smartcampus.model.User;
import com.smartcampus.service.EmailService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class EmailNotificationListener {

    private final EmailService emailService;

    @Async("notificationTaskExecutor")
    @EventListener
    public void handleEmailNotificationEvent(EmailNotificationEvent event) {
        User user = event.getUser();
        
        // 1. Verify User Preferences for Email Notifications
        if (user == null || user.getEmail() == null) {
            log.warn("EmailNotificationListener: Aborted. User or Email is null.");
            return;
        }

        if (user.getPreferences() == null || !user.getPreferences().isEnableEmailNotifications()) {
            log.info("EmailNotificationListener: Aborted. Email notifications disabled by user {}", user.getId());
            return;
        }

        // 2. Safely Send Email via External Provider
        try {
            log.info("EmailNotificationListener: Executing thread [{}]. Sending email to {}", 
                    Thread.currentThread().getName(), user.getEmail());
            emailService.sendNotificationEmail(user, event.getSubject(), event.getMessageText());
            log.info("EmailNotificationListener: Successfully sent notification email to {}", user.getEmail());
        } catch (Exception e) {
            log.error("EmailNotificationListener: Failed to send notification email to {}: {}", user.getEmail(), e.getMessage());
        }
    }
}
