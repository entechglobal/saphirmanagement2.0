import apiClient from "../../../shared/api/axios";

const api = apiClient;

export const situationApi = {
  getClientSituation: async ({
    page,
    limit,
    keyword,
    clientId,
    startDate,
    endDate,
  } = {}) => {
    const res = await api.get("/situation/client", {
      params: { page, limit, keyword, clientId, startDate, endDate },
    });
    return res.data;
  },

  getFournisseurSituation: async ({
    page,
    limit,
    keyword,
    fournisseurId,
    startDate,
    endDate,
  } = {}) => {
    const res = await api.get("/situation/fournisseur", {
      params: { page, limit, keyword, fournisseurId, startDate, endDate },
    });
    return res.data;
  },
};
