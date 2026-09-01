import asyncHandler from "express-async-handler";
import * as AdminPermissionService from "../services/adminPermissionService.js";

/* ============================================================
   MASTER PERMISSION CATALOG
============================================================ */

export const getAllPermissions = asyncHandler(async (req, res) => {
  const permissions = await AdminPermissionService.getAll(req.query);
  res.status(200).json({
    message: "All permissions retrieved successfully",
    results: permissions.results,
    pagination: permissions.pagination,
    data: permissions.data,
  });
});

export const createPermission = asyncHandler(async (req, res) => {
  const permission = await AdminPermissionService.createPermission(
    req.body.name,
  );
  res.status(201).json({
    message: "Permission created successfully",
    data: permission,
  });
});

/* ============================================================
   ROLE-LEVEL MANAGEMENT
============================================================ */

// 1. Get permissions by role (filter by role | roleId | userId)
export const getRolePermissions = asyncHandler(async (req, res) => {
  const data = await AdminPermissionService.getRolePermissions(req.query);
  res.status(200).json({
    message: "Role permissions retrieved successfully",
    data,
  });
});

// 2. Get unassigned permissions for a role
export const getUnassignedRolePermissions = asyncHandler(async (req, res) => {
  const result = await AdminPermissionService.getUnassignedRolePermissions(
    Number(req.params.roleId),
    req.query,
  );
  res.status(200).json({
    message: "Unassigned role permissions retrieved successfully",
    results: result.results,
    pagination: result.pagination,
    data: result.data,
  });
});

// 3. Assign permissions to a role
export const assignPermissionsToRole = asyncHandler(async (req, res) => {
  const { roleId, permissionIds } = req.body;
  const result = await AdminPermissionService.assignPermissionsToRole(
    Number(roleId),
    permissionIds,
  );
  res.status(200).json({
    message: "Permissions assigned to role successfully",
    data: result,
  });
});

// 4. Remove permissions from a role
export const removePermissionsFromRole = asyncHandler(async (req, res) => {
  const { roleId, permissionIds } = req.body;
  const result = await AdminPermissionService.removePermissionsFromRole(
    Number(roleId),
    permissionIds,
  );
  res.status(200).json({
    message: "Permissions removed from role successfully",
    data: result,
  });
});

/* ============================================================
   USER-LEVEL MANAGEMENT
============================================================ */

// 5. Get user permissions (list, search by name, paginated)
export const getUsersPermissions = asyncHandler(async (req, res) => {
  const result = await AdminPermissionService.getUsersPermissions(req.query);
  res.status(200).json({
    message: "User permissions retrieved successfully",
    results: result.results,
    pagination: result.pagination,
    data: result.data,
  });
});

// Single user's effective permission detail
export const getUserPermissions = asyncHandler(async (req, res) => {
  const data = await AdminPermissionService.getUserPermissionDetail(
    Number(req.params.userId),
  );
  res.status(200).json({
    message: `Permissions for user ${req.params.userId} retrieved successfully`,
    data,
  });
});

// 6. Get unassigned permissions for a user
export const getUnassignedUserPermissions = asyncHandler(async (req, res) => {
  const result = await AdminPermissionService.getUnassignedUserPermissions(
    Number(req.params.userId),
    req.query,
  );
  res.status(200).json({
    message: "Unassigned user permissions retrieved successfully",
    results: result.results,
    pagination: result.pagination,
    data: result.data,
  });
});

// 7. Assign extra permissions to a user
export const assignPermissionsToUser = asyncHandler(async (req, res) => {
  const { userId, permissionIds } = req.body;
  const result = await AdminPermissionService.assignPermissionsToUser(
    Number(userId),
    permissionIds,
  );
  res.status(200).json({
    message: "Extra permissions assigned to user successfully",
    data: result,
  });
});

// 8. Remove (extra) permissions from a user
export const removePermissionsFromUser = asyncHandler(async (req, res) => {
  const { userId, permissionIds } = req.body;
  const result = await AdminPermissionService.removePermissionsFromUser(
    Number(userId),
    permissionIds,
  );
  res.status(200).json({
    message: "Permissions removed from user successfully",
    data: result,
  });
});
