import apiClient from "../../../shared/api/axios";

const api = apiClient;

export const bonLivraisonsApi = {
  getAll: async ({ page, limit, startDate, endDate, clientId, depotId, status, keyword } = {}) => {
    const res = await api.get("/bon-livraisons", {
      params: { page, limit, startDate, endDate, clientId, depotId, status, keyword },
    });
    return res.data;
  },

  getById: async (id) => {
    const res = await api.get(`/bon-livraisons/${id}`);
    return res.data;
  },

  getNextNumber: async (societeId) => {
    const res = await api.get("/bon-livraisons/next-number", {
      params: { societeId },
    });
    return res.data;
  },

  create: async (payload) => {
    const res = await api.post("/bon-livraisons", payload);
    return res.data;
  },

  update: async (id, payload) => {
    const res = await api.put(`/bon-livraisons/${id}`, payload);
    return res.data;
  },

  remove: async (id) => {
    const res = await api.delete(`/bon-livraisons/${id}`);
    return res.data;
  },

  validate: async (id, payload) => {
    const res = await api.put(`/bon-livraisons/${id}/validate`, payload);
    return res.data;
  },

  printPDF: async (id, view = false) => {
    const viewParam = view ? "?view=inline" : "";
    const res = await api.get(`/bon-livraisons/${id}/print${viewParam}`, {
      responseType: "blob",
    });
    return res.data;
  },

  // ✅ NEW: fetch advances (avances) for a given client + societe
  getClientAdvances: async (clientId, societeId) => {
    const res = await api.get(`/reglements-client/advances/${clientId}`, {
      params: { societeId },
    });
    return res.data;
  },
};

/* Products for BL article selection */
export const blProductsApi = {
  search: async ({ search, depotId, priceField, page = 1, limit = 50 } = {}) => {
    const params = { depotId, priceField, page, limit };
    if (search && search.trim()) params.search = search.trim();
    const res = await api.get("/bon-livraisons/products", { params });
    return res.data;
  },
};

/* Clients — supports filtering by societeId so only clients of the depot's societe appear */
export const clientsApi = {
  getAll: async ({ limit = 100, page = 1, keyword, societeId } = {}) => {
    const params = { limit, page };
    if (keyword && keyword.trim()) params.keyword = keyword.trim();
    if (societeId) params.societeId = societeId;
    const res = await api.get("/clients", { params });
    return res.data;
  },
};

export const deliveriesApi = {
  listKey: ({ limit, page, societeId } = {}) => ["deliveries", limit, page, societeId],

  getAll: async ({ limit = 100, page = 1, societeId } = {}) => {
    const params = { limit, page };
    if (societeId) params.societeId = societeId;
    const res = await api.get("/deliveries", { params });
    return res.data;
  },
};

export const PRICE_FIELD_OPTIONS = [
  { value: "prixVente1", label: "Prix Vente 1" },
  { value: "prixVente2", label: "Prix Vente 2" },
  { value: "prixVente3", label: "Prix Vente 3" },
];