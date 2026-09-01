import apiClient from "../../../../shared/api/axios";

const api = apiClient;

export const planningLivraisonApi = {
  getPlanning: async ({ startDate, endDate, livreurId } = {}) => {
    const params = { startDate, endDate };
    if (livreurId) params.livreurId = livreurId;

    const res = await api.get("/advanced-bon-livraisons/planning", { params });
    return res.data;
  },
};
