import apiClient from "../../../shared/api/axios";

const api = apiClient;

export const articlesVariantsApi = {
  getAll: async ({ page, limit, keyword } = {}) => {
    const res = await api.get("/article-variants", {
      params: {
        page,
        limit,
        keyword,
      },
    });
    return res.data;
  },

  getById: async (id) => {
    const res = await api.get(`/article-variants/${id}`);
    return res.data;
  },

create: async ({ articleId, variants }) => {
  const res = await api.post(
    `/article-variants/bulk/${articleId}`,
    { variants } 
  );

  return res.data;
},

  update: async (id, payload) => {
    const isFormData = payload instanceof FormData;

    const res = await api.put(`/article-variants/${id}`, payload, {
      headers: isFormData
        ? undefined 
        : { "Content-Type": "application/json" },
    });

    return res.data;
  },

  remove: async (id) => {
    const res = await api.delete(`/article-variants/${id}`);
    return res.data;
  },

 patch: async (id, payload) => {
  const isFormData = payload instanceof FormData;

  const res = await api.patch(
    `/article-variants/${id}/attributes`,
    payload,
    {
      headers: isFormData
        ? undefined
        : { "Content-Type": "application/json" },
    }
  );

  return res.data;
},

};

