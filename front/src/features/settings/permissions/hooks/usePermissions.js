import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  permissionsAPI,
  rolePermissionsAPI,
  userPermissionsAPI,
  usersAPI,
} from "../api/permissions.api"

// ─── Permissions catalog ──────────────────────────────────────────────────────
export const usePermissions = (page = 1, limit = 10, keyword = "") =>
  useQuery({
    queryKey: ["permissions", page, limit, keyword],
    queryFn: () =>
      permissionsAPI.getAll({ page, limit, keyword }).then((r) => r.data),
    keepPreviousData: true,
  })

export const useCreatePermission = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) => permissionsAPI.create(payload).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["permissions"] }),
  })
}

// ─── Role Permissions ─────────────────────────────────────────────────────────
export const useRolePermissions = (roleId) =>
  useQuery({
    queryKey: ["role-permissions", roleId],
    queryFn: () =>
      rolePermissionsAPI.getByRoleId(roleId).then((r) => r.data),
    enabled: !!roleId,
  })

export const useAssignRolePermissions = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) =>
      rolePermissionsAPI.assign(payload).then((r) => r.data),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["role-permissions", vars.roleId] }),
  })
}

export const useRemoveRolePermissions = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) =>
      rolePermissionsAPI.remove(payload).then((r) => r.data),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["role-permissions", vars.roleId] }),
  })
}

// ─── User Permissions ─────────────────────────────────────────────────────────
export const useUserPermissionDetail = (userId) =>
  useQuery({
    queryKey: ["user-permission", userId],
    queryFn: () =>
      userPermissionsAPI.getDetail(userId).then((r) => r.data),
    enabled: !!userId,
  })

export const useAssignUserPermissions = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) =>
      userPermissionsAPI.assign(payload).then((r) => r.data),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["user-permission", vars.userId] }),
  })
}

export const useRemoveUserPermissions = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (payload) =>
      userPermissionsAPI.remove(payload).then((r) => r.data),
    onSuccess: (_, vars) =>
      qc.invalidateQueries({ queryKey: ["user-permission", vars.userId] }),
  })
}

// ─── Users (for selector) ─────────────────────────────────────────────────────
export const useUsers = (page = 1, limit = 20, keyword = "") =>
  useQuery({
    queryKey: ["users", page, limit, keyword],
    queryFn: () =>
      usersAPI.getAll({ page, limit, keyword }).then((r) => r.data),
    keepPreviousData: true,
  })
