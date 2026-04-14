import api from './axios';

const BASE = '/api/resources';
// const BASE = '/api/v1/resources';  

/**
 * Resource API service for- Facilities & Assets Catalogue
 * Only CRUD operations – no import/export
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
};

export default resourceApi;