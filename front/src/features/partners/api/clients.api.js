import apiClient from "../../../shared/api/axios";

const api = apiClient;
/**
 * Clients API
 * ONLY HTTP calls – no cache, no logic
 */
export const clientsApi = {
  getAll: async ({ page, limit, keyword } = {}) => {
    const res = await api.get("/clients", {
      params: {
        page,
        limit,
        keyword,
      },
    });

    return res.data;
  },

  getById: async (id) => {
    const res = await api.get(`/clients/${id}`);
    return res.data;
  },

  create: async (payload) => {
    const res = await api.post("/clients", payload);
    return res.data;
  },

  update: async (id, payload) => {
    const isFormData = payload instanceof FormData;

    const res = await api.put(`/clients/${id}`, payload, {
      headers: isFormData ? undefined : { "Content-Type": "application/json" },
    });

    return res.data;
  },

  remove: async (id) => {
    const res = await api.delete(`/clients/${id}`);
    return res.data;
  },

  // ======================= CSV =======================
  exportCsv: async () => {
    const res = await api.get("/clients/export/csv", {
      responseType: "blob",
    });
    return res.data;
  },

  importCsv: async ({ file, societeId }) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await api.post(
      `/clients/import/csv?societeId=${societeId}`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );

    return res.data;
  },

  // for normal admin and user
  importCsvSimple: async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await api.post("/clients/import/csv", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return res.data;
  },

  // ======================= XLSX =======================
  exportXlsx: async () => {
    const res = await api.get("/clients/export/excel", {
      responseType: "blob",
    });
    return res.data;
  },
  importXlsx: async ({ file, societeId }) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await api.post(
      `/clients/import/excel?societeId=${societeId}`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );

    return res.data;
  },

  // for normal admin and user
  importXlsxSimple: async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await api.post("/clients/import/excel", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return res.data;
  },
};
