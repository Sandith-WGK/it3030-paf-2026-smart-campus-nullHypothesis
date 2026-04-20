package com.smartcampus.dto;

import com.smartcampus.model.Theme;
import lombok.Data;

@Data
public class UserPreferenceUpdateRequest {
    private Theme theme;
    private Boolean enableSounds;
    private Boolean enableEmailNotifications;
    private Boolean enablePushNotifications;
}
