package com.smartcampus.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import com.fasterxml.jackson.annotation.JsonIgnore;
import org.springframework.data.annotation.CreatedDate;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
class NotificationPreference {
    @Builder.Default
    private boolean bookings = true;
    @Builder.Default
    private boolean tickets = true;
    @Builder.Default
    private boolean security = true;
}

@Document(collection = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    private String id;

    @Indexed(unique = true)
    private String email;

    private String name;

    private String picture; // Google profile photo URL

    private String provider; // "GOOGLE" or "LOCAL"

    @JsonIgnore
    private String password; // Hashed password for local auth

    @Builder.Default
    private Role role = Role.USER; // default role for new users

    @Builder.Default
    private boolean enabled = false; // user must verify email to be enabled

    @JsonIgnore
    private String verificationCode;

    @JsonIgnore
    private String resetCode;

    @JsonIgnore
    private Instant resetCodeExpiresAt;

    @JsonIgnore
    private String twoFactorCode;

    @JsonIgnore
    private Instant twoFactorCodeExpiresAt;

    @CreatedDate
    private Instant createdAt;

    @Builder.Default
    private NotificationPreference notificationPreferences = new NotificationPreference();
}