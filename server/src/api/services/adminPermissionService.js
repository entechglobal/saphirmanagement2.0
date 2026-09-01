import prisma from "../../loaders/prisma.js";
import ApiError from "../utils/apiError.js";
import ApiFeatures from "../utils/apiFeatures.js";
import { MANAGED_ROLES } from "../validations/adminPermissionValidation.js";

/* ============================================================
   ADMIN PERMISSION SERVICE

   Permission management at two levels:
     • Role level  — RolePermission (shared by every user of the role)
     • User level  — UserExtraPermission (granted directly to one user)

   Effective user permissions = (role + extra) − removed.
============================================================ */

const PERMISSION_SELECT = { id: true, name: true };

/* ──────────────────────────────────────────────────────────
   HELPER: pagination (mirrors ApiFeatures.paginationResult shape)
────────────────────────────────────────────────────────── */
const buildPagination = (query, count) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;
  const skip = (page - 1) * limit;

  const paginationResult = {
    currentPage: page,
    limit,
    numberOfPages: Math.ceil(count / limit),
  };
  if (page * limit < count) paginationResult.next = page + 1;
  if (page > 1) paginationResult.prev = page - 1;

  return { skip, take: limit, paginationResult };
};

/* ──────────────────────────────────────────────────────────
   HELPER: ensure a list of permissionIds all exist
────────────────────────────────────────────────────────── */
const assertPermissionsExist = async (permissionIds) => {
  const found = await prisma.permission.findMany({
    where: { id: { in: permissionIds } },
    select: { id: true },
  });
  const foundIds = new Set(found.map((p) => p.id));
  const missing = permissionIds.filter((id) => !foundIds.has(id));
  if (missing.length > 0) {
    throw new ApiError(`Permissions not found: ${missing.join(", ")}`, 404);
  }
};

/* ============================================================
   MASTER PERMISSION CATALOG
============================================================ */

/**
 * Get all permissions (master catalog) — paginated, searchable.
 */
export const getAll = async (query) => {
  const count = await prisma.permission.count();

  const apiFeatures = new ApiFeatures(query)
    .search(["name"])
    .sort()
    .limitFields({ id: true, name: true, createdAt: true, updatedAt: true })
    .paginate(count);

  const permissions = await prisma.permission.findMany(apiFeatures.build());

  return {
    results: permissions.length,
    pagination: apiFeatures.paginationResult,
    data: permissions,
  };
};

/**
 * Create a new permission.
 */
export const createPermission = async (name) => {
  const exists = await prisma.permission.findUnique({ where: { name } });
  if (exists) throw new ApiError("Permission already exists", 409);

  return prisma.permission.create({ data: { name } });
};

/* ============================================================
   ROLE-LEVEL MANAGEMENT
============================================================ */

/**
 * 1. Get permissions by role.
 *
 * Filters (mutually exclusive, evaluated in priority order):
 *   - userId : inspect the permissions of this user's role
 *   - roleId : a specific role by id
 *   - role   : a managed role by name
 *   - none   : every managed role with its permissions
 *
 * Returns a single role object when filtered, otherwise an array.
 */
export const getRolePermissions = async (query) => {
  const { role, roleId, userId } = query;
  let roleWhere;
  const single = Boolean(userId || roleId || role);

  if (userId) {
    const user = await prisma.user.findUnique({
      where: { id: Number(userId) },
      select: { roleId: true },
    });
    if (!user) throw new ApiError("User not found", 404);
    roleWhere = { id: user.roleId };
  } else if (roleId) {
    roleWhere = { id: Number(roleId) };
  } else if (role) {
    roleWhere = { name: role };
  } else {
    roleWhere = { name: { in: MANAGED_ROLES } };
  }

  const roles = await prisma.role.findMany({
    where: roleWhere,
    select: {
      id: true,
      name: true,
      rolePermissions: {
        select: { permission: { select: PERMISSION_SELECT } },
        orderBy: { permission: { name: "asc" } },
      },
    },
    orderBy: { name: "asc" },
  });

  if (single && roles.length === 0) throw new ApiError("Role not found", 404);

  const data = roles.map((r) => ({
    roleId: r.id,
    roleName: r.name,
    totalPermissions: r.rolePermissions.length,
    permissions: r.rolePermissions.map((rp) => rp.permission),
  }));

  return single ? data[0] : data;
};

/**
 * 2. Get unassigned permissions for a role — paginated, searchable.
 */
