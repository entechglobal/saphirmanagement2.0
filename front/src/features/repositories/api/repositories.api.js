import apiClient from "../../../shared/api/axios";

const api = apiClient;

/**
 * Depots API
 * ONLY HTTP calls – no cache, no logic
 */
export const depotsApi = {
  getAll: async ({ page, limit, keyword, societeId } = {}) => {
    const res = await api.get("/depots", {
      params: { page, limit, keyword, societeId },
    });
    return res.data;
  },

  getById: async (id) => {
    const res = await api.get(`/depots/${id}`);
    return res.data;
  },

  create: async (payload) => {
    const res = await api.post("/depots", payload);
    return res.data;
  },

  update: async (id, payload) => {
    const res = await api.put(`/depots/${id}`, payload);
    return res.data;
  },

  remove: async (id) => {
    const res = await api.delete(`/depots/${id}`);
    return res.data;
  },
};
