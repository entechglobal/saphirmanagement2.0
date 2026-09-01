import apiClient from "../../../shared/api/axios";

const api = apiClient;

export const bonRetourFournisseursApi = {
  getAll: async ({
    page,
    limit,
    startDate,
    endDate,
    frsId,
    depotId,
    status,
    keyword,
  } = {}) => {
    const res = await api.get("/bon-retour-fournisseurs", {
      params: { page, limit, startDate, endDate, frsId, depotId, status, keyword },
    });
    return res.data;
  },

  getById: async (id) => {
    const res = await api.get(`/bon-retour-fournisseurs/${id}`);
    return res.data;
  },

  getNextNumber: async (societeId) => {
    const res = await api.get("/bon-retour-fournisseurs/next-number", {
      params: { societeId },
    });
    return res.data;
  },

  getBonReceptionsByFrs: async (frsId) => {
    const res = await api.get("/bon-receptions", {
      params: { frsId, limit: 1000, status: "COMPLETED" },
    });
    return res.data;
  },

  create: async (payload) => {
    const res = await api.post("/bon-retour-fournisseurs", payload);
    return res.data;
  },

  update: async (id, payload) => {
    const res = await api.put(`/bon-retour-fournisseurs/${id}`, payload);
    return res.data;
  },

  remove: async (id) => {
    const res = await api.delete(`/bon-retour-fournisseurs/${id}`);
    return res.data;
  },

  validate: async (id, payload) => {
    const res = await api.put(`/bon-retour-fournisseurs/${id}/validate`, payload);
    return res.data;
  },

  printPDF: async (id, view = false) => {
    const viewParam = view ? "?view=inline" : "";
    const res = await api.get(`/bon-retour-fournisseurs/${id}/print${viewParam}`, {
      responseType: "blob",
    });
    return res.data;
  },
};

export const brfProductsApi = {
  search: async ({ search, depotId, priceField = "prixAchat", page = 1, limit = 50 } = {}) => {
    const params = { depotId, priceField, page, limit };
    if (search?.trim()) params.search = search.trim();
    const res = await api.get("/bon-retour-fournisseurs/products", { params });
    return res.data;
  },
};
