package com.smartcampus.service;

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

    private String buildLogoTag() {
        ClassPathResource logo = new ClassPathResource(LOGO_CLASSPATH);
        if (logo.exists()) {
            return "<img src=\"cid:" + LOGO_CID + "\" alt=\"Smart Campus\" style=\"max-height:58px;max-width:220px;\" />";
        }
        return "<div style=\"font-size:22px;font-weight:700;color:#6d28d9;\">Smart Campus</div>";
    }
}
