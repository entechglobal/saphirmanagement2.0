// src/features/packs/api/packs.api.js
import apiClient from "../../../../shared/api/axios";

const api = apiClient;
const BASE = "/packs";

export const packsApi = {
  getAll: (params) => api.get(BASE, { params }).then((r) => r.data),

  getById: (id) => api.get(`${BASE}/${id}`).then((r) => r.data),

  create: (payload, societeId) =>
    api
      .post(societeId ? `${BASE}?societeId=${societeId}` : BASE, payload)
      .then((r) => r.data),

  update: (id, payload) =>
    api.put(`${BASE}/${id}`, payload).then((r) => r.data),

  delete: (id) => api.delete(`${BASE}/${id}`).then((r) => r.data),

  /**
   * Product picker for pack components
   * GET /packs/products/picker?priceField=prixVente1&search=...&page=1&limit=50
   */
  getProductsPicker: (params) =>
    api.get(`${BASE}/products/picker`, { params }).then((r) => r.data),
};