export const getUnassignedRolePermissions = async (roleId, query) => {
  const role = await prisma.role.findUnique({
    where: { id: roleId },
    select: { id: true },
  });
  if (!role) throw new ApiError("Role not found", 404);

  const assigned = await prisma.rolePermission.findMany({
    where: { roleId },
    select: { permissionId: true },
  });
  const assignedIds = assigned.map((a) => a.permissionId);

  const where = { id: { notIn: assignedIds } };
  if (query.keyword) where.name = { contains: query.keyword };

  const count = await prisma.permission.count({ where });
  const { skip, take, paginationResult } = buildPagination(query, count);

  const permissions = await prisma.permission.findMany({
    where,
    select: PERMISSION_SELECT,
    orderBy: { name: "asc" },
    skip,
    take,
  });

  return {
    results: permissions.length,
    pagination: paginationResult,
    data: permissions,
  };
};

/**
 * 3. Assign permissions to a role.
 * Validates the role + every permission exists, skips duplicates.
 */
export const assignPermissionsToRole = async (roleId, permissionIds) => {
  const ids = [...new Set(permissionIds)];

  const role = await prisma.role.findUnique({
    where: { id: roleId },
    select: { id: true, name: true },
  });
  if (!role) throw new ApiError("Role not found", 404);

  await assertPermissionsExist(ids);

  const existing = await prisma.rolePermission.findMany({
    where: { roleId, permissionId: { in: ids } },
    select: { permissionId: true },
  });
  const existingIds = new Set(existing.map((e) => e.permissionId));
  const toAssign = ids.filter((id) => !existingIds.has(id));

  if (toAssign.length > 0) {
    await prisma.rolePermission.createMany({
      data: toAssign.map((permissionId) => ({ roleId, permissionId })),
      skipDuplicates: true,
    });
  }

  return {
    roleId: role.id,
    roleName: role.name,
    assignedCount: toAssign.length,
    skippedCount: ids.length - toAssign.length,
    assignedPermissionIds: toAssign,
  };
};

/**
 * 4. Remove permissions from a role.
 * Every permission must currently be assigned to the role.
 */
export const removePermissionsFromRole = async (roleId, permissionIds) => {
  const ids = [...new Set(permissionIds)];

  const role = await prisma.role.findUnique({
    where: { id: roleId },
    select: { id: true, name: true },
  });
  if (!role) throw new ApiError("Role not found", 404);

  const existing = await prisma.rolePermission.findMany({
    where: { roleId, permissionId: { in: ids } },
    select: { permissionId: true },
  });
  const existingIds = existing.map((e) => e.permissionId);
  const notAssigned = ids.filter((id) => !existingIds.includes(id));

  if (notAssigned.length > 0) {
    throw new ApiError(
      `Permissions not assigned to this role: ${notAssigned.join(", ")}`,
      400,
    );
  }

  await prisma.rolePermission.deleteMany({
    where: { roleId, permissionId: { in: ids } },
  });

  return {
    roleId: role.id,
    roleName: role.name,
    removedCount: existingIds.length,
    removedPermissionIds: existingIds,
  };
};

/* ============================================================
   USER-LEVEL MANAGEMENT
============================================================ */

/**
 * Compute effective permissions for a user record that already
 * includes role.rolePermissions, extraPermissions, removedPermissions.
 * Effective = (role + extra) − removed, deduped by permission id.
 */
const computeEffective = (user) => {
  const rolePerms = user.role.rolePermissions.map((rp) => rp.permission);
  const extraPerms = user.extraPermissions.map((ep) => ep.permission);
  const removedIds = new Set(
    user.removedPermissions.map((rp) => rp.permission.id),
  );

  const effective = new Map();
  for (const p of [...rolePerms, ...extraPerms]) {
    if (!removedIds.has(p.id)) effective.set(p.id, p);
  }

  return { rolePerms, extraPerms, effective: [...effective.values()] };
};

const USER_PERMISSION_INCLUDE = {
  role: {
    select: {
      id: true,
      name: true,
      rolePermissions: {
        select: { permission: { select: PERMISSION_SELECT } },
      },
    },
  },
  extraPermissions: {
    select: { permission: { select: PERMISSION_SELECT } },
  },
  removedPermissions: {
    select: { permission: { select: PERMISSION_SELECT } },
  },
};

/**
 * 5. Get user permissions (list) — search by name, paginated.
 * Each user includes role-based + extra + effective permissions.
 */
