package com.smartcampus.controller;

import com.smartcampus.dto.ApiResponse;
import com.smartcampus.model.Resource;
import com.smartcampus.model.ResourceStatus;
import com.smartcampus.model.ResourceType;
import com.smartcampus.service.ResourceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * REST controller for Resource Management (Module A - Facilities & Assets Catalogue).
 * Provides CRUD operations and filtering for campus resources.
 */
@RestController
@RequestMapping("/api/v1/resources")
@RequiredArgsConstructor
public class ResourceController {

    private final ResourceService resourceService;

    /**
     * GET /api/v1/resources
     * Get all resources with optional filters
     * Available to all authenticated users
     */
    @GetMapping
    public ResponseEntity<ApiResponse<List<Resource>>> getAllResources(
            @RequestParam(required = false) ResourceType type,
            @RequestParam(required = false) Integer minCapacity,
            @RequestParam(required = false) String location,
            @RequestParam(required = false) ResourceStatus status) {

        List<Resource> resources = resourceService.getAllResources(type, minCapacity, location, status);
        return ResponseEntity.ok(ApiResponse.success("Resources retrieved successfully", resources));
    }

    /**
     * GET /api/v1/resources/{id}
     * Get a single resource by ID
     * Available to all authenticated users
     */
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<Resource>> getResourceById(@PathVariable String id) {
        Resource resource = resourceService.getResourceById(id);
        return ResponseEntity.ok(ApiResponse.success("Resource retrieved successfully", resource));
    }

    /**
     * POST /api/v1/resources
     * Create a new resource
     * Admin only
     */
    @PostMapping
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<Resource>> createResource(@Valid @RequestBody Resource resource) {
        Resource createdResource = resourceService.createResource(resource);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Resource created successfully", createdResource));
    }

    /**
     * PUT /api/v1/resources/{id}
     * Update an existing resource
     * Admin only
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<Resource>> updateResource(
            @PathVariable String id,
            @Valid @RequestBody Resource resource) {
        Resource updatedResource = resourceService.updateResource(id, resource);
        return ResponseEntity.ok(ApiResponse.success("Resource updated successfully", updatedResource));
    }

    /**
     * PATCH /api/v1/resources/{id}/status
     * Update only the status of a resource
     * Admin only
     */
    @PatchMapping("/{id}/status")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<Resource>> updateResourceStatus(
            @PathVariable String id,
            @RequestParam ResourceStatus status) {
        Resource updatedResource = resourceService.updateResourceStatus(id, status);
        return ResponseEntity.ok(ApiResponse.success("Resource status updated successfully", updatedResource));
    }

    /**
     * DELETE /api/v1/resources/{id}
     * Delete a resource
     * Admin only
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<Void> deleteResource(@PathVariable String id) {
        resourceService.deleteResource(id);
        return ResponseEntity.noContent().build();
    }
}
