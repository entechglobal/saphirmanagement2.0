import apiClient from "../../../shared/api/axios";

const api = apiClient;

export const labelsApi = {
  searchProducts: async ({ page = 1, limit = 10, search, priceField = "prixVente1" } = {}) => {
    const res = await api.get("/labels/products", {
      params: { page, limit, search: search || undefined, priceField },
    });
    return res.data;
  },

  generate: async (payload) => {
    const res = await api.post("/labels/generate", payload);
    return res.data;
  },

  generatePacks: async (payload) => {
    const res = await api.post("/labels/generate/packs", payload);
    return res.data;
  },
};