export const getUsersPermissions = async (query) => {
  const where = {};
  if (query.keyword) where.name = { contains: query.keyword };

  const count = await prisma.user.count({ where });
  const { skip, take, paginationResult } = buildPagination(query, count);

  const users = await prisma.user.findMany({
    where,
    skip,
    take,
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      email: true,
      isSuperAdmin: true,
      ...USER_PERMISSION_INCLUDE,
    },
  });

  const data = users.map((u) => {
    const { rolePerms, extraPerms, effective } = computeEffective(u);
    return {
      userId: u.id,
      name: u.name,
      email: u.email,
      isSuperAdmin: u.isSuperAdmin,
      role: { id: u.role.id, name: u.role.name },
      rolePermissions: rolePerms,
      extraPermissions: extraPerms,
      effectivePermissions: effective,
    };
  });

  return { results: data.length, pagination: paginationResult, data };
};

/**
 * Get a single user's permission detail (role + extra + effective).
 */
export const getUserPermissionDetail = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      name: true,
      email: true,
      isSuperAdmin: true,
      ...USER_PERMISSION_INCLUDE,
    },
  });
  if (!user) throw new ApiError("User not found", 404);

  const { rolePerms, extraPerms, effective } = computeEffective(user);
  return {
    userId: user.id,
    name: user.name,
    email: user.email,
    isSuperAdmin: user.isSuperAdmin,
    role: { id: user.role.id, name: user.role.name },
    rolePermissions: rolePerms,
    extraPermissions: extraPerms,
    effectivePermissions: effective,
  };
};

/**
 * 6. Get unassigned permissions for a user — paginated, searchable.
 * Excludes permissions already granted directly to the user (extra).
 */
export const getUnassignedUserPermissions = async (userId, query) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });
  if (!user) throw new ApiError("User not found", 404);

  const extra = await prisma.userExtraPermission.findMany({
    where: { userId },
    select: { permissionId: true },
  });
  const extraIds = extra.map((e) => e.permissionId);

  const where = { id: { notIn: extraIds } };
  if (query.keyword) where.name = { contains: query.keyword };

  const count = await prisma.permission.count({ where });
  const { skip, take, paginationResult } = buildPagination(query, count);

  const permissions = await prisma.permission.findMany({
    where,
    select: PERMISSION_SELECT,
    orderBy: { name: "asc" },
    skip,
    take,
  });

  return {
    results: permissions.length,
    pagination: paginationResult,
    data: permissions,
  };
};

/**
 * 7. Assign extra permissions to a user.
 * Validates the user + every permission exists, skips duplicates, and
 * clears any matching "removed" override so the grant takes effect.
 */
export const assignPermissionsToUser = async (userId, permissionIds) => {
  const ids = [...new Set(permissionIds)];

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true },
  });
  if (!user) throw new ApiError("User not found", 404);

  await assertPermissionsExist(ids);

  const existing = await prisma.userExtraPermission.findMany({
    where: { userId, permissionId: { in: ids } },
    select: { permissionId: true },
  });
  const existingIds = new Set(existing.map((e) => e.permissionId));
  const toAssign = ids.filter((id) => !existingIds.has(id));

  if (toAssign.length > 0) {
    await prisma.$transaction(async (tx) => {
      // A prior explicit removal would suppress the grant — clear it.
      await tx.userRemovedPermission.deleteMany({
        where: { userId, permissionId: { in: toAssign } },
      });
      await tx.userExtraPermission.createMany({
        data: toAssign.map((permissionId) => ({ userId, permissionId })),
        skipDuplicates: true,
      });
    });
  }

  return {
    userId: user.id,
    userName: user.name,
    assignedCount: toAssign.length,
    skippedCount: ids.length - toAssign.length,
    assignedPermissionIds: toAssign,
  };
};

/**
 * 8. Remove (extra) permissions from a user.
 * Only deletes user-specific grants — role-inherited permissions are
 * never touched. Every permission must currently be an extra grant.
 */
export const removePermissionsFromUser = async (userId, permissionIds) => {
  const ids = [...new Set(permissionIds)];

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true },
  });
  if (!user) throw new ApiError("User not found", 404);

  const existing = await prisma.userExtraPermission.findMany({
    where: { userId, permissionId: { in: ids } },
    select: { permissionId: true },
  });
  const existingIds = existing.map((e) => e.permissionId);
  const notAssigned = ids.filter((id) => !existingIds.includes(id));

  if (notAssigned.length > 0) {
    throw new ApiError(
      `Permissions not directly assigned to this user: ${notAssigned.join(", ")}`,
      400,
    );
  }

  await prisma.userExtraPermission.deleteMany({
    where: { userId, permissionId: { in: ids } },
  });

  return {
    userId: user.id,
    userName: user.name,
    removedCount: existingIds.length,
    removedPermissionIds: existingIds,
  };
};
