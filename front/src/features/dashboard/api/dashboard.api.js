import apiClient from "../../../shared/api/axios"; 

// ─── Stock ───────────────────────────────────────────────────────────────────
export const stockAPI = {
  getStats: () => apiClient.get("/stock/stats"),
  getDepotStats: (depotId) => apiClient.get(`/depots/${depotId}/statistics`),
}

// ─── Depots ───────────────────────────────────────────────────────────────────
export const depotsAPI = {
  getAll: (params = { limit: 100 }) => apiClient.get("/depots", { params }),
}

// ─── Societes ─────────────────────────────────────────────────────────────────
export const societesAPI = {
  getAll: () => apiClient.get("/societes"),
  getStats: (societeId) => apiClient.get(`/societes/${societeId}/statistics`),
}

// ─── Clients ──────────────────────────────────────────────────────────────────
export const clientsAPI = {
  getSummary: () => apiClient.get("/clients/stats/summary"),
}

// ─── Fournisseurs ─────────────────────────────────────────────────────────────
export const fournisseursAPI = {
  getSummary: () => apiClient.get("/fournisseurs/stats/summary"),
}

// ─── Articles ─────────────────────────────────────────────────────────────────
export const articlesAPI = {
  getAll: (params = { limit: 10 }) => apiClient.get("/articles", { params }),
}

// ─── Categories ───────────────────────────────────────────────────────────────
export const categoriesAPI = {
  getAll: () => apiClient.get("/categories"),
}

// ─── Families ─────────────────────────────────────────────────────────────────
export const familiesAPI = {
  getAll: () => apiClient.get("/families"),
}