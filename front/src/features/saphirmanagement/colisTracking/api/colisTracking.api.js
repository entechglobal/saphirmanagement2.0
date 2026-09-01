import apiClient from "../../../../shared/api/axios";

export const colisTrackingApi = {
  getAll: async ({ page = 1, limit = 20, search = "" } = {}) => {
    const params = { page, limit };
    if (search && search.trim()) {
      params.search = search.trim();
    }

    const res = await apiClient.get("/colis-tracking", { params });
    return res.data;
  },

  receive: async ({ colisTrackingNumber }) => {
    const res = await apiClient.post("/colis-tracking/receive", {
      colisTrackingNumber,
    });
    return res.data;
  },
};
