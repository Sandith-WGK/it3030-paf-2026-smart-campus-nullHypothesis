import api from './axios';

const BASE = '/bookings';

const bookingService = {
  // POST /bookings
  createBooking: (data) => api.post(BASE, data),

  // GET /bookings/my?status=...
  getMyBookings: (status) =>
    api.get(`${BASE}/my`, { params: status ? { status } : {} }),

  // GET /bookings?status=...&resourceId=...&userId=...&date=...
  getAllBookings: (filters = {}) => api.get(BASE, { params: filters }),

  // GET /bookings/:id
  getBookingById: (id) => api.get(`${BASE}/${id}`),

  // PUT /bookings/:id
  updateBooking: (id, data) => api.put(`${BASE}/${id}`, data),

  // PATCH /bookings/:id/approve
  approveBooking: (id) => api.patch(`${BASE}/${id}/approve`),

  // PATCH /bookings/:id/reject
  rejectBooking: (id, rejectionReason) =>
    api.patch(`${BASE}/${id}/reject`, { rejectionReason }),

  // PATCH /bookings/:id/cancel
  cancelBooking: (id) => api.patch(`${BASE}/${id}/cancel`),

  // DELETE /bookings/:id
  deleteBooking: (id) => api.delete(`${BASE}/${id}`),

  // GET /bookings/resource-schedule?resourceId=...&date=...
  getResourceSchedule: (resourceId, date) =>
    api.get(`${BASE}/resource-schedule`, { params: { resourceId, date } }),
};

export default bookingService;
