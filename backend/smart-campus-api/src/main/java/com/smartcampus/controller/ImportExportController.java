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
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/admin")
@RequiredArgsConstructor
public class ImportExportController {

    private final ImportExportService importExportService;

    @GetMapping("/export/resources")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<byte[]> exportResources() {
        ByteArrayInputStream inputStream = importExportService.exportResourcesToCSV();
        
        byte[] csvData = inputStream.readAllBytes();
        
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=resources.csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csvData);
    }

    @PostMapping("/import/resources")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<Map<String, Object>> importResources(
            @RequestParam("file") MultipartFile file) {
        
        Map<String, Object> response = new HashMap<>();
        
        if (file.isEmpty()) {
            response.put("success", false);
            response.put("message", "Please select a CSV file to upload");
            return ResponseEntity.badRequest().body(response);
        }
        
        String contentType = file.getContentType();
        if (contentType == null || !contentType.equals("text/csv")) {
            response.put("success", false);
            response.put("message", "Only CSV files are allowed");
            return ResponseEntity.badRequest().body(response);
        }
        
        try {
            ImportExportService.ImportResult result = importExportService.importResourcesFromCSVWithDetails(file);
            
            response.put("success", result.getImportedCount() > 0);
            response.put("message", String.format(
                "Import completed: %d imported successfully, %d skipped",
                result.getImportedCount(),
                result.getSkippedCount()
            ));
            response.put("importedCount", result.getImportedCount());
            response.put("skippedCount", result.getSkippedCount());
            response.put("totalRows", result.getTotalRows());
            response.put("skippedReasons", result.getSkippedReasons());
            
            if (result.getImportedCount() == 0) {
                return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
            } else if (result.getSkippedCount() > 0) {
                return ResponseEntity.status(HttpStatus.PARTIAL_CONTENT).body(response);
            } else {
                return ResponseEntity.status(HttpStatus.CREATED).body(response);
            }
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Import failed: " + e.getMessage());
            return ResponseEntity.badRequest().body(response);
        }
    }
}