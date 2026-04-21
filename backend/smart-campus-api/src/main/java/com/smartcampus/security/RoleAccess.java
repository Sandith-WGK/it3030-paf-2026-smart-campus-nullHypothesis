package com.smartcampus.security;

import com.smartcampus.model.Role;
import com.smartcampus.model.ResourceType;
import com.smartcampus.model.User;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.EnumSet;
import java.util.Set;

public final class RoleAccess {
    private RoleAccess() {}

    public static final Set<Role> REQUESTER_ROLES = EnumSet.of(
            Role.UNDERGRADUATE_STUDENT, Role.INSTRUCTOR, Role.LECTURER
    );

    public static boolean isManager(Role role) {
        return role == Role.MANAGER;
    }

    public static boolean requiresTwoFactor(Role role) {
        return role == Role.MANAGER || role == Role.TECHNICIAN;
    }

    public static boolean canUpdateTicketStatus(Role role) {
        return role == Role.MANAGER || role == Role.TECHNICIAN;
    }

    public static boolean canBookResource(Role role, ResourceType resourceType) {
        return switch (role) {
            case UNDERGRADUATE_STUDENT -> resourceType == ResourceType.ROOM || resourceType == ResourceType.EQUIPMENT;
            case INSTRUCTOR -> resourceType == ResourceType.ROOM
                    || resourceType == ResourceType.HALL
                    || resourceType == ResourceType.LAB
                    || resourceType == ResourceType.EQUIPMENT;
            case LECTURER, MANAGER -> true;
            case TECHNICIAN -> false;
        };
    }

    public static long maxBookingHours(Role role) {
        return switch (role) {
            case UNDERGRADUATE_STUDENT -> 2;
            case INSTRUCTOR -> 6;
            case LECTURER -> 8;
            case MANAGER -> 12;
            case TECHNICIAN -> 0;
        };
    }

    public static long bookingHorizonDays(Role role) {
        return switch (role) {
            case UNDERGRADUATE_STUDENT -> 14;
            case INSTRUCTOR -> 30;
            case LECTURER -> 45;
            case MANAGER -> 90;
            case TECHNICIAN -> 0;
        };
    }

    public static int maxActiveFutureBookings(Role role) {
        return switch (role) {
            case UNDERGRADUATE_STUDENT -> 3;
            case INSTRUCTOR -> 10;
            case LECTURER -> 15;
            case MANAGER -> Integer.MAX_VALUE;
            case TECHNICIAN -> 0;
        };
    }

    public static int bookingPriorityScore(User user, ResourceType resourceType, LocalDate date, LocalTime start, LocalTime end) {
        int roleScore = switch (user.getRole()) {
            case LECTURER -> 300;
            case INSTRUCTOR -> 200;
            case UNDERGRADUATE_STUDENT -> 100;
            case MANAGER -> 1000;
            case TECHNICIAN -> 0;
        };
        int resourceBonus = switch (resourceType) {
            case LAB -> 30;
            case HALL -> 40;
            case ROOM, EQUIPMENT -> 10;
        };
        int durationBonus = (int) Math.max(0, 8 - ChronoUnit.HOURS.between(start, end));
        return roleScore + resourceBonus + durationBonus;
    }
}
