import axios from './axios';

const API_URL = '/notifications';

export const notificationService = {
  /**
   * Fetch all notifications for the current user.
   */
  getUserNotifications: async (userId) => {
    const response = await axios.get(`${API_URL}/user/${userId}`);
    return response.data;
  },

  /**
   * Get the count of unread notifications.
   */
  getUnreadCount: async (userId) => {
    const response = await axios.get(`${API_URL}/user/${userId}/unread-count`);
    return response.data;
  },

  /**
   * Mark a notification as read.
   */
  markAsRead: async (id) => {
    const response = await axios.put(`${API_URL}/${id}/read`);
    return response.data;
  },

  /**
   * Delete a notification.
   */
  deleteNotification: async (id) => {
    await axios.delete(`${API_URL}/${id}`);
  }
};
