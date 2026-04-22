import api from './axios';

export const ticketService = {
  // Create a new ticket
  createTicket: async (ticketData) => {
    const response = await api.post('/tickets', ticketData);
    return response.data;
  },

  // Upload attachments to an existing ticket
  uploadAttachments: async (ticketId, files) => {
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));
    
    const response = await api.post(`/tickets/${ticketId}/attachments`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  // Get a specific ticket by ID
  getTicketById: async (id) => {
    const response = await api.get(`/tickets/${id}`);
    return response.data;
  },

  // Get all tickets (ADMIN ONLY) - supports optional status and priority query params
  getAllTickets: async ({ status, priority } = {}) => {
    const params = {};
    if (status) params.status = status;
    if (priority) params.priority = priority;
    
    const response = await api.get('/tickets', { params });
    return response.data;
  },

  // Get current user's tickets
  getMyTickets: async () => {
    const response = await api.get('/tickets/my');
    return response.data;
  },

  // Get current technician's assigned tasks
  getMyTasks: async () => {
    const response = await api.get('/tickets/mytasks');
    return response.data;
  },

  getAllUsers: async () => {
    // We use the base axios instance 'api' which is already imported in this file
    const response = await api.get('/users');
    return response.data;
  },


  // Update a ticket's status (ADMIN/TECHNICIAN)
  updateTicketStatus: async (id, statusData) => {
    // statusData format: { status: 'IN_PROGRESS', resolutionNote: '...', rejectionReason: '...' }
    const response = await api.put(`/tickets/${id}/status`, statusData);
    return response.data;
  },

  // Assign a technician to a ticket (ADMIN ONLY)
  assignTechnician: async (id, technicianId) => {
    const response = await api.put(`/tickets/${id}/assign`, { assigneeId: technicianId });
    return response.data;
  },

  // Delete a ticket (ADMIN ONLY)
  deleteTicket: async (id) => {
    const response = await api.delete(`/tickets/${id}`);
    return response.data;
  }
};
