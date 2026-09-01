import apiClient from "../../../shared/api/axios";

const api = apiClient;

export const inventoriesApi = {
  // Inventory CRUD operations
  getAll: async ({ page, limit, keyword, societeId, depotId } = {}) => {
    const res = await api.get("/inventories", {
      params: { page, limit, keyword, societeId, depotId },
    });
    return res.data;
  },

  getById: async (id) => {
    const res = await api.get(`/inventories/${id}`);
    return res.data;
  },

  create: async (payload) => {
    const res = await api.post("/inventories", payload);
    return res.data;
  },

  appendLines: async (id, payload) => {
    const res = await api.post(`/inventories/${id}/append-lines`, payload);
    return res.data;
  },

  remove: async (id) => {
    const res = await api.delete(`/inventories/${id}`);
    return res.data;
  },
};

// Articles & Variants endpoint
export const articlesApi = {
  getUnified: async ({ depotId, familyId, limit, page, search } = {}) => {
    const params = { limit, page, search };
    if (depotId) params.depotId = depotId;
    if (familyId) params.familyId = familyId;

    const res = await api.get("/articles/unified", { params });
    return res.data;
  },
};

// Depots endpoint
export const depotsApi = {
  getAll: async ({ limit = 10, page = 1 } = {}) => {
    const res = await api.get("/depots", {
      params: { limit, page },
    });
    return res.data;
  },
};

// Families endpoint
export const familiesApi = {
  getAll: async ({ limit = 100, page = 1 } = {}) => {
    const res = await api.get("/families", {
      params: { fields: "id,name", limit, page }, // Include id field
    });
    return res.data;
  },
};
