package com.smartcampus.service;

import com.smartcampus.model.User;
import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ClassPathResource;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.io.UnsupportedEncodingException;

@Service
public class EmailService {

    @Autowired
    private JavaMailSender mailSender;

    @Value("${spring.mail.username}")
    private String senderEmail;

    private static final String LOGO_CID = "smartcampus-logo";
    private static final String LOGO_CLASSPATH = "email/logo.png";

    public void sendVerificationEmail(String to, String code) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(to);
            helper.setFrom(senderEmail, "Smart Campus");
            helper.setSubject("Smart Campus Hub - Email Verification");
            helper.setText(buildVerificationEmailHtml(code), true);
            attachLogoIfPresent(helper);

            mailSender.send(message);
        } catch (MessagingException | UnsupportedEncodingException e) {
            throw new RuntimeException("Failed to send verification email", e);
        }
    }

    public void sendPasswordResetEmail(String to, String code) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(to);
            helper.setFrom(senderEmail, "Smart Campus");
            helper.setSubject("Smart Campus Hub - Password Reset Request");
            helper.setText(buildPasswordResetEmailHtml(code), true);
            attachLogoIfPresent(helper);

            mailSender.send(message);
        } catch (MessagingException | UnsupportedEncodingException e) {
            throw new RuntimeException("Failed to send password reset email", e);
        }
    }

    public void sendTwoFactorOtpEmail(String to, String otp) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(to);
            helper.setFrom(senderEmail, "Smart Campus");
            helper.setSubject("Smart Campus Hub - Login Verification Code");
            helper.setText(buildTwoFactorOtpEmailHtml(otp), true);
            attachLogoIfPresent(helper);

            mailSender.send(message);
        } catch (MessagingException | UnsupportedEncodingException e) {
            throw new RuntimeException("Failed to send 2FA email", e);
        }
    }

    public void sendNotificationEmail(User user, String subject, String messageText) {
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(user.getEmail());
            helper.setFrom(senderEmail, "Smart Campus");
            helper.setSubject("Smart Campus - " + subject);
            helper.setText(buildNotificationEmailHtml(user.getName(), messageText), true);
            attachLogoIfPresent(helper);

            mailSender.send(message);
        } catch (MessagingException | UnsupportedEncodingException e) {
            throw new RuntimeException("Failed to send notification email", e);
        }
    }

    private void attachLogoIfPresent(MimeMessageHelper helper) throws MessagingException {
        ClassPathResource logo = new ClassPathResource(LOGO_CLASSPATH);
        if (logo.exists()) {
            helper.addInline(LOGO_CID, logo);
        }
    }

    private String buildVerificationEmailHtml(String code) {
        String logoTag = buildLogoTag();
        return """
                <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#ffffff;border:1px solid #ececec;border-radius:14px;">
                  <div style="text-align:center;margin-bottom:16px;">
                    %s
                  </div>
                  <h2 style="margin:0 0 12px 0;color:#4c1d95;">Email Verification</h2>
                  <p style="margin:0 0 14px 0;color:#333;">Welcome to Smart Campus Operations Hub!</p>
                  <p style="margin:0 0 8px 0;color:#333;">Your verification code is:</p>
                  <div style="font-size:26px;letter-spacing:4px;font-weight:700;color:#6d28d9;background:#f5f3ff;padding:12px 16px;border-radius:10px;display:inline-block;">%s</div>
                  <p style="margin:18px 0 0 0;color:#666;font-size:13px;">Please enter this code on the registration page to activate your account.</p>
                  <p style="margin:8px 0 0 0;color:#666;font-size:13px;">If you did not request this, please ignore this email.</p>
                </div>
                """.formatted(logoTag, code);
    }

    private String buildPasswordResetEmailHtml(String code) {
        String logoTag = buildLogoTag();
        return """
                <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#ffffff;border:1px solid #ececec;border-radius:14px;">
                  <div style="text-align:center;margin-bottom:16px;">
                    %s
                  </div>
                  <h2 style="margin:0 0 12px 0;color:#4c1d95;">Password Reset Request</h2>
                  <p style="margin:0 0 14px 0;color:#333;">We received a request to reset your Smart Campus password.</p>
                  <p style="margin:0 0 8px 0;color:#333;">Your reset code is:</p>
                  <div style="font-size:26px;letter-spacing:4px;font-weight:700;color:#6d28d9;background:#f5f3ff;padding:12px 16px;border-radius:10px;display:inline-block;">%s</div>
                  <p style="margin:18px 0 0 0;color:#666;font-size:13px;">This code is valid for 15 minutes.</p>
                  <p style="margin:8px 0 0 0;color:#666;font-size:13px;">If you did not request this, please ignore this email. Do not share this code.</p>
                </div>
                """.formatted(logoTag, code);
    }

    private String buildTwoFactorOtpEmailHtml(String otp) {
        String logoTag = buildLogoTag();
        return """
                <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;background:#ffffff;border:1px solid #ececec;border-radius:14px;">
                  <div style="text-align:center;margin-bottom:16px;">
                    %s
                  </div>
                  <h2 style="margin:0 0 12px 0;color:#4c1d95;">Two-Factor Authentication</h2>
                  <p style="margin:0 0 14px 0;color:#333;">A login attempt was made for your Smart Campus account.</p>
                  <p style="margin:0 0 8px 0;color:#333;">Your one-time verification code is:</p>
                  <div style="font-size:26px;letter-spacing:4px;font-weight:700;color:#6d28d9;background:#f5f3ff;padding:12px 16px;border-radius:10px;display:inline-block;">%s</div>
                  <p style="margin:18px 0 0 0;color:#666;font-size:13px;">This code is valid for 5 minutes.</p>
                  <p style="margin:8px 0 0 0;color:#666;font-size:13px;">If this login was not initiated by you, please change your password immediately.</p>
                </div>
                """.formatted(logoTag, otp);
    }

    private String buildNotificationEmailHtml(String userName, String message) {
        String logoTag = buildLogoTag();
        return """
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f8fafc; border-radius: 16px; overflow: hidden; border: 1px solid #e2e8f0;">
                    <div style="background: linear-gradient(135deg, #6d28d9 0%%, #4c1d95 100%%); padding: 40px 20px; text-align: center;">
                        %s
                    </div>
                    <div style="padding: 40px; background-color: #ffffff;">
                        <h2 style="margin-top: 0; color: #1e293b; font-size: 24px; font-weight: 700;">Hello %s,</h2>
                        <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 24px;">You have a new update from the Smart Campus Operations Hub:</p>
                        <div style="background-color: #f5f3ff; border-left: 4px solid #7c3aed; padding: 24px; margin-bottom: 32px; border-radius: 0 12px 12px 0;">
                            <p style="margin: 0; color: #5b21b6; font-size: 18px; font-weight: 500; line-height: 1.5;">%s</p>
                        </div>
                        <div style="text-align: center; margin-bottom: 32px;">
                            <a href="http://localhost:5173/notifications" style="background-color: #7c3aed; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 600; font-size: 16px; display: inline-block; transition: background-color 0.3s ease;">View Dashboard</a>
                        </div>
                        <hr style="border: 0; border-top: 1px solid #e2e8f0; margin-bottom: 24px;" />
                        <p style="color: #94a3b8; font-size: 13px; line-height: 1.5; margin-bottom: 0;">
                            You are receiving this email because you have notifications enabled in your Smart Campus settings. 
                            To manage your preferences, please visit the <a href="http://localhost:5173/settings" style="color: #7c3aed; text-decoration: none;">Settings</a> page.
                        </p>
                    </div>
                    <div style="background-color: #f1f5f9; padding: 20px; text-align: center;">
                        <p style="color: #64748b; font-size: 12px; margin: 0;">&copy; 2026 Smart Campus Operations Hub. All rights reserved.</p>
                    </div>
                </div>
                """.formatted(logoTag, userName, message);
    }

    private String buildLogoTag() {
        ClassPathResource logo = new ClassPathResource(LOGO_CLASSPATH);
        if (logo.exists()) {
            return "<img src=\"cid:" + LOGO_CID + "\" alt=\"Smart Campus\" style=\"max-height:58px;max-width:220px;\" />";
        }
        return "<div style=\"font-size:22px;font-weight:700;color:#6d28d9;\">Smart Campus</div>";
    }
}
