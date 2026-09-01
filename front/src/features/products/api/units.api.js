import axios from "axios";
import { getApiBaseUrl } from "@/shared/api/baseUrl";

const API_URL = getApiBaseUrl();
const api = axios.create({
  baseURL: API_URL,
  // withCredentials: false,
  // headers: {
  //   "Content-Type": "application/json",
  //   Accept: "application/json",
  //      "ngrok-skip-browser-warning": "true",
  // },
  // timeout: 30000,
});

/**
 * Categories API
 * ONLY HTTP calls – no cache, no logic
 */
export const unitsApi = {
  getAll: async () => {
    const res = await api.get("/units");
    return res.data;
  },
};
