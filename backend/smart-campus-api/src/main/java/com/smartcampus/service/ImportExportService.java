package com.smartcampus.service;

import com.opencsv.CSVReader;
import com.opencsv.CSVWriter;
import com.smartcampus.model.Resource;
import com.smartcampus.model.ResourceStatus;
import com.smartcampus.model.ResourceType;
import com.smartcampus.repository.ResourceRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

/**
 * Service for importing and exporting resources to/from CSV format.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ImportExportService {

    private final ResourceRepository resourceRepository;
    private final ResourceService resourceService;

    /**
     * Export all resources to CSV format
     * @return ByteArrayInputStream containing CSV data
     */
    public ByteArrayInputStream exportResourcesToCSV() {
        List<Resource> resources = resourceRepository.findAll();
        
        try (ByteArrayOutputStream outputStream = new ByteArrayOutputStream();
             CSVWriter writer = new CSVWriter(new OutputStreamWriter(outputStream))) {
            
            // Write header
            String[] header = {"ID", "Name", "Type", "Capacity", "Location", "Status", 
                             "Availability Start", "Availability End", "Description"};
            writer.writeNext(header);
            
            // Write data rows
            for (Resource resource : resources) {
                String[] data = {
                    resource.getId() != null ? resource.getId() : "",
                    resource.getName() != null ? resource.getName() : "",
                    resource.getType() != null ? resource.getType().name() : "",
                    resource.getCapacity() != null ? resource.getCapacity().toString() : "",
                    resource.getLocation() != null ? resource.getLocation() : "",
                    resource.getStatus() != null ? resource.getStatus().name() : "",
                    resource.getAvailabilityStart() != null ? resource.getAvailabilityStart().toString() : "08:00",
                    resource.getAvailabilityEnd() != null ? resource.getAvailabilityEnd().toString() : "20:00",
                    resource.getDescription() != null ? resource.getDescription() : ""
                };
                writer.writeNext(data);
            }
            
            writer.flush();
            log.info("Exported {} resources to CSV", resources.size());
            return new ByteArrayInputStream(outputStream.toByteArray());
            
        } catch (Exception e) {
            log.error("Error exporting resources to CSV", e);
            throw new RuntimeException("Failed to export resources: " + e.getMessage());
        }
    }

    /**
     * Import resources from CSV file - Skips duplicates and imports valid ones
     * @param file MultipartFile containing CSV data
     * @return Number of resources imported
     */
    public int importResourcesFromCSV(MultipartFile file) {
        ImportResult result = importResourcesFromCSVWithDetails(file);
        return result.getImportedCount();
    }

    /**
     * Import resources from CSV file with detailed results
     * @param file MultipartFile containing CSV data
     * @return ImportResult with details about imported and skipped records
     */
    public ImportResult importResourcesFromCSVWithDetails(MultipartFile file) {
        List<String> skippedReasons = new ArrayList<>();
        List<Resource> importedResources = new ArrayList<>();
        Set<String> processedNames = new HashSet<>();
        int totalRows = 0;
        
        try (CSVReader reader = new CSVReader(new InputStreamReader(file.getInputStream()))) {
            List<String[]> rows = reader.readAll();
            
            if (rows.isEmpty()) {
                throw new IllegalArgumentException("CSV file is empty");
            }
            
            totalRows = rows.size() - 1; // Excluding header
            
            // Process each row
            for (int i = 1; i < rows.size(); i++) {
                String[] row = rows.get(i);
                
                // Skip empty rows
                if (row.length < 5 || (row[1] == null && row[2] == null && row[4] == null)) {
                    skippedReasons.add("Row " + (i + 1) + ": Empty row - skipped");
                    continue;
                }
                
                try {
                    // Parse resource from row
                    Resource resource = parseResourceFromRow(row);
                    
                    // Trim name
                    if (resource.getName() != null) {
                        resource.setName(resource.getName().trim());
                    }
                    
                    // Check for duplicate within the same CSV file
                    if (processedNames.contains(resource.getName())) {
                        skippedReasons.add("Row " + (i + 1) + ": Duplicate name '" + resource.getName() + "' within CSV file - skipped");
                        continue;
                    }
                    
                    // Check if name already exists in database
                    if (resourceRepository.existsByName(resource.getName())) {
                        skippedReasons.add("Row " + (i + 1) + ": Resource '" + resource.getName() + "' already exists in database - skipped");
                        continue;
                    }
                    
                    // Mark as processed
                    processedNames.add(resource.getName());
                    
                    // Validate and save using createResource (which has all validations)
                    Resource saved = resourceService.createResource(resource);
                    importedResources.add(saved);
                    log.info("Imported resource: {}", resource.getName());
                    
                } catch (Exception e) {
                    String name = getResourceNameFromRow(row);
                    skippedReasons.add("Row " + (i + 1) + " (" + name + "): " + e.getMessage());
                    log.warn("Error importing row {}: {}", i + 1, e.getMessage());
                }
            }
            
            int importedCount = importedResources.size();
            int skippedCount = skippedReasons.size();
            
            log.info("Import completed: {} imported, {} skipped out of {} total rows", 
                    importedCount, skippedCount, totalRows);
            
            return new ImportResult(importedCount, skippedCount, totalRows, skippedReasons);
            
        } catch (Exception e) {
            log.error("Error importing resources from CSV", e);
            throw new RuntimeException("Failed to import resources: " + e.getMessage());
        }
    }

    /**
     * Parse a Resource object from a CSV row
     */
    private Resource parseResourceFromRow(String[] row) {
        Resource resource = new Resource();
        
        // Name (required)
        if (row[1] == null || row[1].trim().isEmpty()) {
            throw new IllegalArgumentException("Resource name is required");
        }
        resource.setName(row[1].trim());
        
        // Type (required)
        if (row[2] == null || row[2].trim().isEmpty()) {
            throw new IllegalArgumentException("Resource type is required");
        }
        resource.setType(ResourceType.valueOf(row[2].trim().toUpperCase()));
        
        // Capacity (optional for EQUIPMENT)
        if (row[3] != null && !row[3].trim().isEmpty()) {
            try {
                resource.setCapacity(Integer.parseInt(row[3].trim()));
            } catch (NumberFormatException e) {
                throw new IllegalArgumentException("Invalid capacity value: " + row[3]);
            }
        }
        
        // Location (required)
        if (row[4] == null || row[4].trim().isEmpty()) {
            throw new IllegalArgumentException("Location is required");
        }
        resource.setLocation(row[4].trim());
        
        // Status (default to ACTIVE)
        if (row[5] != null && !row[5].trim().isEmpty()) {
            resource.setStatus(ResourceStatus.valueOf(row[5].trim().toUpperCase()));
        } else {
            resource.setStatus(ResourceStatus.ACTIVE);
        }
        
        // Availability Start (default to 08:00)
        if (row[6] != null && !row[6].trim().isEmpty()) {
            resource.setAvailabilityStart(LocalTime.parse(row[6].trim()));
        } else {
            resource.setAvailabilityStart(LocalTime.of(8, 0));
        }
        
        // Availability End (default to 20:00)
        if (row[7] != null && !row[7].trim().isEmpty()) {
            resource.setAvailabilityEnd(LocalTime.parse(row[7].trim()));
        } else {
            resource.setAvailabilityEnd(LocalTime.of(20, 0));
        }
        
        // Description (optional)
        if (row.length > 8 && row[8] != null) {
            resource.setDescription(row[8].trim());
        }
        
        return resource;
    }

    /**
     * Get resource name from row for error messages
     */
    private String getResourceNameFromRow(String[] row) {
        if (row.length > 1 && row[1] != null && !row[1].trim().isEmpty()) {
            return row[1].trim();
        }
        return "Unknown";
    }

    /**
     * Inner class to hold import results
     */
    public static class ImportResult {
        private final int importedCount;
        private final int skippedCount;
        private final int totalRows;
        private final List<String> skippedReasons;
        
        public ImportResult(int importedCount, int skippedCount, int totalRows, List<String> skippedReasons) {
            this.importedCount = importedCount;
            this.skippedCount = skippedCount;
            this.totalRows = totalRows;
            this.skippedReasons = skippedReasons;
        }
        
        public int getImportedCount() {
            return importedCount;
        }
        
        public int getSkippedCount() {
            return skippedCount;
        }
        
        public int getTotalRows() {
            return totalRows;
        }
        
        public List<String> getSkippedReasons() {
            return skippedReasons;
        }
    }
}