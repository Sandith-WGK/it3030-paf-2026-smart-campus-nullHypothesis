package com.smartcampus.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.smartcampus.dto.PagedResponse;
import com.smartcampus.dto.booking.BookingRequest;
import com.smartcampus.dto.booking.BookingResponse;
import com.smartcampus.dto.booking.MostBookedResourceResponse;
import com.smartcampus.exception.BookingConflictException;
import com.smartcampus.exception.GlobalExceptionHandler;
import com.smartcampus.exception.ResourceNotFoundException;
import com.smartcampus.exception.UnauthorizedAccessException;
import com.smartcampus.model.BookingStatus;
import com.smartcampus.security.UserPrincipal;
import com.smartcampus.service.BookingService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.context.ContextConfiguration;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(controllers = BookingController.class)
@ContextConfiguration(classes = {
        BookingController.class,
        GlobalExceptionHandler.class,
        BookingControllerWebMvcTest.TestSecurityConfig.class
})
@Import({GlobalExceptionHandler.class, BookingControllerWebMvcTest.TestSecurityConfig.class})
class BookingControllerWebMvcTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private BookingService bookingService;

    @Test
    void createBooking_returns201() throws Exception {
        BookingRequest request = BookingRequest.builder()
                .resourceId("res-1")
                .date(LocalDate.now().plusDays(2))
                .startTime(LocalTime.of(10, 0))
                .endTime(LocalTime.of(11, 0))
                .purpose("Module 2 viva prep")
                .expectedAttendees(8)
                .build();

        BookingResponse response = BookingResponse.builder()
                .id("booking-1")
                .resourceId("res-1")
                .status(BookingStatus.PENDING)
                .build();

        when(bookingService.createBooking(any(BookingRequest.class), eq("user-1"))).thenReturn(response);

        mockMvc.perform(post("/api/v1/bookings")
                        .with(authentication(userAuth("user-1", "USER")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value("booking-1"));
    }

    @Test
    void createBooking_returns400_forValidationFailure() throws Exception {
        String invalidPayload = """
                {
                  "resourceId": "res-1",
                  "date": "2030-06-20",
                  "startTime": "10:00:00",
                  "endTime": "11:00:00",
                  "purpose": "",
                  "expectedAttendees": 5
                }
                """;

        mockMvc.perform(post("/api/v1/bookings")
                        .with(authentication(userAuth("user-1", "USER")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(invalidPayload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Validation failed"));
    }

    @Test
    void createBooking_returns409_forConflict() throws Exception {
        BookingRequest request = BookingRequest.builder()
                .resourceId("res-1")
                .date(LocalDate.now().plusDays(2))
                .startTime(LocalTime.of(10, 30))
                .endTime(LocalTime.of(11, 30))
                .purpose("Overlapping booking")
                .expectedAttendees(6)
                .build();

        when(bookingService.createBooking(any(BookingRequest.class), anyString()))
                .thenThrow(new BookingConflictException("Time slot conflicts with an existing approved booking"));

        mockMvc.perform(post("/api/v1/bookings")
                        .with(authentication(userAuth("user-1", "USER")))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void getBookingById_returns404_whenMissing() throws Exception {
        when(bookingService.getBookingById(eq("missing-id"), anyString(), anyBoolean()))
                .thenThrow(new ResourceNotFoundException("Booking", "id", "missing-id"));

        mockMvc.perform(get("/api/v1/bookings/missing-id")
                        .with(authentication(userAuth("user-1", "USER"))))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    void getBookingById_returns403_forUnauthorizedOwner() throws Exception {
        when(bookingService.getBookingById(eq("booking-1"), anyString(), anyBoolean()))
                .thenThrow(new UnauthorizedAccessException("You can only view your own bookings"));

        mockMvc.perform(get("/api/v1/bookings/booking-1")
                        .with(authentication(userAuth("user-2", "USER"))))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @WithMockUser(roles = "USER")
    void getAllBookings_returns403_forNonAdmin() throws Exception {
        mockMvc.perform(get("/api/v1/bookings"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void getAllBookings_returns200_forAdmin() throws Exception {
        PagedResponse<BookingResponse> page = PagedResponse.<BookingResponse>builder()
                .content(List.of())
                .page(0)
                .size(50)
                .totalElements(0)
                .totalPages(0)
                .hasNext(false)
                .build();
        when(bookingService.getAllBookings(any(), anyString(), anyString(), any(), anyInt(), anyInt()))
                .thenReturn(page);

        mockMvc.perform(get("/api/v1/bookings"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    void getMyMostBookedResources_returns200_forAuthenticatedUser() throws Exception {
        List<MostBookedResourceResponse> rows = List.of(
                MostBookedResourceResponse.builder()
                        .resourceId("res-1")
                        .resourceName("Chemistry Lab 301")
                        .bookCount(4)
                        .latestBookingId("booking-77")
                        .build()
        );
        when(bookingService.getMyMostBookedResources("user-1", 5)).thenReturn(rows);

        mockMvc.perform(get("/api/v1/bookings/my/most-booked")
                        .with(authentication(userAuth("user-1", "USER"))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].resourceId").value("res-1"))
                .andExpect(jsonPath("$.data[0].bookCount").value(4))
                .andExpect(jsonPath("$.data[0].latestBookingId").value("booking-77"));
    }

    @Test
    @WithMockUser(roles = "USER")
    void expirePastPendingBookingsNow_returns403_forNonAdmin() throws Exception {
        mockMvc.perform(post("/api/v1/bookings/admin/expire-pending"))
                .andExpect(status().isForbidden());
    }

    @Test
    @WithMockUser(roles = "ADMIN")
    void expirePastPendingBookingsNow_returns200_forAdmin() throws Exception {
        mockMvc.perform(post("/api/v1/bookings/admin/expire-pending"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Past pending bookings expired successfully"));

        verify(bookingService).expirePastPendingBookings();
    }

    private UsernamePasswordAuthenticationToken userAuth(String userId, String role) {
        UserPrincipal principal = new UserPrincipal(
                userId,
                "member2@sliit.lk",
                "Member Two",
                "LOCAL",
                null,
                null,
                List.of(new SimpleGrantedAuthority("ROLE_" + role))
        );
        return new UsernamePasswordAuthenticationToken(principal, null, principal.getAuthorities());
    }

    @TestConfiguration
    @EnableMethodSecurity
    static class TestSecurityConfig {
        @Bean
        SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
            return http
                    .csrf(csrf -> csrf.disable())
                    .authorizeHttpRequests(auth -> auth.anyRequest().authenticated())
                    .httpBasic(Customizer.withDefaults())
                    .build();
        }
    }
}
