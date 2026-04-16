package com.smartcampus.dto;

import lombok.Data;

@Data
public class VerifyTwoFactorRequest {
    private String userId;
    private String otp;
}

