import api from './axios';

export const userService = {
  getAllUsers: async () => {
    const response = await api.get('/users');
    return response.data;
  },
  
  getUserById: async (id) => {
    const response = await api.get(`/users/${id}`);
    return response.data;
  },
  
  createUser: async (userData) => {
    const response = await api.post('/users', userData);
    return response.data;
  },
  
  updateUser: async (id, userData) => {
    const response = await api.put(`/users/${id}`, userData);
    return response.data;
  },
  
  deleteUser: async (id) => {
    const response = await api.delete(`/users/${id}`);
    return response.data;
  },
  
  updatePreferences: async (id, preferences) => {
    const response = await api.put(`/users/${id}/preferences`, preferences);
    return response.data;
  },

  updateNotificationPreferences: async (id, prefs) => {
    const response = await api.put(`/users/${id}/notification-preferences`, prefs);
    return response.data;
  },

  getUserActivity: async (id) => {
    const response = await api.get(`/users/${id}/activity`);
    return response.data;
  }
};
