import axios from "axios";
import { getApiBaseUrl } from "@/shared/api/baseUrl";

const API_URL = getApiBaseUrl();
const api = axios.create({
  baseURL: API_URL,
  // withCredentials: false,
  // headers: { "Content-Type": "application/json" },
});

export const attributesApi = {
  // GET all attributes with values
  getAll: async () => {
    const res = await api.get("/attributes/with-values");
    return res.data;
  },

    // CREATE attribute with values
  create: async (payload) => {
    const res = await api.post("/attributes/with-values", payload, {
      headers: { "Content-Type": "application/json" },
    });
    return res.data;
  },


  // UPDATE attribute with values
  update: async (id, payload) => {
    const res = await api.put(`/attributes/${id}/with-values`, payload, {
      headers: { "Content-Type": "application/json" },
    });
    return res.data;
  },

  // DELETE attribute
  remove: async (id) => {
    const res = await api.delete(`/attributes/${id}`);
    return res.data;
  },
};
