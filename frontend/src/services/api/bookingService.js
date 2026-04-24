import api from './axios';
import publicApi from './publicAxios';

const BASE = '/bookings';

const bookingService = {
  // POST /bookings
  createBooking: (data) => api.post(BASE, data),

  // GET /bookings/my?status=...
  getMyBookings: (status, page = 0, size = 20) =>
    api.get(`${BASE}/my`, { params: { ...(status ? { status } : {}), page, size } }),

  // GET /bookings/my/recent?limit=...
  getRecentBookings: (limit = 5) =>
    api.get(`${BASE}/my/recent`, { params: { limit } }),

  // GET /bookings/my/most-booked?limit=...
  getMostBooked: (limit = 5) =>
    api.get(`${BASE}/my/most-booked`, { params: { limit } }),

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

  // GET /bookings/analytics  (admin only)
  getBookingAnalytics: () => api.get(`${BASE}/analytics`),

  // GET /bookings/:id/verify  (QR code check-in verification)
  verifyBooking: (id) => api.get(`${BASE}/${id}/verify`),

  // GET /bookings/:id/verify-token
  getVerifyToken: (id) => api.get(`${BASE}/${id}/verify-token`),

  // Public GET /public/bookings/verify?token=...
  verifyBookingPublic: (token) => publicApi.get('/public/bookings/verify', { params: { token } }),
};

export default bookingService;
