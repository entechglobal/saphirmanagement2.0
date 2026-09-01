// src/features/agences/api/agences.api.js
import apiClient from "../../../../shared/api/axios";

const api = apiClient;

const BASE = "/agences";

export const agencesApi = {
  getAll: (params) => api.get(BASE, { params }).then((r) => r.data),

  getById: (id) => api.get(`${BASE}/${id}`).then((r) => r.data),

  create: (payload, societeId) =>
    api
      .post(societeId ? `${BASE}?societeId=${societeId}` : BASE, payload)
      .then((r) => r.data),

  update: (id, payload) =>
    api.put(`${BASE}/${id}`, payload).then((r) => r.data),

  toggleActive: (id, active) =>
    api.put(`${BASE}/${id}`, { active }).then((r) => r.data),

  delete: (id) => api.delete(`${BASE}/${id}`).then((r) => r.data),
};