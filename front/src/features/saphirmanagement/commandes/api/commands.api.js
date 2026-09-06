import apiClient from "../../../../shared/api/axios";

const api = apiClient;

/* =========================================================
   HELPERS
========================================================= */
const buildParams = (paramsObj) => {
  const params = {};
  Object.entries(paramsObj || {}).forEach(([key, value]) => {
    if (
      value !== undefined &&
      value !== null &&
      value !== "" &&
      !(typeof value === "string" && !value.trim())
    ) {
      params[key] = typeof value === "string" ? value.trim() : value;
    }
  });
  return params;
};

/* =========================================================
   COMMANDS (Bon Livraisons)
========================================================= */
export const commandsApi = {
  getAll: async (filters = {}) => {
    const params = buildParams(filters);
    const res = await api.get("/advanced-bon-livraisons", { params });
    return res.data;
  },

  getById: async (id) => {
    const res = await api.get(`/advanced-bon-livraisons/${id}`);
    return res.data;
  },

  create: async (payload) => {
    const res = await api.post("/advanced-bon-livraisons", payload);
    return res.data;
  },

  update: async (id, payload) => {
    const res = await api.put(`/advanced-bon-livraisons/${id}`, payload);
    return res.data;
  },

  remove: async (id) => {
    const res = await api.delete(`/advanced-bon-livraisons/${id}`);
    return res.data;
  },

  printPDF: async (id, view = false) => {
    const res = await api.get(`/advanced-bon-livraisons/${id}/print`, {
      params: view ? { view: "inline" } : {},
      responseType: "blob",
    });
    return res.data;
  },

  // POST /advanced-bon-livraisons/:id/report
  // body: { reason, nextDeliveryDate }
  report: async (id, payload) => {
    const res = await api.post(
      `/advanced-bon-livraisons/${id}/report`,
      payload,
    );
    return res.data;
  },

  // POST /advanced-bon-livraisons/:id/resume
  resume: async (id) => {
    const res = await api.post(`/advanced-bon-livraisons/${id}/resume`);
    return res.data;
  },

  // inside commandsApi object, after resume:
  suspend: async (id) => {
    const res = await api.post(`/advanced-bon-livraisons/${id}/suspended`);
    return res.data;
  },

  getDetails: async (id) => {
    const res = await api.get(`/advanced-bon-livraisons/${id}/details`);
    return res.data;
  },

  getWorkflowCounts: async (filters = {}) => {
    const params = buildParams(filters);
    const res = await api.get("/advanced-bon-livraisons/workflow-counts", {
      params,
    });
    return res.data;
  },
  // Inside commandsApi object, add:
  getBLsByStatus: async (filters = {}) => {
    const params = buildParams(filters);
    const res = await api.get("/advanced-bon-livraisons/BLs-By-Status", {
      params,
    });
    return res.data;
  },

  getCommercialStats: async (filters = {}) => {
    const params = buildParams(filters);
    const res = await api.get("/advanced-bon-livraisons/commercial-stats", {
      params,
    });
    return res.data;
  },

  getTopCommercials: async (filters = {}) => {
    const params = buildParams(filters);
    const res = await api.get("/advanced-bon-livraisons/top-commercials", {
      params,
    });
    return res.data;
  },
};

export const updateCommandStatus = async (commandId, targetStatus) => {
  const res = await api.put(`/advanced-bon-livraisons/${commandId}/status`, {
    targetStatus,
  });
  return res.data;
};

/* =========================================================
   FORM APIs (Advanced BL)
========================================================= */
export const advancedBonLivraisonsApi = {
  create: async (payload) => {
    const res = await api.post("/advanced-bon-livraisons", payload);
    return res.data;
  },

  getPicker: async (filters = {}) => {
    const params = buildParams(filters);
    const res = await api.get("/advanced-bon-livraisons/picker", { params });
    return res.data;
  },

  getLivreurs: async (filters = {}) => {
    const params = buildParams({
      type: "intern",
      page: 1,
      limit: 50,
      ...filters,
    });
    const res = await api.get("/advanced-bon-livraisons/livreurs", { params });
    return res.data;
  },

  checkPacksStockAvailability: async ({ depotId, packIds }) => {
    const normalizedPackIds = Array.isArray(packIds)
      ? packIds.join(",")
      : packIds;
    const res = await api.get("/packs/stock-availability", {
      params: buildParams({ depotId, packIds: normalizedPackIds }),
    });
    return res.data;
  },
};

/* =========================================================
   RELATED ENTITIES
========================================================= */
export const livreurApi = {
  getAll: async (filters = {}) => {
    const params = buildParams({ page: 1, limit: 100, ...filters });
    const res = await api.get("/deliveries", { params });
    return res.data;
  },
};

export const commercialsApi = {
  getAll: async (filters = {}) => {
    const params = buildParams({ page: 1, limit: 100, ...filters });
    const res = await api.get("/advanced-bon-livraisons/commercials", {
      params,
    });
    return res.data;
  },
};

export const commandClientsApi = {
  getAll: async (filters = {}) => {
    const params = buildParams({ page: 1, limit: 100, ...filters });
    const res = await api.get("/clients", { params });
    return res.data;
  },
};

export const preparateursApi = {
  getAll: async (filters = {}) => {
    const params = buildParams({ page: 1, limit: 50, ...filters });
    const res = await api.get("/advanced-bon-livraisons/preparateurs", {
      params,
    });
    return res.data;
  },
};

/* =========================================================
   STATIC DATA (Depots / Agencies)
========================================================= */
export const depotsApi = {
  getAll: async (filters = {}) => {
    const params = buildParams({ limit: 100, ...filters });
    const res = await api.get("/depots", { params });
    return res.data;
  },
};

export const agencesApi = {
  getAll: async (filters = {}) => {
    const params = buildParams({ page: 1, limit: 50, ...filters });
    const res = await api.get("/agences", { params });
    return res.data;
  },
};

/* =========================================================
   CITIES
========================================================= */
export const citiesApi = {
  getAll: async () => {
    // Use fetch directly for external API
    const response = await fetch("https://api.ameex.app/web/cities_fees");
    if (!response.ok) {
      throw new Error(`Failed to fetch cities: ${response.statusText}`);
    }
    const data = await response.json();
    return data;
  },
};

/* =========================================================
   CONSTANTS
========================================================= */
export const MODE_REGLEMENT_OPTIONS = [
  { value: "ESPECE", label: "Espèces" },
  { value: "CARTE_BANCAIRE", label: "Carte bancaire" },
  { value: "CHEQUE", label: "Chèque" },
  { value: "EFFET", label: "Effet" },
  { value: "CARTE_FIDELITE", label: "Carte fidélité" },
  { value: "BON_ACHAT", label: "Bon d'achat" },
  { value: "REMISE", label: "Remise" },
  { value: "VIREMENT", label: "Virement bancaire" },
];

export const MODES_WITH_BANQUE = ["CARTE_BANCAIRE", "VIREMENT"];
