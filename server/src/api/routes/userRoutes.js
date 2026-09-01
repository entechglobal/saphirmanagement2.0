import { Router } from "express";
import * as UserController from "../controllers/userController.js";

// ── Middlewares ────────────────────────────────────────────────────────────────
import { auth } from "../middlewares/authMiddleware.js";
import { hasPermission } from "../middlewares/rbacMiddleware.js";
import { superAdminOnly } from "../middlewares/superAdminMiddleware.js";

// ── Validators ─────────────────────────────────────────────────────────────────
import {
  createUserValidator,
  updateUserValidator,
  updatePasswordValidator,
  userIdValidator,
  societeIdParamValidator,
  getUsersQueryValidator,
} from "../validations/userValidation.js";

import { uploadProfileImage, resizeImage } from "../services/userService.js";

const router = Router();

// ── Global auth ────────────────────────────────────────────────────────────────
router.use(auth); // Every user route requires a valid JWT

// =============================================================================
// CURRENT USER (ME)
// =============================================================================

/**
 * GET /api/users/me
 *
 * Get current authenticated user's profile with statistics
 * Available to: All authenticated users
 */
router.get("/me", UserController.getCurrentUser);

// =============================================================================
// STATISTICS (Must be before /:id)
// =============================================================================

/**
 * GET /api/users/:id/statistics
 *
 * Get user activity statistics
 * - Stock transactions created
 * - Documents created
 * - Transfers/Inventories created/validated
 *
 * Super Admin: any user
 * Regular User: only users from own société
 */
router.get(
  "/:id/statistics",
  userIdValidator,
  UserController.getUserStatistics,
);

// =============================================================================
// BY SOCIÉTÉ (Must be before /:id)
// =============================================================================

/**
 * GET /api/users/by-societe/:societeId
 *
 * Get all users for a specific société
 *
 * Super Admin: any société
 * Regular User: only own société
 *
 * Query params: ?roleId=1&active=true
 */
router.get(
  "/by-societe/:societeId",
  societeIdParamValidator,
  UserController.getUsersBySociete,
);

// =============================================================================
// PASSWORD MANAGEMENT (Must be before /:id)
// =============================================================================

/**
 * PATCH /api/users/:id/password
 *
 * Update user password
 *
 * Self: requires currentPassword
 * Super Admin / Société Admin: can reset any user's password (no currentPassword required)
 *
 * Body:
 * {
 *   "currentPassword": "old123",  // Required for self
 *   "newPassword": "New123",
 *   "confirmPassword": "New123"
 * }
 */
router.patch(
  "/:id/password",
  userIdValidator,
  updatePasswordValidator,
  UserController.updatePassword,
);

// =============================================================================
// DEACTIVATE / REACTIVATE (Must be before /:id)
// =============================================================================

/**
 * PATCH /api/users/:id/deactivate
 *
 * Deactivate user (soft delete)
 * Sets active = false
 *
 * Super Admin: any user
 * Regular User: only users from own société (cannot deactivate Super Admins)
 *
 * Cannot deactivate self
 */
router.patch(
  "/:id/deactivate",
  userIdValidator,
  hasPermission("manage_users"),
  UserController.deactivateUser,
);

/**
 * PATCH /api/users/:id/reactivate
 *
 * Reactivate deactivated user
 * Sets active = true
 *
 * Super Admin: any user
 * Regular User: only users from own société
 */
router.patch(
  "/:id/reactivate",
  userIdValidator,
  hasPermission("manage_users"),
  UserController.reactivateUser,
);

// =============================================================================
// CRUD
// =============================================================================

/**
 * GET /api/users
 *
 * List all users with filtering
 *
 * Super Admin: all users (optional ?societeId=X or ?isSuperAdmin=true filter)
 * Regular User: only own société's users
 *
 * Query params:
 * - page, limit (pagination)
 * - societeId (Super Admin only)
 * - roleId (filter by role)
 * - active=true|false (filter by status)
 * - isSuperAdmin=true|false (Super Admin only)
 * - search (search by name or email)
 */
router.get("/", getUsersQueryValidator, UserController.getAllUsers);

/**
 * GET /api/users/:id
 *
 * Get user by ID with full details
 *
 * Super Admin: any user
 * Regular User: only users from own société
 */
router.get("/:id", userIdValidator, UserController.getUserById);

/**
 * POST /api/users
 *
 * Create a new user
 *
 * Super Admin: can create any user (including Super Admins)
 * Regular User: can only create users in own société (cannot create Super Admins)
 *
 * Body:
 * {
 *   "email": "user@example.com",
 *   "name": "John Doe",
 *   "password": "Password123",
 *   "roleId": 2,
 *   "societeId": 1,           // Required for non-Super Admins
 *   "isSuperAdmin": false,    // Optional, default false
 *   "profile": "...",         // Optional
 *   "active": true,           // Optional, default true
 *   "extraPermissionIds": [], // Optional
 *   "removedPermissionIds": [] // Optional
 * }
 *
 * Permission: manage_users
 */
router.post(
  "/",
  hasPermission("manage_users"),
  uploadProfileImage,
  createUserValidator,
  resizeImage,
  UserController.createUser,
);

/**
 * PUT /api/users/:id
 *
 * Update user
 *
 * Super Admin: can update any user
 * Regular User: can only update users from own société
 *   - Cannot change isSuperAdmin status
 *   - Cannot move users to another société
 *
 * Body: (all optional)
 * {
 *   "email": "newemail@example.com",
 *   "name": "New Name",
 *   "roleId": 3,
 *   "societeId": 2,
 *   "isSuperAdmin": false,
 *   "profile": "...",
 *   "active": true,
 *   "extraPermissionIds": [1, 2, 3],
 *   "removedPermissionIds": [4, 5]
 * }
 *
 * Permission: manage_users
 */
router.put(
  "/:id",
  hasPermission("manage_users"),
  uploadProfileImage,
  userIdValidator,
  updateUserValidator,
  resizeImage,
  UserController.updateUser,
);

/**
 * DELETE /api/users/:id
 *
 * Permanently delete user (hard delete)
 *
 * ⚠️ Super Admin ONLY
 * ⚠️ Cannot delete self
 * ⚠️ Use deactivate for soft delete
 *
 * Cascades to:
 * - UserExtraPermission
 * - UserRemovedPermission
 */
router.delete(
  "/:id",
  superAdminOnly,
  userIdValidator,
  UserController.deleteUser,
);

export default router;
