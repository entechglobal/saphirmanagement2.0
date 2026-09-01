import apiClient from "../../../shared/api/axios";

const api = apiClient;

export const createPurchaseDocumentsApi = (apiBase) => ({
  getAll: async ({
    page,
    limit,
    startDate,
    endDate,
    frsId,
    status,
    keyword,
  } = {}) => {
    const res = await api.get(apiBase, {
      params: { page, limit, startDate, endDate, frsId, status, keyword },
    });
    return res.data;
  },

  getById: async (id) => {
    const res = await api.get(`${apiBase}/${id}`);
    return res.data;
  },

  getNextNumber: async (societeId) => {
    const res = await api.get(`${apiBase}/next-number`, {
      params: { societeId },
    });
    return res.data;
  },

  create: async (payload) => {
    const res = await api.post(apiBase, payload);
    return res.data;
  },

  update: async (id, payload) => {
    const res = await api.put(`${apiBase}/${id}`, payload);
    return res.data;
  },

  remove: async (id) => {
    const res = await api.delete(`${apiBase}/${id}`);
    return res.data;
  },

  printPDF: async (id, view = false) => {
    const viewParam = view ? "?view=inline" : "";
    const res = await api.get(`${apiBase}/${id}/print${viewParam}`, {
      responseType: "blob",
    });
    return res.data;
  },

  products: {
    search: async ({ search, page = 1, limit = 50 } = {}) => {
      const params = { page, limit };
      if (search?.trim()) params.search = search.trim();
      const res = await api.get(`${apiBase}/products`, { params });
      return res.data;
    },
  },
});

export const fournisseursApi = {
  getAll: async ({ limit = 100, page = 1, keyword, societeId } = {}) => {
    const params = { limit, page };
    if (keyword?.trim()) params.keyword = keyword.trim();
    if (societeId) params.societeId = societeId;
    const res = await api.get("/fournisseurs", { params });
    return res.data;
  },
};
