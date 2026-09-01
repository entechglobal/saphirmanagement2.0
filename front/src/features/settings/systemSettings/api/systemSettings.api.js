import apiClient from "../../../../shared/api/axios";

export const systemSettingsAPI = {
  getSettings: () => apiClient.get("/settings"),

  getHistory: (params = {}) =>
    apiClient.get("/settings/history", { params }),

  updateAllowNegativeStock: (payload) =>
    apiClient.put("/settings/allow-negative-stock", payload),

  updateHourRange: (payload) =>
    apiClient.put("/settings/hour-range", payload),

  bulkUpdate: (payload) =>
    apiClient.put("/settings/bulk", payload),
};
