import apiClient from "../../../shared/api/axios";

const api = apiClient;

/**
 * Societes API
 * ONLY HTTP calls – no cache, no logic
 */
export const societesApi = {
  getAll: async ({ page, limit, keyword } = {}) => {
    const res = await api.get("/societes", {
      params: {
        page,
        limit,
        keyword,
      },
    });
    return res.data;
  },

  getById: async (id) => {
    const res = await api.get(`/societes/${id}`);
    return res.data;
  },

  create: async (payload) => {
    const res = await api.post("/societes", payload);
    return res.data;
  },

  update: async (id, payload) => {
  

    const res = await api.put(`/societes/${id}`, payload);

    return res.data;
  },

  remove: async (id) => {
    const res = await api.delete(`/societes/${id}`);
    return res.data;
  },
};
