import apiClient from "../../../shared/api/axios";

const api = apiClient;

export const reglementClientApi = {
  getAll: async ({ page, limit, keyword, clientId, startDate, endDate } = {}) => {
    const res = await api.get("/reglements-client", {
      params: { page, limit, keyword, clientId, startDate, endDate },
    });
    return res.data;
  },

  create: async ({ societeId, payload }) => {
    const url = societeId ? `/reglements-client?societeId=${societeId}` : "/reglements-client";
    const res = await api.post(url, payload);
    return res.data;
  },

  remove: async ({ id}) => {
    const res = await api.delete(`/reglements-client/${id}`);
    return res.data;
  },

  getUnpaidByClient: async ({ clientId, societeId }) => {
    const res = await api.get(`/reglements-client/unpaid/${clientId}`, {
      params: societeId ? { societeId } : {},
    });
    return res.data;
  },

    printPDF: async (id) => {
    const res = await api.get(`/reglements-client/${id}/pdf`, { responseType: "blob" });
    return res.data;
  },
};

export const rcClientsApi = {
  getAll: async ({ limit = 100, page = 1, keyword } = {}) => {
    const params = { limit, page };
    if (keyword && keyword.trim()) params.keyword = keyword.trim();
    const res = await api.get("/clients", { params });
    return res.data;
  },
};

export const MODE_REGLEMENT_OPTIONS = [
  { value: "ESPECE", label: "Espèces" },
  { value: "CHEQUE", label: "Chèque" },
  { value: "EFFET", label: "Effet" },
  { value: "CARTE_BANCAIRE", label: "Carte Bancaire" },
  { value: "VIREMENT", label: "Virement" },
  { value: "CARTE_FIDELITE", label: "Carte Fidélité" },
  { value: "REMISE", label: "Remise" },
  { value: "BON_ACHAT", label: "Bon D'Achat" }
];

// Modes that require refDocument + dateEcheance
export const MODES_WITH_REF = ["CHEQUE", "EFFET"];

// Modes that require banque selection
export const MODES_WITH_BANQUE = ["CARTE_BANCAIRE", "VIREMENT"];

export const banquesApi = {
  getAll: async ({ page = 1, limit = 100 } = {}) => {
    const res = await api.get("/banques", { params: { page, limit } });
    return res.data;
  },
};

