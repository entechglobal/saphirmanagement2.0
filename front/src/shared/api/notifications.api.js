import apiClient from "./axios";

export const notificationsApi = {
  getAll: async (params = {}) => {
    const res = await apiClient.get("/notifications", { params });
    return res.data;
  },

  getUnreadCount: async () => {
    const res = await apiClient.get("/notifications/unread-count");
    return res.data;
  },

  markRead: async (id) => {
    const res = await apiClient.patch(`/notifications/${id}/read`);
    return res.data;
  },

  markAllRead: async () => {
    const res = await apiClient.patch("/notifications/read-all");
    return res.data;
  },
};
