import apiClient from "../../../shared/api/axios";

export const dashboardAPI = {
  getOverview: (params = {}) => apiClient.get("/dashboard/overview", { params }),
  getWallets: () => apiClient.get("/dashboard/wallets"),
};
