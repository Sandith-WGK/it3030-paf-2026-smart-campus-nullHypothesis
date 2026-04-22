import api from './axios';

export const commentService = {
  // Add a comment to a ticket
  addComment: async (ticketId, content) => {
    const response = await api.post(`/tickets/${ticketId}/comments`, { content });
    return response.data;
  },

  // Get all comments for a ticket
  getCommentsByTicket: async (ticketId) => {
    const response = await api.get(`/tickets/${ticketId}/comments`);
    return response.data;
  },

  // Edit a comment (Owner only)
  editComment: async (ticketId, commentId, newContent) => {
    const response = await api.put(`/tickets/${ticketId}/comments/${commentId}`, { content: newContent });
    return response.data;
  },

  // Delete a comment (Owner or Admin)
  deleteComment: async (ticketId, commentId) => {
    const response = await api.delete(`/tickets/${ticketId}/comments/${commentId}`);
    return response.data;
  }
};
