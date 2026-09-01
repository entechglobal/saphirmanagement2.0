import apiClient from "@/shared/api/axios";

export const documentHeaderApi = {
  update: async (config, societeId) => {
    const res = await apiClient.put("/societes/me/document-header", {
      config,
      ...(societeId ? { societeId } : {}),
    });
    return res.data;
  },
};
