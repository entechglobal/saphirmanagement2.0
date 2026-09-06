import apiClient from "../../../../shared/api/axios";

const api = apiClient;
const BASE = "/delivery-shifts";

export const deliveryShiftsApi = {
  getMyActive: () => api.get(`${BASE}/me/active`).then((r) => r.data),

  start: () => api.post(`${BASE}/start`).then((r) => r.data),

  getAll: (params = {}) =>
    api.get(BASE, { params }).then((r) => r.data),

  getById: (id) => api.get(`${BASE}/${id}`).then((r) => r.data),

  close: (id) => api.post(`${BASE}/${id}/close`).then((r) => r.data),

  remit: (id, payload) =>
    api.post(`${BASE}/${id}/remit`, payload).then((r) => r.data),
};
