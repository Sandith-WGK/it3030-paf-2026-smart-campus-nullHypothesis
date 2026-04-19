package com.smartcampus.service;

import com.smartcampus.exception.ResourceNotFoundException;
import com.smartcampus.model.Resource;
import com.smartcampus.model.ResourceStatus;
import com.smartcampus.model.ResourceType;
import com.smartcampus.repository.ResourceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Service layer for Resource management (Module A - Facilities & Assets Catalogue).
 * Contains business logic and validation for resource operations.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ResourceService {

    private final ResourceRepository resourceRepository;

    /**
     * Get all resources with optional filters
     * @param type Resource type filter (HALL, LAB, ROOM, EQUIPMENT)
     * @param minCapacity Minimum capacity filter
     * @param location Location search (case-insensitive contains)
     * @param status Status filter (ACTIVE, OUT_OF_SERVICE)
     * @return List of resources matching the filters
     */
    public List<Resource> getAllResources(ResourceType type, Integer minCapacity, 
                                          String location, ResourceStatus status) {
        // If no filters, return all resources
        if (type == null && minCapacity == null && location == null && status == null) {
            return resourceRepository.findAll();
        }

        // Apply filters based on provided parameters
        List<Resource> resources;
        
        if (type != null && location != null) {
            resources = resourceRepository.findByTypeAndLocationContainingIgnoreCase(type, location);
        } else if (type != null && status != null) {
            resources = resourceRepository.findByTypeAndStatus(type, status);
        } else if (type != null) {
            resources = resourceRepository.findByType(type);
        } else if (location != null) {
            resources = resourceRepository.findByLocationContainingIgnoreCase(location);
        } else if (status != null) {
            resources = resourceRepository.findByStatus(status);
        } else {
            resources = resourceRepository.findAll();
        }

        // Apply minCapacity filter if specified
        if (minCapacity != null) {
            resources = resources.stream()
                    .filter(r -> r.getCapacity() != null && r.getCapacity() >= minCapacity)
                    .toList();
        }

        return resources;
    }

    /**
     * Get a single resource by ID
     * @param id Resource ID
     * @return Resource object
     * @throws ResourceNotFoundException if resource not found
     */
    public Resource getResourceById(String id) {
        return resourceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Resource not found with id: " + id));
    }

    /**
     * Create a new resource with validation
     * @param resource Resource object to create
     * @return Created resource object
     * @throws IllegalArgumentException if validation fails or duplicate name
     */
    public Resource createResource(Resource resource) {
        // Trim name first
        if (resource.getName() != null) {
            resource.setName(resource.getName().trim());
        }
        
        // ✅ UNIQUE NAME VALIDATION - Check if name already exists
        if (resourceRepository.existsByName(resource.getName())) {
            throw new IllegalArgumentException(
                "Resource with name '" + resource.getName() + "' already exists. Please use a different name."
            );
        }
        
        validateResource(resource);
        
        // Set default availability times if not provided
        if (resource.getAvailabilityStart() == null) {
            resource.setAvailabilityStart(LocalTime.of(8, 0)); // Default 08:00
        }
        if (resource.getAvailabilityEnd() == null) {
            resource.setAvailabilityEnd(LocalTime.of(20, 0)); // Default 20:00
        }

        // Set default status if not provided
        if (resource.getStatus() == null) {
            resource.setStatus(ResourceStatus.ACTIVE);
        }

        log.info("Creating new resource: {}", resource.getName());
        return resourceRepository.save(resource);
    }

    /**
     * Update an existing resource
     * @param id Resource ID
     * @param updatedResource Updated resource object
     * @return Updated resource object
     * @throws ResourceNotFoundException if resource not found
     * @throws IllegalArgumentException if validation fails or duplicate name
     */
    public Resource updateResource(String id, Resource updatedResource) {
        Resource existingResource = getResourceById(id);

        // Trim name if present
        if (updatedResource.getName() != null) {
            updatedResource.setName(updatedResource.getName().trim());
        }

        // ✅ UNIQUE NAME VALIDATION - Check if name is taken by another resource
        // First check if the name has actually changed
        if (!existingResource.getName().equals(updatedResource.getName())) {
            // Only check uniqueness if name is being changed
            if (resourceRepository.existsByName(updatedResource.getName())) {
                throw new IllegalArgumentException(
                    "Resource with name '" + updatedResource.getName() + "' already exists. Please use a different name."
                );
            }
        }

        // Validate the updated resource
        validateResource(updatedResource);

        // Update fields
        existingResource.setName(updatedResource.getName());
        existingResource.setType(updatedResource.getType());
        existingResource.setCapacity(updatedResource.getCapacity());
        existingResource.setLocation(updatedResource.getLocation());
        existingResource.setStatus(updatedResource.getStatus());
        existingResource.setAvailabilityStart(updatedResource.getAvailabilityStart());
        existingResource.setAvailabilityEnd(updatedResource.getAvailabilityEnd());
        existingResource.setDescription(updatedResource.getDescription());

        log.info("Updating resource: {}", id);
        return resourceRepository.save(existingResource);
    }

    /**
     * Update only the status of a resource
     * @param id Resource ID
     * @param status New status
     * @return Updated resource object
     * @throws ResourceNotFoundException if resource not found
     */
    public Resource updateResourceStatus(String id, ResourceStatus status) {
        Resource resource = getResourceById(id);
        resource.setStatus(status);
        log.info("Updating resource status: {} -> {}", id, status);
        return resourceRepository.save(resource);
    }

    /**
     * Delete a resource
     * @param id Resource ID
     * @throws ResourceNotFoundException if resource not found
     */
    public void deleteResource(String id) {
        if (!resourceRepository.existsById(id)) {
            throw new ResourceNotFoundException("Resource not found with id: " + id);
        }
        log.info("Deleting resource: {}", id);
        resourceRepository.deleteById(id);
    }

    /**
     * Validate resource data
     * @param resource Resource to validate
     * @throws IllegalArgumentException if validation fails
     */
    private void validateResource(Resource resource) {
        // Name must not be empty
        if (resource.getName() == null || resource.getName().trim().isEmpty()) {
            throw new IllegalArgumentException("Resource name is required");
        }

        // Type must not be null
        if (resource.getType() == null) {
            throw new IllegalArgumentException("Resource type is required");
        }

        // Location must not be empty
        if (resource.getLocation() == null || resource.getLocation().trim().isEmpty()) {
            throw new IllegalArgumentException("Location is required");
        }

        // Capacity validation: required for HALL, LAB, ROOM; optional for EQUIPMENT
        if (resource.getType() != ResourceType.EQUIPMENT) {
            if (resource.getCapacity() == null || resource.getCapacity() <= 0) {
                throw new IllegalArgumentException("Capacity must be a positive number for " + resource.getType());
            }
        }

        // Availability time validation
        if (resource.getAvailabilityStart() != null && resource.getAvailabilityEnd() != null) {
            if (!resource.getAvailabilityStart().isBefore(resource.getAvailabilityEnd())) {
                throw new IllegalArgumentException("Availability start time must be before end time");
            }
        }
    }
}