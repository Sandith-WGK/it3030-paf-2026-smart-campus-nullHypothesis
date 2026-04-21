package com.smartcampus.controller;

import com.smartcampus.model.Role;
import com.smartcampus.model.User;
import com.smartcampus.model.UserActivity;
import com.smartcampus.security.UserPrincipal;
import com.smartcampus.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import lombok.extern.slf4j.Slf4j;

@RestController
@RequestMapping("/api/v1/users")
@Slf4j
public class UserController {

    private final UserService userService;

    @Autowired
    public UserController(UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('MANAGER') or #id == principal.userId")
    public ResponseEntity<User> getUserById(@PathVariable String id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    public record CreateUserRequest(String email, String name, Role role, String password) {}

    @PostMapping
    public ResponseEntity<User> createUser(@RequestBody CreateUserRequest request) {
        User created = userService.createUser(request.email(), request.name(), request.role(), request.password());
        return ResponseEntity.ok(created);
    }

    public record UpdateUserRequest(String email, String name, Role role, String password, String picture) {}
    public record AuthResponse(String token, User user) {}

    @Autowired
    private com.smartcampus.security.JwtProvider jwtProvider;
    
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('MANAGER') or #id == principal.userId")
    public ResponseEntity<AuthResponse> updateUser(@PathVariable String id, @RequestBody UpdateUserRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean isAdmin = auth != null
                && auth.getAuthorities().stream().anyMatch(a -> "ROLE_MANAGER".equals(a.getAuthority()));
        String actorUserId = (auth != null && auth.getPrincipal() instanceof UserPrincipal up) ? up.getUserId() : null;
        boolean isSelfUpdate = actorUserId != null && actorUserId.equals(id);
        Role effectiveRole = isAdmin ? request.role() : null;

        User updated = userService.updateUser(
                id,
                request.email(),
                request.name(),
                effectiveRole,
                request.password(),
                request.picture(),
                isSelfUpdate
        );
        String newToken = jwtProvider.generateTokenFromUser(updated);
        return ResponseEntity.ok(new AuthResponse(newToken, updated));
    }

    @PutMapping("/{id}/preferences")
    @PreAuthorize("hasRole('MANAGER') or #id == principal.userId or #id == principal.email")
    public ResponseEntity<User> updatePreferences(@PathVariable String id, @RequestBody com.smartcampus.dto.UserPreferenceUpdateRequest request) {
        log.info("AUDIT [UserController]: Received preferences PUT for ID: {}. Payload: {}", id, request);
        return ResponseEntity.ok(userService.updateUserPreferences(id, request));
    }

    @GetMapping("/{id}/activity")
    @PreAuthorize("hasRole('MANAGER') or #id == principal.userId")
    public ResponseEntity<List<UserActivity>> getUserActivity(@PathVariable String id) {
        return ResponseEntity.ok(userService.getUserActivity(id));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<Void> deleteUser(@PathVariable String id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }
}
