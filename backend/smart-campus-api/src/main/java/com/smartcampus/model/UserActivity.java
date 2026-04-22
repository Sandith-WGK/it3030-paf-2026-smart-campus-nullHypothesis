package com.smartcampus.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.Instant;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "user_activities")
public class UserActivity {
    @Id
    private String id;
    private String userId;
    private String action; // e.g., LOGIN_SUCCESS, LOGIN_FAILURE, SECURITY_UPDATE
    private Instant timestamp;
    private String ipAddress;
    private String userAgent;
    private String deviceType; // Desktop, Mobile, Tablet, Unknown
    private String location; // Optional: City/Country if possible
}
