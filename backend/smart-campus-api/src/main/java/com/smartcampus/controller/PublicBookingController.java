package com.smartcampus.controller;

import com.smartcampus.dto.ApiResponse;
import com.smartcampus.dto.booking.PublicBookingVerificationResponse;
import com.smartcampus.service.BookingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/public/bookings")
@RequiredArgsConstructor
public class PublicBookingController {

    private final BookingService bookingService;

    @GetMapping("/verify")
    public ResponseEntity<ApiResponse<PublicBookingVerificationResponse>> verifyBookingByToken(
            @RequestParam String token) {
        PublicBookingVerificationResponse response = bookingService.verifyBookingByToken(token);
        return ResponseEntity.ok(ApiResponse.success("Booking verified successfully", response));
    }
}
