import apiClient from "../../../shared/api/axios";

const api = apiClient;

export const bonReceptionsApi = {
  getAll: async ({ page, limit, frsId, depotId, status, startDate, endDate, search } = {}) => {
    const res = await api.get("/bon-receptions", {
      params: { page, limit, frsId, depotId, status, startDate, endDate, search },
    });
    return res.data;
  },

  getById: async (id) => {
    const res = await api.get(`/bon-receptions/${id}`);
    return res.data;
  },

  getNextNumber: async (societeId) => {
    const res = await api.get("/bon-receptions/next-number", {
      params: { societeId },
    });
    return res.data;
  },

  create: async (payload) => {
    const res = await api.post("/bon-receptions", payload);
    return res.data;
  },

  update: async (id, payload) => {
    const res = await api.put(`/bon-receptions/${id}`, payload);
    return res.data;
  },

  remove: async (id) => {
    const res = await api.delete(`/bon-receptions/${id}`);
    return res.data;
  },

  validate: async (id, payload) => {
    const res = await api.put(`/bon-receptions/${id}/validate`, payload);
    return res.data;
  },

  printPDF: async (id, view = false) => {
    const viewParam = view ? "?view=inline" : "";
    const res = await api.get(`/bon-receptions/${id}/print${viewParam}`, {
      responseType: "blob",
    });
    return res.data;
  },
};

export const brProductsApi = {
  search: async ({ depotId, search, page = 1, limit = 50 } = {}) => {
    const params = { page, limit };
    if (depotId) params.depotId = depotId;
    if (search && search.trim()) params.search = search.trim();
    const res = await api.get("/bon-receptions/products", { params });
    return res.data;
  },
};

export const brFournisseursApi = {
  getAll: async ({ limit = 100, page = 1, keyword, societeId } = {}) => {
    const params = { limit, page };
    if (keyword && keyword.trim()) params.keyword = keyword.trim();
    if (societeId) params.societeId = societeId;
    const res = await api.get("/fournisseurs", { params });
    return res.data;
  },
};

export const brFrsAdvancesApi = {
  getByFournisseur: async ({ fournisseurId, societeId }) => {
    const res = await api.get(`/reglements-fournisseur/unpaid/${fournisseurId}`, {
      params: { societeId },
    });
    return res.data;
  },
};
