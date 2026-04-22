package com.smartcampus.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationPreference {
    @Builder.Default
    private boolean bookings = true;
    @Builder.Default
    private boolean tickets = true;
    @Builder.Default
    private boolean security = true;
    @Builder.Default
    private boolean announcements = true;
    @Builder.Default
    private boolean resources = true;
}
