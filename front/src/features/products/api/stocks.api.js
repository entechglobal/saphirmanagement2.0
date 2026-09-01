import apiClient from "../../../shared/api/axios";

const api = apiClient;

/**
 * Stocks API
 * ONLY HTTP calls – no cache, no logic
 */
export const stocksApi = {
  getAll: async ({
    page,
    limit,
    keyword,
    articleId,
    familyId,
    depotId,
    societeId,
  } = {}) => {
    const res = await api.get("/stock", {
      params: { page, limit, keyword, articleId, familyId, depotId, societeId },
    });
    return res.data;
  },

  getById: async (id) => {
    const res = await api.get(`/stock/${id}`);
    return res.data;
  },

  getByArticleId: async (id) => {
    const res = await api.get(`/stock/by-article/${id}`);
    return res.data;
  },

  getByVariantId: async (id) => {
    const res = await api.get(`/stock/by-variant/${id}`);
    return res.data;
  },

  create: async (payload) => {
    const res = await api.post("/stock/bulk", payload);
    return res.data;
  },

  update: async (id, payload) => {
    const isFormData = payload instanceof FormData;
    const res = await api.put(`/stock/${id}`, payload, {
      headers: isFormData ? undefined : { "Content-Type": "application/json" },
    });
    return res.data;
  },

  remove: async (id) => {
    const res = await api.delete(`/stock/${id}`);
    return res.data;
  },
};
