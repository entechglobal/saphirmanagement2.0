import apiClient from "../../../shared/api/axios";

const api = apiClient;

/**
 * Fournisseurs API
 * ONLY HTTP calls – no cache, no logic
 */
export const fournisseursApi = {
  getAll: async ({ page, limit, keyword } = {}) => {
    const res = await api.get("/fournisseurs", {
      params: {
        page,
        limit,
        keyword,
      },
    });

    return res.data;
  },

  getById: async (id) => {
    const res = await api.get(`/fournisseurs/${id}`);
    return res.data;
  },

  create: async (payload) => {
    const res = await api.post("/fournisseurs", payload);
    return res.data;
  },

  update: async (id, payload) => {
    const isFormData = payload instanceof FormData;

    const res = await api.put(`/fournisseurs/${id}`, payload, {
      headers: isFormData ? undefined : { "Content-Type": "application/json" },
    });

    return res.data;
  },

  remove: async (id) => {
    const res = await api.delete(`/fournisseurs/${id}`);
    return res.data;
  },

  // ======================= CSV =======================
  exportCsv: async () => {
    const res = await api.get("/fournisseurs/export/csv", {
      responseType: "blob",
    });
    return res.data;
  },

  //for admin only
  importCsv: async ({ file, societeId }) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await api.post(
      `/fournisseurs/import/csv?societeId=${societeId}`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );

    return res.data;
  },


   //for normal admin and user
  importCsvSimple: async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await api.post("/fournisseurs/import/csv", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return res.data;
  },

  // ======================= XLSX =======================
  exportXlsx: async () => {
    const res = await api.get("/fournisseurs/export/excel", {
      responseType: "blob",
    });
    return res.data;
  },

  //Import Xlsx for admin only
   importXlsx: async ({ file, societeId }) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await api.post(
      `/fournisseurs/import/excel?societeId=${societeId}`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );

    return res.data;
  },

   //for normal admin and user
  importXlsxSimple: async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await api.post("/fournisseurs/import/excel", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return res.data;
  },
};
