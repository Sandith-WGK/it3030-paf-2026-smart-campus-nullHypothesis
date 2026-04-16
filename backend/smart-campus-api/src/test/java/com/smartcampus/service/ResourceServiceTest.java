package com.smartcampus.service;

import com.smartcampus.exception.ResourceNotFoundException;
import com.smartcampus.model.Resource;
import com.smartcampus.model.ResourceStatus;
import com.smartcampus.model.ResourceType;
import com.smartcampus.repository.ResourceRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ResourceServiceTest {

    @Mock
    private ResourceRepository resourceRepository;

    @InjectMocks
    private ResourceService resourceService;

    private Resource sampleHall;
    private Resource sampleEquipment;

    @BeforeEach
    void setUp() {
        sampleHall = Resource.builder()
                .id("res-001")
                .name("Main Auditorium")
                .type(ResourceType.HALL)
                .capacity(200)
                .location("Block A, Level 1")
                .status(ResourceStatus.ACTIVE)
                .availabilityStart(LocalTime.of(8, 0))
                .availabilityEnd(LocalTime.of(20, 0))
                .description("Large auditorium with projector")
                .build();

        sampleEquipment = Resource.builder()
                .id("res-002")
                .name("Projector P-100")
                .type(ResourceType.EQUIPMENT)
                .capacity(null)
                .location("Block B, Store Room")
                .status(ResourceStatus.ACTIVE)
                .build();
    }

    // ── GET ALL (with filters) ──────────────────────────────────────────────

    @Nested
    @DisplayName("getAllResources")
    class GetAllResources {

        @Test
        @DisplayName("returns all resources when no filters provided")
        void returnsAllWhenNoFilters() {
            when(resourceRepository.findAll()).thenReturn(List.of(sampleHall, sampleEquipment));

            List<Resource> result = resourceService.getAllResources(null, null, null, null);

            assertThat(result).hasSize(2);
            verify(resourceRepository).findAll();
        }

        @Test
        @DisplayName("filters by type")
        void filtersByType() {
            when(resourceRepository.findByType(ResourceType.HALL)).thenReturn(List.of(sampleHall));

            List<Resource> result = resourceService.getAllResources(ResourceType.HALL, null, null, null);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getType()).isEqualTo(ResourceType.HALL);
        }

        @Test
        @DisplayName("filters by type and location")
        void filtersByTypeAndLocation() {
            when(resourceRepository.findByTypeAndLocationContainingIgnoreCase(ResourceType.HALL, "Block A"))
                    .thenReturn(List.of(sampleHall));

            List<Resource> result = resourceService.getAllResources(ResourceType.HALL, null, "Block A", null);

            assertThat(result).hasSize(1);
        }

        @Test
        @DisplayName("filters by minimum capacity")
        void filtersByMinCapacity() {
            when(resourceRepository.findAll()).thenReturn(List.of(sampleHall, sampleEquipment));

            List<Resource> result = resourceService.getAllResources(null, 100, null, null);

            assertThat(result).hasSize(1);
            assertThat(result.get(0).getName()).isEqualTo("Main Auditorium");
        }

        @Test
        @DisplayName("filters by status")
        void filtersByStatus() {
            when(resourceRepository.findByStatus(ResourceStatus.ACTIVE)).thenReturn(List.of(sampleHall, sampleEquipment));

            List<Resource> result = resourceService.getAllResources(null, null, null, ResourceStatus.ACTIVE);

            assertThat(result).hasSize(2);
        }
    }

    // ── GET BY ID ───────────────────────────────────────────────────────────

    @Nested
    @DisplayName("getResourceById")
    class GetResourceById {

        @Test
        @DisplayName("returns resource when found")
        void returnsResourceWhenFound() {
            when(resourceRepository.findById("res-001")).thenReturn(Optional.of(sampleHall));

            Resource result = resourceService.getResourceById("res-001");

            assertThat(result.getName()).isEqualTo("Main Auditorium");
        }

        @Test
        @DisplayName("throws ResourceNotFoundException when not found")
        void throwsWhenNotFound() {
            when(resourceRepository.findById("nonexistent")).thenReturn(Optional.empty());

            assertThatThrownBy(() -> resourceService.getResourceById("nonexistent"))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    // ── CREATE ──────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("createResource")
    class CreateResource {

        @Test
        @DisplayName("creates resource with defaults for availability and status")
        void createsWithDefaults() {
            Resource input = Resource.builder()
                    .name("Lab 101")
                    .type(ResourceType.LAB)
                    .capacity(30)
                    .location("Block C, Level 3")
                    .build();

            when(resourceRepository.save(any(Resource.class))).thenAnswer(inv -> inv.getArgument(0));

            Resource result = resourceService.createResource(input);

            assertThat(result.getAvailabilityStart()).isEqualTo(LocalTime.of(8, 0));
            assertThat(result.getAvailabilityEnd()).isEqualTo(LocalTime.of(20, 0));
            assertThat(result.getStatus()).isEqualTo(ResourceStatus.ACTIVE);
        }

        @Test
        @DisplayName("rejects resource with missing name")
        void rejectsMissingName() {
            Resource input = Resource.builder()
                    .type(ResourceType.ROOM)
                    .capacity(10)
                    .location("Block A")
                    .build();

            assertThatThrownBy(() -> resourceService.createResource(input))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("name");
        }

        @Test
        @DisplayName("rejects HALL/LAB/ROOM with null or zero capacity")
        void rejectsNonEquipmentWithoutCapacity() {
            Resource input = Resource.builder()
                    .name("Meeting Room")
                    .type(ResourceType.ROOM)
                    .capacity(null)
                    .location("Block A")
                    .build();

            assertThatThrownBy(() -> resourceService.createResource(input))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Capacity");
        }

        @Test
        @DisplayName("allows EQUIPMENT without capacity")
        void allowsEquipmentWithoutCapacity() {
            when(resourceRepository.save(any(Resource.class))).thenAnswer(inv -> inv.getArgument(0));

            Resource result = resourceService.createResource(sampleEquipment);

            assertThat(result.getCapacity()).isNull();
        }

        @Test
        @DisplayName("rejects invalid availability window (start after end)")
        void rejectsInvalidAvailabilityWindow() {
            Resource input = Resource.builder()
                    .name("Room 1")
                    .type(ResourceType.ROOM)
                    .capacity(10)
                    .location("Block A")
                    .availabilityStart(LocalTime.of(18, 0))
                    .availabilityEnd(LocalTime.of(8, 0))
                    .build();

            assertThatThrownBy(() -> resourceService.createResource(input))
                    .isInstanceOf(IllegalArgumentException.class)
                    .hasMessageContaining("Availability start time");
        }
    }

    // ── UPDATE ──────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("updateResource")
    class UpdateResource {

        @Test
        @DisplayName("updates all fields of existing resource")
        void updatesAllFields() {
            when(resourceRepository.findById("res-001")).thenReturn(Optional.of(sampleHall));
            when(resourceRepository.save(any(Resource.class))).thenAnswer(inv -> inv.getArgument(0));

            Resource updateData = Resource.builder()
                    .name("Main Auditorium (Renovated)")
                    .type(ResourceType.HALL)
                    .capacity(250)
                    .location("Block A, Level 1")
                    .status(ResourceStatus.ACTIVE)
                    .availabilityStart(LocalTime.of(7, 0))
                    .availabilityEnd(LocalTime.of(22, 0))
                    .description("Renovated with new AV system")
                    .build();

            Resource result = resourceService.updateResource("res-001", updateData);

            assertThat(result.getName()).isEqualTo("Main Auditorium (Renovated)");
            assertThat(result.getCapacity()).isEqualTo(250);
        }

        @Test
        @DisplayName("throws ResourceNotFoundException for nonexistent ID")
        void throwsForNonexistent() {
            when(resourceRepository.findById("bad-id")).thenReturn(Optional.empty());

            Resource updateData = Resource.builder()
                    .name("X").type(ResourceType.ROOM).capacity(5).location("X").build();

            assertThatThrownBy(() -> resourceService.updateResource("bad-id", updateData))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }

    // ── UPDATE STATUS ───────────────────────────────────────────────────────

    @Nested
    @DisplayName("updateResourceStatus")
    class UpdateResourceStatus {

        @Test
        @DisplayName("sets resource to OUT_OF_SERVICE")
        void setsOutOfService() {
            when(resourceRepository.findById("res-001")).thenReturn(Optional.of(sampleHall));
            when(resourceRepository.save(any(Resource.class))).thenAnswer(inv -> inv.getArgument(0));

            Resource result = resourceService.updateResourceStatus("res-001", ResourceStatus.OUT_OF_SERVICE);

            assertThat(result.getStatus()).isEqualTo(ResourceStatus.OUT_OF_SERVICE);
        }
    }

    // ── DELETE ───────────────────────────────────────────────────────────────

    @Nested
    @DisplayName("deleteResource")
    class DeleteResource {

        @Test
        @DisplayName("deletes existing resource")
        void deletesExisting() {
            when(resourceRepository.existsById("res-001")).thenReturn(true);

            resourceService.deleteResource("res-001");

            verify(resourceRepository).deleteById("res-001");
        }

        @Test
        @DisplayName("throws ResourceNotFoundException for nonexistent resource")
        void throwsForNonexistent() {
            when(resourceRepository.existsById("bad-id")).thenReturn(false);

            assertThatThrownBy(() -> resourceService.deleteResource("bad-id"))
                    .isInstanceOf(ResourceNotFoundException.class);
        }
    }
}
