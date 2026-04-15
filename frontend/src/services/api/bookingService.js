import api from './axios';

const BASE = '/api/v1/bookings';

const bookingService = {
  // POST /api/v1/bookings
  createBooking: (data) => api.post(BASE, data),

  // GET /api/v1/bookings/my?status=...
  getMyBookings: (status) =>
    api.get(`${BASE}/my`, { params: status ? { status } : {} }),

  // GET /api/v1/bookings?status=...&resourceId=...&userId=...&date=...
  getAllBookings: (filters = {}) => api.get(BASE, { params: filters }),

  // GET /api/v1/bookings/:id
  getBookingById: (id) => api.get(`${BASE}/${id}`),

  // PUT /api/v1/bookings/:id
  updateBooking: (id, data) => api.put(`${BASE}/${id}`, data),

  // PATCH /api/v1/bookings/:id/approve
  approveBooking: (id) => api.patch(`${BASE}/${id}/approve`),

  // PATCH /api/v1/bookings/:id/reject
  rejectBooking: (id, rejectionReason) =>
    api.patch(`${BASE}/${id}/reject`, { rejectionReason }),

  // PATCH /api/v1/bookings/:id/cancel
  cancelBooking: (id) => api.patch(`${BASE}/${id}/cancel`),

  // DELETE /api/v1/bookings/:id
  deleteBooking: (id) => api.delete(`${BASE}/${id}`),

  // GET /api/v1/bookings/resource-schedule?resourceId=...&date=...
  getResourceSchedule: (resourceId, date) =>
    api.get(`${BASE}/resource-schedule`, { params: { resourceId, date } }),
};

export default bookingService;
