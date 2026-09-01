import axios from "axios";
import { getApiBaseUrl } from "@/shared/api/baseUrl";

const API_URL = getApiBaseUrl();
const api = axios.create({
  baseURL: API_URL,
  //  withCredentials: false,
  // headers: {
  //  "Content-Type": "multipart/form-data",
  //   Accept: "application/json",
  //     "ngrok-skip-browser-warning": "true",
  // },
  // timeout: 30000,
});

/**
 * Categories API
 * ONLY HTTP calls – no cache, no logic
 */
export const categoriesApi = {
  getAll: async ({ page, limit, keyword } = {}) => {
    const res = await api.get("/categories", {
      params: {
        page,
        limit,
        keyword,
      },
    });
    // console.log(res.data);

    return res.data;
  },

  getById: async (id) => {
    const res = await api.get(`/categories/${id}`);
    return res.data;
  },

  create: async (payload) => {
    const res = await api.post("/categories", payload);
    return res.data;
  },

  update: async (id, payload) => {
    console.log(payload);

    const res = await api.put(`/categories/${id}`, payload);
    return res.data;
  },

  remove: async (id) => {
    const res = await api.delete(`/categories/${id}`);
    return res.data;
  },

  // ======================= CSV =======================
  exportCsv: async () => {
    const res = await api.get("/categories/export/csv", {
      responseType: "blob", 
    });
    return res.data;
  },

  importCsv: async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await api.post("/categories/import/csv", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  // ======================= XLSX =======================
  exportXlsx: async () => {
    const res = await api.get("/categories/export/excel", {
      responseType: "blob",
    });
    return res.data;
  },

  importXlsx: async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await api.post("/categories/import/excel", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return res.data;
  },
};
