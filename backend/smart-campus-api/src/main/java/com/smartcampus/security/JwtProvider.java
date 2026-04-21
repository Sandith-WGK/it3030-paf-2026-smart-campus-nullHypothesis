package com.smartcampus.security;

import com.smartcampus.model.User;
import io.jsonwebtoken.*;
import io.jsonwebtoken.io.Decoders;
import io.jsonwebtoken.security.Keys;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import javax.crypto.SecretKey;
import java.util.Date;

@Component
public class JwtProvider {

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.jwt.expiration}")
    private long jwtExpirationInMs;

    public String generateToken(Authentication authentication) {
        UserPrincipal userPrincipal = (UserPrincipal) authentication.getPrincipal();
        return generateTokenFromPrincipal(userPrincipal);
    }

    public String generateTokenFromUser(User user) {
        UserPrincipal userPrincipal = UserPrincipal.create(user);
        return generateTokenFromPrincipal(userPrincipal);
    }

    private String generateTokenFromPrincipal(UserPrincipal userPrincipal) {
        Date now = new Date();
        Date expiryDate = new Date(now.getTime() + jwtExpirationInMs);

        // Extract role string from authorities (e.g. "ROLE_MANAGER" -> "MANAGER")
        String role = userPrincipal.getAuthorities().stream()
                .findFirst()
                .map(a -> a.getAuthority().replace("ROLE_", ""))
                .orElse("UNDERGRADUATE_STUDENT");

        String pictureUrl = userPrincipal.getPicture();
        // Prevent huge base64 profiles from blowing up the JWT and crashing Tomcat Headers
        if (pictureUrl != null && pictureUrl.length() > 2000) {
            pictureUrl = ""; 
        }

        return Jwts.builder()
                .subject(userPrincipal.getUserId())
                .claim("email", userPrincipal.getEmail())
                .claim("role", role)
                .claim("name", userPrincipal.getDisplayName())
                .claim("provider", userPrincipal.getProvider())
                .claim("picture", pictureUrl)
                .issuedAt(new Date())
                .expiration(expiryDate)
                .signWith(getSignInKey())
                .compact();
    }

    public String getUserIdFromToken(String token) {
        Claims claims = Jwts.parser()
                .verifyWith(getSignInKey())
                .build()
                .parseSignedClaims(token)
                .getPayload();

        return claims.getSubject();
    }

    public boolean validateToken(String authToken) {
        try {
            Jwts.parser().verifyWith(getSignInKey()).build().parseSignedClaims(authToken);
            return true;
        } catch (JwtException | IllegalArgumentException ex) {
            System.err.println("Invalid JWT signature/token");
        }
        return false;
    }
    
    private SecretKey getSignInKey() {
        byte[] keyBytes = Decoders.BASE64.decode(jwtSecret);
        return Keys.hmacShaKeyFor(keyBytes);
    }
}
