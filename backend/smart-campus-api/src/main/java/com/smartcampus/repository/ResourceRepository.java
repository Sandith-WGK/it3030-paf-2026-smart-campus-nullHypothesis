package com.smartcampus.repository;

import com.smartcampus.model.Resource;
import com.smartcampus.model.ResourceStatus;
import com.smartcampus.model.ResourceType;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ResourceRepository extends MongoRepository<Resource, String> {

    // Search by type
    List<Resource> findByType(ResourceType type);

    // Search by location (case-insensitive contains)
    List<Resource> findByLocationContainingIgnoreCase(String location);

    // Search by status
    List<Resource> findByStatus(ResourceStatus status);

    // Search by type AND location
    List<Resource> findByTypeAndLocationContainingIgnoreCase(
            ResourceType type, String location);

    // Search by type AND status
    List<Resource> findByTypeAndStatus(ResourceType type, ResourceStatus status);

    // ========== UNIQUE NAME VALIDATION METHODS ==========
    
    /**
     * Check if a resource with the given name already exists.
     * Used for create operation validation.
     * 
     * @param name Resource name to check
     * @return true if a resource with this name exists, false otherwise
     */
    boolean existsByName(String name);
    
    /**
     * Find resources by exact name match.
     * Used for update operation validation to check if name is taken by another resource.
     * 
     * @param name Resource name to search
     * @return List of resources with the given name
     */
    List<Resource> findByName(String name);
    
    /**
     * Check if a resource with the given name exists and has a different ID.
     * Used for update operation validation (exclude current resource).
     * 
     * @param name Resource name to check
     * @param id Resource ID to exclude from check
     * @return true if another resource with this name exists, false otherwise
     */
    boolean existsByNameAndIdNot(String name, String id);
}