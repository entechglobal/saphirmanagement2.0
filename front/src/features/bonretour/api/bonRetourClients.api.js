import apiClient from "../../../shared/api/axios";

const api = apiClient;

export const bonRetourClientsApi = {
  getAll: async ({ page, limit, startDate, endDate, clientId, depotId, status, keyword } = {}) => {
    const res = await api.get("/bon-retour-clients", {
      params: { page, limit, startDate, endDate, clientId, depotId, status, keyword },
    });
    return res.data;
  },

  getById: async (id) => {
    const res = await api.get(`/bon-retour-clients/${id}`);
    return res.data;
  },

  getNextNumber: async (societeId) => {
    const res = await api.get("/bon-retour-clients/next-number", {
      params: { societeId },
    });
    return res.data;
  },

  // Get bon livraisons for a specific client (to link return to original delivery)
  getBonLivraisonsByClient: async (clientId) => {
    const res = await api.get("/bon-livraisons", {
      params: { clientId, limit: 1000, status: "COMPLETED" },
    });
    return res.data;
  },

  create: async (payload) => {
    const res = await api.post("/bon-retour-clients", payload);
    return res.data;
  },

  update: async (id, payload) => {
    const res = await api.put(`/bon-retour-clients/${id}`, payload);
    return res.data;
  },

  remove: async (id) => {
    const res = await api.delete(`/bon-retour-clients/${id}`);
    return res.data;
  },

  validate: async (id, payload) => {
    const res = await api.put(`/bon-retour-clients/${id}/validate`, payload);
    return res.data;
  },

  printPDF: async (id, view = false) => {
    const viewParam = view ? "?view=inline" : "";
    const res = await api.get(`/bon-retour-clients/${id}/print${viewParam}`, {
      responseType: "blob",
    });
    return res.data;
  },
};

export const brProductsApi = {
  search: async ({ search, depotId, priceField, page = 1, limit = 50 } = {}) => {
    const params = { depotId, priceField, page, limit };
    if (search && search.trim()) params.search = search.trim();
    const res = await api.get("/bon-retour-clients/products", { params });
    return res.data;
  },
};

export const brClientsApi = {
  getAll: async ({ limit = 100, page = 1, keyword, societeId } = {}) => {
    const params = { limit, page };
    if (keyword && keyword.trim()) params.keyword = keyword.trim();
    if (societeId) params.societeId = societeId;
    const res = await api.get("/clients", { params });
    return res.data;
  },
};

export const PRICE_FIELD_OPTIONS = [
  { value: "prixVente1", label: "Prix Vente 1" },
  { value: "prixVente2", label: "Prix Vente 2" },
  { value: "prixVente3", label: "Prix Vente 3" },
];
