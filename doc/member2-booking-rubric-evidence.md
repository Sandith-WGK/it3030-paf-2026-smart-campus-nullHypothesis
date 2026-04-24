# Member 2 Booking Rubric Evidence

## Scope owner
- Member 2: Booking workflow and conflict checking.

## Conflict policy declaration (for viva/report)
- The booking system intentionally uses an arbitration model:
  - Multiple overlapping `PENDING` requests may exist for the same resource/time range.
  - Only one can become `APPROVED`.
  - Approval is guarded by conflict re-check and an approval lock path to prevent race approvals.
  - Overlapping `PENDING` requests are auto-rejected after one is approved.
- Rationale: this models real review queues where admins arbitrate competing requests.

## Endpoint ownership and HTTP semantics
- `POST /api/v1/bookings` -> `201 Created`
- `GET /api/v1/bookings/my` -> `200 OK`
- `GET /api/v1/bookings/{id}` -> `200 OK`
- `PUT /api/v1/bookings/{id}` -> `200 OK`
- `PATCH /api/v1/bookings/{id}/approve` -> `200 OK`
- `PATCH /api/v1/bookings/{id}/reject` -> `200 OK`
- `PATCH /api/v1/bookings/{id}/cancel` -> `204 No Content`
- `DELETE /api/v1/bookings/{id}` -> `204 No Content`
- `GET /api/v1/bookings` (admin) -> `200 OK`
- `GET /api/v1/bookings/resource-schedule` -> `200 OK`

## UI ownership (React)
- User booking workflow pages:
  - `frontend/src/pages/bookings/NewBooking.jsx`
  - `frontend/src/pages/bookings/EditBooking.jsx`
  - `frontend/src/pages/bookings/MyBookings.jsx`
  - `frontend/src/components/booking/BookingForm.jsx`
  - `frontend/src/components/booking/BookingTimeline.jsx`
- Admin review flow:
  - `frontend/src/pages/admin/AdminBookings.jsx`

## Test evidence map
- Service-level logic tests:
  - `backend/smart-campus-api/src/test/java/com/smartcampus/service/BookingServiceTest.java`
  - `backend/smart-campus-api/src/test/java/com/smartcampus/service/BookingResourceIntegrationTest.java`
- Controller HTTP + RBAC tests:
  - `backend/smart-campus-api/src/test/java/com/smartcampus/controller/BookingControllerWebMvcTest.java`
  - Covers `201`, `400`, `403`, `404`, `409`, and admin-only endpoint access.

## Demo checklist reference
- `doc/booking-demo-readiness-checklist.md`
