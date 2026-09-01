import axios from "axios";
import { getApiBaseUrl } from "@/shared/api/baseUrl";

const API_URL = getApiBaseUrl();
const api = axios.create({
  baseURL: API_URL,
  //  withCredentials: false,
  // headers: {
  //   "Content-Type": "application/json",
  //   Accept: "application/json",
  //     "ngrok-skip-browser-warning": "true",
  // },
  // // timeout: 30000,
});

/**
 * Categories API
 * ONLY HTTP calls – no cache, no logic
 */
export const familiesApi = {
  getAll: async ({ page, limit, keyword } = {}) => {
    const res = await api.get("/families", {
      params: {
        page,
        limit,
        keyword,
      },
    });
    return res.data;
  },

  getById: async (id) => {
    const res = await api.get(`/families/${id}`);
    return res.data;
  },

  create: async (payload) => {
    const res = await api.post("/families", payload);
    return res.data;
  },

  update: async (id, payload) => {
    const isFormData = payload instanceof FormData;

    const res = await api.put(`/families/${id}`, payload, {
      headers: isFormData ? undefined : { "Content-Type": "application/json" },
    });

    return res.data;
  },

  remove: async (id) => {
    const res = await api.delete(`/families/${id}`);
    return res.data;
  },

  // ======================= CSV =======================
  exportCsv: async () => {
    const res = await api.get("/families/export/csv", {
      responseType: "blob",
    });
    return res.data;
  },

  importCsv: async (file) => {
    const formData = new FormData();
    formData.append("file", file);
    const res = await api.post("/families/import/csv", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  // ======================= XLSX =======================
  exportXlsx: async () => {
    const res = await api.get("/families/export/excel", {
      responseType: "blob", 
    });
    return res.data;
  },

  importXlsx: async (file) => {
    const formData = new FormData();
    formData.append("file", file);

    const res = await api.post("/families/import/excel", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });

    return res.data;
  },
};
