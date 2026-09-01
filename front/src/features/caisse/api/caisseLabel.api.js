import apiClient from "../../../shared/api/axios";

export const caisseLabelApi = {
  getAll: async (params = {}) => {
    const res = await apiClient.get("/caisse-labels", { params });
    return res.data;
  },

  getById: async (id) => {
    const res = await apiClient.get(`/caisse-labels/${id}`);
    return res.data;
  },

  create: async (payload) => {
    const res = await apiClient.post("/caisse-labels", payload);
    return res.data;
  },

  update: async (id, payload) => {
    const res = await apiClient.put(`/caisse-labels/${id}`, payload);
    return res.data;
  },

  remove: async (id) => {
    const res = await apiClient.delete(`/caisse-labels/${id}`);
    return res.data;
  },
};
