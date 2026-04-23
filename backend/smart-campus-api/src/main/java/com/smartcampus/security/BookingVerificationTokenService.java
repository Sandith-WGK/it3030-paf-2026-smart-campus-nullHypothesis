package com.smartcampus.security;

import com.smartcampus.model.Booking;
import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.util.Date;

@Service
public class BookingVerificationTokenService {

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.booking.verify-token-expiration-ms:900000}")
    private long verifyTokenExpiryMs;

    public String generateToken(Booking booking) {
        Date now = new Date();
        Date expiry = new Date(now.getTime() + verifyTokenExpiryMs);

        return Jwts.builder()
                .subject(booking.getId())
                .claim("typ", "BOOKING_VERIFY")
                .claim("resourceId", booking.getResourceId())
                .issuedAt(now)
                .expiration(expiry)
                .signWith(getSignInKey())
                .compact();
    }

    public String validateAndGetBookingId(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(getSignInKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();

        Object type = claims.get("typ");
        if (!"BOOKING_VERIFY".equals(type)) {
            throw new JwtException("Invalid verify token type");
        }
        return claims.getSubject();
    }

    private SecretKey getSignInKey() {
        byte[] keyBytes = Decoders.BASE64.decode(jwtSecret);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
