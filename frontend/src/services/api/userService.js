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
    console.log(`[DEBUG] userService.updatePreferences SENT -> ID: ${id}, Body:`, preferences);
    const response = await api.put(`/users/${id}/preferences`, preferences);
    console.log(`[DEBUG] userService.updatePreferences RECEIVED [Status: ${response.status}] <- Payload:`, response.data);
    return response.data;
  },

  getUserActivity: async (id) => {
    const response = await api.get(`/users/${id}/activity`);
    return response.data;
  }
};
