import apiClient from "../../../shared/api/axios";

const BASE = "/attendance";

export const attendanceApi = {
  getAll: (params = {}) =>
    apiClient.get(BASE, { params }).then((r) => r.data),

  getUsers: () => apiClient.get(`${BASE}/users`).then((r) => r.data),

  getSettings: (societeId) =>
    apiClient
      .get(`${BASE}/settings`, {
        params: societeId ? { societeId } : undefined,
      })
      .then((r) => r.data),

  updateSettings: (payload = {}) =>
    apiClient.put(`${BASE}/settings`, payload).then((r) => r.data),

  getSummary: (params = {}) =>
    apiClient.get(`${BASE}/summary`, { params }).then((r) => r.data),
};
