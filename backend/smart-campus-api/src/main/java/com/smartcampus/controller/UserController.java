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

/**
 * VIVA PREP: This is the main CRUD Controller for User Management.
 * It follows RESTful conventions:
 *   CREATE -> POST   /api/v1/users
 *   READ   -> GET    /api/v1/users  OR  /api/v1/users/{id}
 *   UPDATE -> PUT    /api/v1/users/{id}
 *   DELETE -> DELETE /api/v1/users/{id}
 * All endpoints are secured with Role-Based Access Control using @PreAuthorize.
 */
@RestController
@RequestMapping("/api/v1/users")
@Slf4j
public class UserController {

    private final UserService userService;

    @Autowired
    public UserController(UserService userService) {
        this.userService = userService;
    }

    /**
     * CRUD: READ (All Users)
     * HTTP: GET /api/v1/users
     * Status Code: 200 OK
     * Security: Only ADMIN role can access this endpoint.
     */
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<User>> getAllUsers() {
        return ResponseEntity.ok(userService.getAllUsers());
    }

    /**
     * CRUD: READ (Single User by ID)
     * HTTP: GET /api/v1/users/{id}
     * Status Code: 200 OK
     * Security: ADMIN can view any user. Normal users can only view their own profile.
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or #id == principal.userId")
    public ResponseEntity<User> getUserById(@PathVariable String id) {
        return ResponseEntity.ok(userService.getUserById(id));
    }

    public record CreateUserRequest(String email, String name, Role role, String password) {}

    /**
     * CRUD: CREATE (New User)
     * HTTP: POST /api/v1/users
     * Status Code: 200 OK (returns the created user object)
     * The request body contains email, name, role, and an optional password.
     * If password is provided -> LOCAL user. If not -> Google OAuth stub.
     */
    @PostMapping
    public ResponseEntity<User> createUser(@RequestBody CreateUserRequest request) {
        User created = userService.createUser(request.email(), request.name(), request.role(), request.password());
        return ResponseEntity.ok(created);
    }

    public record UpdateUserRequest(String email, String name, Role role, String password, String picture) {}
    public record AuthResponse(String token, User user) {}

    @Autowired
    private com.smartcampus.security.JwtProvider jwtProvider;
    
    /**
     * CRUD: UPDATE (Modify Existing User)
     * HTTP: PUT /api/v1/users/{id}
     * Status Code: 200 OK (returns updated user + a fresh JWT token)
     * Security: ADMIN can update any user (including role changes).
     *           Normal users can only update their own profile (role change is blocked).
     * After update, a new JWT is generated so the frontend reflects changes immediately.
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN') or #id == principal.userId")
    public ResponseEntity<AuthResponse> updateUser(@PathVariable String id, @RequestBody UpdateUserRequest request) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        boolean isAdmin = auth != null && auth.getAuthorities().stream().anyMatch(a -> "ROLE_ADMIN".equals(a.getAuthority()));
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
    @PreAuthorize("hasRole('ADMIN') or #id == principal.userId or #id == principal.email")
    public ResponseEntity<User> updatePreferences(@PathVariable String id, @RequestBody com.smartcampus.dto.UserPreferenceUpdateRequest request) {
        log.info("AUDIT [UserController]: Received preferences PUT for ID: {}. Payload: {}", id, request);
        return ResponseEntity.ok(userService.updateUserPreferences(id, request));
    }

    @PutMapping("/{id}/notification-preferences")
    @PreAuthorize("hasRole('ADMIN') or #id == principal.userId")
    public ResponseEntity<User> updateNotificationPreferences(
            @PathVariable String id,
            @RequestBody com.smartcampus.model.NotificationPreference request) {
        return ResponseEntity.ok(userService.updateNotificationPreferences(id, request));
    }

    @GetMapping("/{id}/activity")
    @PreAuthorize("hasRole('ADMIN') or #id == principal.userId")
    public ResponseEntity<List<UserActivity>> getUserActivity(@PathVariable String id) {
        return ResponseEntity.ok(userService.getUserActivity(id));
    }

    /**
     * CRUD: DELETE (Remove User Permanently)
     * HTTP: DELETE /api/v1/users/{id}
     * Status Code: 204 No Content (success, but no data to return)
     * Security: Only ADMIN role can delete users.
     * Side Effects: Cancels future bookings, unassigns tickets, then hard-deletes from MongoDB.
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Void> deleteUser(@PathVariable String id) {
        userService.deleteUser(id);
        return ResponseEntity.noContent().build();
    }
}
