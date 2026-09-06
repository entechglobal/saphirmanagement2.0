import apiClient from "../../../shared/api/axios";

const BASE = "/attendance";

export const attendanceApi = {
  getAll: (params = {}) =>
    apiClient.get(BASE, { params }).then((r) => r.data),

  getStats: (params = {}) =>
    apiClient.get(`${BASE}/stats`, { params }).then((r) => r.data),

  getUsers: () => apiClient.get(`${BASE}/users`).then((r) => r.data),
};
