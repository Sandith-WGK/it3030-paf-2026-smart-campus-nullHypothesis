import api from './axios';

const BASE = '/api/v1/resources';

const resourceService = {
  // GET /api/v1/resources — list all resources (with optional filters)
  getResources: (filters = {}) => api.get(BASE, { params: filters }),

  // GET /api/v1/resources/:id — single resource
  getResourceById: (id) => api.get(`${BASE}/${id}`),
};

export default resourceService;
