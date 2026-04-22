package com.smartcampus.model;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserPreference {

    @Builder.Default
    private Theme theme = Theme.SYSTEM;

    @Builder.Default
    private boolean enableSounds = true;

    @Builder.Default
    private boolean enableEmailNotifications = true;

    @Builder.Default
    private boolean enablePushNotifications = true;
}
