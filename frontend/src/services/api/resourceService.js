import api from './axios';

const BASE = '/resources';

const resourceService = {
  // GET /resources — list all resources (with optional filters)
  getResources: (filters = {}) => api.get(BASE, { params: filters }),

  // GET /resources/:id — single resource
  getResourceById: (id) => api.get(`${BASE}/${id}`),
};

export default resourceService;
