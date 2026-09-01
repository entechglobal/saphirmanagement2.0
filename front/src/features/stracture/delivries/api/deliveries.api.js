import apiClient from "../../../../shared/api/axios";

const api = apiClient;

export const deliveriesApi = {
  getAll: async ({ page, limit, keyword, societeId } = {}) => {
    const params = { page, limit };
    if (keyword && keyword.trim()) params.keyword = keyword.trim();
    if (societeId) params.societeId = societeId;
    const res = await api.get("/deliveries", { params });
    return res.data;
  },

  getById: async (id) => {
    const res = await api.get(`/deliveries/${id}`);
    return res.data;
  },

  create: async ({ societeId, payload }) => {
    const res = await api.post(`/deliveries?societeId=${societeId}`, payload);
    return res.data;
  },

  update: async (id, payload) => {
    const res = await api.put(`/deliveries/${id}`, payload);
    return res.data;
  },

  remove: async (id) => {
    const res = await api.delete(`/deliveries/${id}`);
    return res.data;
  },

  toggleActive: async (id) => {
    const res = await api.patch(`/deliveries/${id}/toggle-active`);
    return res.data;
  },
};

export const societesApi = {
  getAll: async ({ limit = 100, page = 1 } = {}) => {
    const res = await api.get("/societes", { params: { limit, page } });
    return res.data;
  },
};
