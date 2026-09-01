import apiClient from "../../../../shared/api/axios";

// ─── Permissions catalog ──────────────────────────────────────────────────────
export const permissionsAPI = {
  getAll: (params = { page: 1, limit: 10 }) =>
    apiClient.get("/admin/permissions", { params }),
  create: (payload) => apiClient.post("/admin/permissions", payload),
};

// ─── Role Permissions ─────────────────────────────────────────────────────────
export const rolePermissionsAPI = {
  // GET /admin/roles/permissions?roleId=X  →  { data: { roleId, roleName, permissions: [] } }
  getByRoleId: (roleId) =>
    apiClient.get("/admin/roles/permissions", { params: { roleId } }),

  // POST /admin/roles/permissions  body: { roleId, permissionIds: [] }
  assign: (payload) => apiClient.post("/admin/roles/permissions", payload),

  // DELETE /admin/roles/permissions  body: { roleId, permissionIds: [] }
  remove: (payload) =>
    apiClient.delete("/admin/roles/permissions", { data: payload }),
};

// ─── User Permissions ─────────────────────────────────────────────────────────
export const userPermissionsAPI = {
  // GET /admin/users/:userId/permissions  →  { data: { userId, name, role, rolePermissions, extraPermissions, effectivePermissions } }
  getDetail: (userId) =>
    apiClient.get(`/admin/users/${userId}/permissions`),

  // POST /admin/users/permissions  body: { userId, permissionIds: [] }
  assign: (payload) => apiClient.post("/admin/users/permissions", payload),

  // DELETE /admin/users/permissions  body: { userId, permissionIds: [] }
  remove: (payload) =>
    apiClient.delete("/admin/users/permissions", { data: payload }),
};

// ─── Users (for selector) ─────────────────────────────────────────────────────
export const usersAPI = {
  getAll: (params = { page: 1, limit: 20 }) =>
    apiClient.get("/users", { params }),
};

// ─── Roles (static) ───────────────────────────────────────────────────────────
export const STATIC_ROLES = [
  { id: 2, name: "Societe_Admin" },
  { id: 3, name: "Caissier" },
  { id: 4, name: "Gerant" },
  { id: 5, name: "Commercial" },
  { id: 6, name: "Preparateur" },
  { id: 7, name: "Livreur" },
];
