import apiClient from "../../../shared/api/axios";

const api = apiClient;

export const usersApi = {
  // ── LIST / READ ────────────────────────────────────────────────
  getAll: async ({ page, limit, keyword } = {}) => {
    const term = typeof keyword === "string" ? keyword.trim() : "";
    const res = await api.get("/users", {
      params: {
        page,
        limit,
        ...(term && { keyword: term, search: term }),
      },
    });
    return res.data;
  },

  getById: async (id) => {
    const res = await api.get(`/users/${id}`);
    return res.data;
  },

  getCurrentUser: async () => {
    const res = await api.get("/users/me");
    return res.data;
  },

  getBySociete: async (societeId) => {
    const res = await api.get(`/users/by-societe/${societeId}`);
    return res.data;
  },

  getStatistics: async (id) => {
    const res = await api.get(`/users/${id}/statistics`);
    return res.data;
  },

  // ── CREATE / UPDATE ────────────────────────────────────────────
  create: async (payload) => {
    const res = await api.post("/users", buildFormData(payload), {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  update: async (id, payload) => {
    const res = await api.put(`/users/${id}`, buildFormData(payload), {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data;
  },

  // ── PASSWORD ───────────────────────────────────────────────────
  // PATCH /api/users/:id/password
  // Own account → requires currentPassword
  // Admin reset → currentPassword optional (backend checks isSuperAdmin)
  updatePassword: async (id, { currentPassword, newPassword, confirmPassword }) => {
    const res = await api.patch(`/users/${id}/password`, {
      currentPassword,
      newPassword,
      confirmPassword,
    });
    return res.data;
  },

  // ── SOFT DELETE / REACTIVATE ───────────────────────────────────
  deactivate: async (id) => {
    const res = await api.patch(`/users/${id}/deactivate`);
    return res.data;
  },

  reactivate: async (id) => {
    const res = await api.patch(`/users/${id}/reactivate`);
    return res.data;
  },

  // ── HARD DELETE (Super Admin only) ────────────────────────────
  remove: async (id) => {
    const res = await api.delete(`/users/${id}`);
    return res.data;
  },
};

// ─────────────────────────────────────────────────────────────────
// HELPER: convert plain object → FormData
// Skips null/undefined; appends File as-is; stringifies everything else
// ─────────────────────────────────────────────────────────────────
function buildFormData(payload) {
  const fd = new FormData();
  Object.entries(payload).forEach(([key, value]) => {
    if (value === null || value === undefined) return;
    fd.append(key, value instanceof File ? value : String(value));
  });
  return fd;
}