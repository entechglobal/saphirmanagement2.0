import apiClient from "../../../../shared/api/axios";

const api = apiClient;


export const banquesApi = {
  getAll: async ({ page, limit, keyword } = {}) => {
    const res = await api.get("/banques", {
      params: { page, limit, keyword },
    });
    return res.data;
  },

  getById: async (id) => {
    const res = await api.get(`/banques/${id}`);
    return res.data;
  },

  create: async (payload) => {
    const res = await api.post("/banques", payload);
    return res.data;
  },

  update: async (id, payload) => {
    const res = await api.put(`/banques/${id}`, payload);
    return res.data;
  },

  remove: async (id) => {
    const res = await api.delete(`/banques/${id}`);
    return res.data;
  },
};
