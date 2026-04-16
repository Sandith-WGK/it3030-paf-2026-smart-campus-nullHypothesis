import api from './axios';

const BASE = '/resources';
const ADMIN_BASE = '/admin';

/**
 * Resource API service for Module A - Facilities & Assets Catalogue
 */
const resourceApi = {
  /**
   * Get all resources with optional filters
   * @param {Object} filters - { type, minCapacity, location, status }
   */
  getAll: (filters = {}) => api.get(BASE, { params: filters }),

  /**
   * Get a single resource by ID
   * @param {String} id - Resource ID
   */
  getById: (id) => api.get(`${BASE}/${id}`),

  /**
   * Create a new resource (Admin only)
   * @param {Object} resource - Resource data
   */
  create: (resource) => api.post(BASE, resource),

  /**
   * Update an existing resource (Admin only)
   * @param {String} id - Resource ID
   * @param {Object} resource - Updated resource data
   */
  update: (id, resource) => api.put(`${BASE}/${id}`, resource),

  /**
   * Update resource status (Admin only)
   * @param {String} id - Resource ID
   * @param {String} status - New status (ACTIVE or OUT_OF_SERVICE)
   */
  updateStatus: (id, status) => 
    api.patch(`${BASE}/${id}/status`, null, { params: { status } }),

  /**
   * Delete a resource (Admin only)
   * @param {String} id - Resource ID
   */
  delete: (id) => api.delete(`${BASE}/${id}`),

  /**
   * Export all resources to CSV file (Admin only)
   * Downloads the CSV file automatically
   */
  exportResources: async () => {
    try {
      const response = await api.get(`${ADMIN_BASE}/export/resources`, {
        responseType: 'blob',
      });
      
      // Create a blob from the response
      const blob = new Blob([response.data], { type: 'text/csv' });
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'resources.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      return { success: true };
    } catch (error) {
      console.error('Export error:', error);
      throw error;
    }
  },

  /**
   * Import resources from CSV file (Admin only)
   * @param {File} file - CSV file to upload
   */
  importResources: async (file) => {
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await api.post(`${ADMIN_BASE}/import/resources`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      return response.data;
    } catch (error) {
      console.error('Import error:', error);
      throw error;
    }
  },
};

export default resourceApi;
