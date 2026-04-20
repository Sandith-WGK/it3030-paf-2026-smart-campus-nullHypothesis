/**
 * @author Daniru
 */
package com.smartcampus.model;

/**
 * Represents the severity level of a notification for UI styling purposes.
 */
public enum Severity {
    INFO,    // General information (e.g., "Your profile was updated")
    SUCCESS, // Positive outcomes (e.g., "Booking Approved")
    ALERT    // Critical updates or warnings (e.g., "Booking Rejected" or "Urgent Action Required")
}
