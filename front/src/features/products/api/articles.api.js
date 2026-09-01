import apiClient from "../../../shared/api/axios";

const api = apiClient;

export const articlesApi = {
  getAll: async ({ page, limit, keyword } = {}) => {
    const res = await api.get("/articles", {
      params: {
        page,
        limit,
        keyword,
      },
    });
    return res.data;
  },

  getById: async (id) => {
    const res = await api.get(`/articles/${id}`);
    return res.data;
  },

  create: async (payload) => {
    const res = await api.post("/articles", payload, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  update: async (id, payload) => {
    const isFormData = payload instanceof FormData;

    const res = await api.put(`/articles/${id}`, payload, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return res.data;
  },

  remove: async (id) => {
    const res = await api.delete(`/articles/${id}`);
    return res.data;
  },

  // ======================= CSV =======================
  exportCsv: async () => {
    const res = await api.get("/articles/export/csv", {
      responseType: "blob",
    });
    return res.data;
  },

  importCsv: async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await api.post("/articles/import/csv", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  // ======================= XLSX =======================
  exportXlsx: async () => {
    const res = await api.get("/articles/export/excel", {
      responseType: "blob",
    });
    return res.data;
  },

  importXlsx: async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await api.post("/articles/import/excel", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return res.data;
  },
};
