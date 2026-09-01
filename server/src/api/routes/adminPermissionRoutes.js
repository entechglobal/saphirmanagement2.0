import { Router } from "express";
import * as AdminPermissionController from "../controllers/adminPermissionController.js";
import { auth } from "../middlewares/authMiddleware.js";
import { superAdminOnly } from "../middlewares/superAdminMiddleware.js";
import {
  createPermissionValidator,
  getRolePermissionsValidator,
  roleIdParamValidator,
  rolePermissionsBodyValidator,
  getUsersPermissionsValidator,
  userIdParamValidator,
  userPermissionsBodyValidator,
} from "../validations/adminPermissionValidation.js";

const router = Router();

// ============================================
// ALL ROUTES REQUIRE SUPER ADMIN
// ============================================
router.use(auth);
router.use(superAdminOnly);

/* ============================================================
   MASTER PERMISSION CATALOG
============================================================ */
router.get("/permissions", AdminPermissionController.getAllPermissions);
router.post(
  "/permissions",
  createPermissionValidator,
  AdminPermissionController.createPermission,
);

/* ============================================================
   ROLE-LEVEL MANAGEMENT
   (static routes before parameterized ones)
============================================================ */

// 1. Get permissions by role — ?role= | ?roleId= | ?userId=
router.get(
  "/roles/permissions",
  getRolePermissionsValidator,
  AdminPermissionController.getRolePermissions,
);

// 3. Assign permissions to a role
router.post(
  "/roles/permissions",
  rolePermissionsBodyValidator,
  AdminPermissionController.assignPermissionsToRole,
);

// 4. Remove permissions from a role
router.delete(
  "/roles/permissions",
  rolePermissionsBodyValidator,
  AdminPermissionController.removePermissionsFromRole,
);

// 2. Get unassigned permissions for a role
router.get(
  "/roles/:roleId/permissions/unassigned",
  roleIdParamValidator,
  AdminPermissionController.getUnassignedRolePermissions,
);

/* ============================================================
   USER-LEVEL MANAGEMENT
   (static routes before parameterized ones)
============================================================ */

// 5. Get user permissions (list, search by name, paginated)
router.get(
  "/users/permissions",
  getUsersPermissionsValidator,
  AdminPermissionController.getUsersPermissions,
);

// 7. Assign extra permissions to a user
router.post(
  "/users/permissions",
  userPermissionsBodyValidator,
  AdminPermissionController.assignPermissionsToUser,
);

// 8. Remove (extra) permissions from a user
router.delete(
  "/users/permissions",
  userPermissionsBodyValidator,
  AdminPermissionController.removePermissionsFromUser,
);

// 6. Get unassigned permissions for a user
router.get(
  "/users/:userId/permissions/unassigned",
  userIdParamValidator,
  AdminPermissionController.getUnassignedUserPermissions,
);

// Single user's effective permission detail
router.get(
  "/users/:userId/permissions",
  userIdParamValidator,
  AdminPermissionController.getUserPermissions,
);

export default router;
