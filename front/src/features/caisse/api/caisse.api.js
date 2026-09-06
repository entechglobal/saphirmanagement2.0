import apiClient from "../../../shared/api/axios";

export const caisseApi = {
  getAll: async (params = {}) => {
    const res = await apiClient.get("/caisse", { params });
    return res.data;
  },

  getMyCaisse: async () => {
    const res = await apiClient.get("/caisse/me");
    return res.data;
  },

  createMyCaisse: async (payload) => {
    const res = await apiClient.post("/caisse/me", payload);
    return res.data;
  },

  getById: async (id) => {
    const res = await apiClient.get(`/caisse/${id}`);
    return res.data;
  },

  create: async (payload) => {
    const res = await apiClient.post("/caisse", payload);
    return res.data;
  },

  update: async (id, payload) => {
    const res = await apiClient.put(`/caisse/${id}`, payload);
    return res.data;
  },

  remove: async (id) => {
    const res = await apiClient.delete(`/caisse/${id}`);
    return res.data;
  },

  createCharge: async (payload) => {
    const res = await apiClient.post("/caisse/charge", payload);
    return res.data;
  },

  getTransferable: async (params = {}) => {
    const res = await apiClient.get("/caisse/transferable", { params });
    return res.data;
  },

  createRetrait: async (payload) => {
    const res = await apiClient.post("/caisse/retrait", payload);
    return res.data;
  },

  createDepot: async (payload) => {
    const res = await apiClient.post("/caisse/depot", payload);
    return res.data;
  },

  createTransfer: async (payload) => {
    const res = await apiClient.post("/caisse/transfer", payload);
    return res.data;
  },

  acceptTransferRequest: async (id) => {
    const res = await apiClient.post(`/caisse/transfer-requests/${id}/accept`);
    return res.data;
  },

  declineTransferRequest: async (id) => {
    const res = await apiClient.post(`/caisse/transfer-requests/${id}/decline`);
    return res.data;
  },

  createBankWallet: async (payload) => {
    const res = await apiClient.post("/caisse/bank", payload);
    return res.data;
  },

  createCoffreWallet: async (payload) => {
    const res = await apiClient.post("/caisse/coffre", payload);
    return res.data;
  },

  getTransactions: async (caisseId, params = {}) => {
    const res = await apiClient.get(`/caisse/${caisseId}/transactions`, { params });
    return res.data;
  },

  getAllTransactions: async (params = {}) => {
    const res = await apiClient.get("/caisse/transactions", { params });
    return res.data;
  },

  getDashboard: async (caisseId, params = {}) => {
    const res = await apiClient.get(`/caisse/${caisseId}/dashboard`, { params });
    return res.data;
  },
};
