import { Router } from "express";
import {
  signup,
  login,
  logout,
  refresh,
  getCurrentUser,
  createUser,
  updatePassword,
  verifyToken,
} from "../controllers/authController.js";
import { auth } from "../middlewares/authMiddleware.js";
import { hasPermission } from "../middlewares/rbacMiddleware.js";
import {
  signupValidator,
  loginValidator,
  changePasswordValidator,
  createUserValidator,
} from "../validations/authValidation.js";

const router = Router();

// ============================================
// PUBLIC ROUTES (No Authentication Required)
// ============================================

/**
 * User Signup
 * Creates user for default société
 *
 * POST /api/auth/signup
 * Body: { name, email, password }
 */
router.post("/signup", signupValidator, signup);

/**
 * User Login
 * Returns tokens and user info with société context
 *
 * POST /api/auth/login
 * Body: { email, password }
 */
router.post("/login", loginValidator, login);

/**
 * Refresh Access Token
 * Uses refresh token from cookie
 *
 * POST /api/auth/refresh
 */
router.post("/refresh", refresh);

// ============================================
// AUTHENTICATED ROUTES (Require Authentication)
// ============================================

/**
 * Logout
 * Clears authentication cookies
 *
 * POST /api/auth/logout
 */
router.post("/logout", auth, logout);

/**
 * Get Current User
 * Returns authenticated user info with société context
 *
 * GET /api/auth/me
 */
router.get("/me", auth, getCurrentUser);

/**
 * Verify Token
 * Check if current access token is valid
 *
 * GET /api/auth/verify
 */
router.get("/verify", auth, verifyToken);

/**
 * Change Password
 * User changes their own password
 *
 * POST /api/auth/change-password
 * Body: { oldPassword, newPassword }
 */
router.post("/change-password", auth, changePasswordValidator, updatePassword);

// ============================================
// ADMIN ROUTES (Require Admin Permission)
// ============================================

/**
 * Create User (Admin Action)
 * Super admin or société admin creates user
 *
 * POST /api/auth/create-user
 * Body: { name, email, password, societeId, roleId }
 *
 * Authorization:
 * - Super admin: can create for any société
 * - Société admin: can create only for their société
 */
router.post(
  "/create-user",
  auth,
  hasPermission("create_user"),
  createUserValidator,
  createUser,
);

export default router;
