import { body, param, query } from "express-validator";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";

/* ============================================================
   ADMIN PERMISSION VALIDATION RULES
============================================================ */

// Roles whose permissions can be managed through this module.
export const MANAGED_ROLES = [
  "Super_Admin",
  "Societe_Admin",
  "Caissier",
  "Gerant",
  "Commercial",
  "Preparateur",
  "Livreur",
];

/* ──────────────────────────────────────────────────────────
   CREATE PERMISSION
   POST /api/admin/permissions
────────────────────────────────────────────────────────── */
export const createPermissionValidator = [
  body("name")
    .trim()
    .notEmpty()
    .withMessage("name is required")
    .isString()
    .withMessage("name must be a string")
    .isLength({ max: 100 })
    .withMessage("name cannot exceed 100 characters"),
  validatorMiddleware,
];

/* ──────────────────────────────────────────────────────────
   GET PERMISSIONS BY ROLE
   GET /api/admin/roles/permissions?role= | ?roleId= | ?userId=
────────────────────────────────────────────────────────── */
export const getRolePermissionsValidator = [
  query("role")
    .optional()
    .isIn(MANAGED_ROLES)
    .withMessage(`role must be one of: ${MANAGED_ROLES.join(", ")}`),

  query("roleId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("roleId must be a positive integer")
    .toInt(),

  query("userId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("userId must be a positive integer")
    .toInt(),

  validatorMiddleware,
];

/* ──────────────────────────────────────────────────────────
   GET UNASSIGNED PERMISSIONS FOR A ROLE
   GET /api/admin/roles/:roleId/permissions/unassigned
────────────────────────────────────────────────────────── */
export const roleIdParamValidator = [
  param("roleId")
    .isInt({ min: 1 })
    .withMessage("roleId must be a positive integer")
    .toInt(),
  validatorMiddleware,
];

/* ──────────────────────────────────────────────────────────
   ASSIGN / REMOVE PERMISSIONS  ↔  ROLE
   POST | DELETE /api/admin/roles/permissions
────────────────────────────────────────────────────────── */
export const rolePermissionsBodyValidator = [
  body("roleId")
    .notEmpty()
    .withMessage("roleId is required")
    .isInt({ min: 1 })
    .withMessage("roleId must be a positive integer")
    .toInt(),

  body("permissionIds")
    .isArray({ min: 1 })
    .withMessage("permissionIds must be a non-empty array"),

  body("permissionIds.*")
    .isInt({ min: 1 })
    .withMessage("each permissionId must be a positive integer")
    .toInt(),

  validatorMiddleware,
];

/* ──────────────────────────────────────────────────────────
   GET USER PERMISSIONS (list, search by name)
   GET /api/admin/users/permissions
────────────────────────────────────────────────────────── */
export const getUsersPermissionsValidator = [
  query("keyword")
    .optional()
    .isString()
    .withMessage("keyword must be a string"),
  validatorMiddleware,
];

/* ──────────────────────────────────────────────────────────
   USER ID PARAM (unassigned / single user)
   GET /api/admin/users/:userId/permissions[/unassigned]
────────────────────────────────────────────────────────── */
export const userIdParamValidator = [
  param("userId")
    .isInt({ min: 1 })
    .withMessage("userId must be a positive integer")
    .toInt(),
  validatorMiddleware,
];

/* ──────────────────────────────────────────────────────────
   ASSIGN / REMOVE EXTRA PERMISSIONS  ↔  USER
   POST | DELETE /api/admin/users/permissions
────────────────────────────────────────────────────────── */
export const userPermissionsBodyValidator = [
  body("userId")
    .notEmpty()
    .withMessage("userId is required")
    .isInt({ min: 1 })
    .withMessage("userId must be a positive integer")
    .toInt(),

  body("permissionIds")
    .isArray({ min: 1 })
    .withMessage("permissionIds must be a non-empty array"),

  body("permissionIds.*")
    .isInt({ min: 1 })
    .withMessage("each permissionId must be a positive integer")
    .toInt(),

  validatorMiddleware,
];
