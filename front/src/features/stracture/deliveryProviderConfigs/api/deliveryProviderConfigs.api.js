import apiClient from "../../../../shared/api/axios";

const api = apiClient;

export const deliveryProviderConfigsApi = {
  getAll: async ({ page, limit, provider, societeId } = {}) => {
    const params = {};
    if (page) params.page = page;
    if (limit) params.limit = limit;
    if (provider) params.provider = provider;
    if (societeId) params.societeId = societeId;
    const res = await api.get("/delivery-provider-configs", { params });
    return res.data;
  },

  getById: async (id) => {
    const res = await api.get(`/delivery-provider-configs/${id}`);
    return res.data;
  },

  create: async (payload) => {
    const res = await api.post("/delivery-provider-configs", payload);
    return res.data;
  },

  update: async (id, payload) => {
    const res = await api.put(`/delivery-provider-configs/${id}`, payload);
    return res.data;
  },

  remove: async (id) => {
    const res = await api.delete(`/delivery-provider-configs/${id}`);
    return res.data;
  },
};
