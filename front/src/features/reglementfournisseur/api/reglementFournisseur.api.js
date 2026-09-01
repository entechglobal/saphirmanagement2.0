import apiClient from "../../../shared/api/axios";

const api = apiClient;

export const reglementFournisseurApi = {
  getAll: async ({ page, limit, fournisseurId, modeReglement, startDate, endDate } = {}) => {
    const res = await api.get("/reglements-fournisseur", {
      params: { page, limit, fournisseurId, modeReglement, startDate, endDate },
    });
    return res.data;
  },

  create: async ({ societeId, payload }) => {
    const url = societeId ? `/reglements-fournisseur?societeId=${societeId}` : "/reglements-fournisseur";
    const res = await api.post(url, payload);
    return res.data;
  },

  remove: async ({ id }) => {
    const res = await api.delete(`/reglements-fournisseur/${id}`);
    return res.data;
  },

  getUnpaidBRs: async ({ fournisseurId, societeId }) => {
    const res = await api.get(`/reglements-fournisseur/unpaid/${fournisseurId}`, {
      params: { societeId },
    });
    return res.data;
  },

  printPDF: async (id) => {
    const res = await api.get(`/reglements-fournisseur/${id}/pdf`, { responseType: "blob" });
    return res.data;
  },
};

export const rfFournisseursApi = {
  getAll: async ({ limit = 100, page = 1, keyword, societeId } = {}) => {
    const params = { limit, page };
    if (keyword && keyword.trim()) params.keyword = keyword.trim();
    if (societeId) params.societeId = societeId;
    const res = await api.get("/fournisseurs", { params });
    return res.data;
  },
};

export const rfBanquesApi = {
  getAll: async ({ page = 1, limit = 100 } = {}) => {
    const res = await api.get("/banques", { params: { page, limit } });
    return res.data;
  },
};

export const MODE_REGLEMENT_OPTIONS = [
  { value: "ESPECE", label: "Espèces" },
  { value: "CHEQUE", label: "Chèque" },
  { value: "EFFET", label: "Effet" },
  { value: "CARTE_BANCAIRE", label: "Carte Bancaire" },
  { value: "VIREMENT", label: "Virement" },
];

export const MODES_WITH_REF = ["CHEQUE", "EFFET"];
export const MODES_WITH_BANQUE = ["CARTE_BANCAIRE", "VIREMENT"];
