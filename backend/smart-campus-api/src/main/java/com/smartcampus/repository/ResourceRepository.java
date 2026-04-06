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

}