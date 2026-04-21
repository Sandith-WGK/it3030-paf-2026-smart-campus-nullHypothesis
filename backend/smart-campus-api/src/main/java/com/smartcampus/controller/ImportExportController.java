package com.smartcampus.controller;

import com.smartcampus.dto.ApiResponse;
import com.smartcampus.service.ImportExportService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.ByteArrayInputStream;

/**
 * REST controller for Import/Export operations (Module A - Facilities & Assets Catalogue).
 * Admin only endpoints for CSV import/export.
 */
@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class ImportExportController {

    private final ImportExportService importExportService;

    /**
     * GET /api/v1/admin/export/resources
     * Export all resources to CSV file
     * Admin only
     */
    @GetMapping("/export/resources")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<byte[]> exportResources() {
        ByteArrayInputStream inputStream = importExportService.exportResourcesToCSV();
        
        byte[] csvData = inputStream.readAllBytes();
        
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=resources.csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csvData);
    }

    /**
     * POST /api/v1/admin/import/resources
     * Import resources from CSV file
     * Admin only
     */
    @PostMapping("/import/resources")
    @PreAuthorize("hasRole('MANAGER')")
    public ResponseEntity<ApiResponse<String>> importResources(
            @RequestParam("file") MultipartFile file) {
        
        if (file.isEmpty()) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Please select a CSV file to upload"));
        }
        
        // Validate file type
        String contentType = file.getContentType();
        if (contentType == null || !contentType.equals("text/csv")) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Only CSV files are allowed"));
        }
        
        try {
            int importedCount = importExportService.importResourcesFromCSV(file);
            String message = String.format("Successfully imported %d resources", importedCount);
            return ResponseEntity.status(HttpStatus.CREATED)
                    .body(ApiResponse.success(message, message));
        } catch (Exception e) {
            return ResponseEntity.badRequest()
                    .body(ApiResponse.error("Import failed: " + e.getMessage()));
        }
    }
}
