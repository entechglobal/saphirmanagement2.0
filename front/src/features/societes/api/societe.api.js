import apiClient from "../../../shared/api/axios";

const api = apiClient;

/**
 * Societes API
 * ONLY HTTP calls – no cache, no logic
 */
export const societeApi = {
  getByme: async () => {
    const res = await api.get(`/societes/me`);
    return res.data;
  },

  update: async (id, payload) => {
    const res = await api.put(`/societes/${id}`, payload);
    return res.data;
  },
};
