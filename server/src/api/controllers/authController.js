import {
  registerUser,
  loginUser,
  refreshTokenService,
  createUserForSociete,
  changePassword,
} from "../services/authService.js";
import asyncHandler from "express-async-handler";

// =======================
// SIGNUP (UPDATED)
// =======================
/**
 * Public signup endpoint
 * Creates user for default société
 *
 * POST /api/auth/signup
 * Body: { name, email, password }
 */
export const signup = asyncHandler(async (req, res) => {
  const user = await registerUser(req.body);

  res.status(201).json({
    message: "User registered successfully",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      roleId: user.roleId,
      role: user.role.name,
      societeId: user.societeId,
      societe: user.societe,
    },
  });
});

// =======================
// LOGIN (UPDATED)
// =======================
/**
 * Login endpoint
 * Returns tokens and user info with société context
 *
 * POST /api/auth/login
 * Body: { email, password }
 */
export const login = asyncHandler(async (req, res) => {
  const { accessToken, refreshToken, user } = await loginUser(req.body);

  // Set refresh token ONLY
  res.cookie("refreshToken", refreshToken, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "api/auth/refresh",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });

  // Send access token in response body
  res.status(200).json({
    message: "Login successful",
    token: accessToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      roleId: user.roleId,
      role: user.role,
      societeId: user.societeId,
      isSuperAdmin: user.isSuperAdmin,
      societe: user.societe,
      permissions: user.permissions,
    },
  });
});

// =======================
// REFRESH TOKEN (UPDATED)
// =======================
/**
 * Refresh access token
 *
 * POST /api/auth/refresh
 */
export const refresh = asyncHandler(async (req, res) => {
  const result = await refreshTokenService(req);

  res.status(200).json({
    message: "Token refreshed successfully",
    token: result.newAccessToken,
    user: result.user,
  });
});

// =======================
// LOGOUT
// =======================
/**
 * Logout user
 * Clears cookies
 *
 * POST /api/auth/logout
 */
export const logout = asyncHandler(async (req, res) => {
  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  };

  res.clearCookie("accessToken", cookieOptions);
  res.clearCookie("refreshToken", {
    ...cookieOptions,
    path: "api/auth/refresh",
  });

  res.status(200).json({
    message: "Logged out successfully",
  });
});

// =======================
// GET CURRENT USER (NEW)
// =======================
/**
 * Get current authenticated user info
 *
 * GET /api/auth/me
 * Requires: auth middleware
 */
export const getCurrentUser = asyncHandler(async (req, res) => {
  const user = req.user; // Set by auth middleware

  res.status(200).json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      roleId: user.roleId,
      roleName: user.roleName,
      societeId: user.societeId,
      isSuperAdmin: user.isSuperAdmin,
      isSocieteAdmin: user.roleName === "Societe_Admin",
      societe: user.societe,
    },
  });
});

// =======================
// CREATE USER (Admin Action) (NEW)
// =======================
/**
 * Create user for specific société
 * Requires: auth + admin permission
 *
 * POST /api/auth/create-user
 * Body: { name, email, password, societeId, roleId }
 */
export const createUser = asyncHandler(async (req, res) => {
  const createdBy = req.user.id;

  const user = await createUserForSociete(req.body, createdBy);

  res.status(201).json({
    message: "User created successfully",
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      roleId: user.roleId,
      role: user.role.name,
      societeId: user.societeId,
      societe: user.societe,
    },
  });
});

// =======================
// CHANGE PASSWORD (NEW)
// =======================
/**
 * Change user password
 * Requires: auth middleware
 *
 * POST /api/auth/change-password
 * Body: { oldPassword, newPassword }
 */
export const updatePassword = asyncHandler(async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.user.id;

  await changePassword(userId, oldPassword, newPassword);

  res.status(200).json({
    message: "Password changed successfully",
  });
});

// =======================
// VERIFY TOKEN (NEW)
// =======================
/**
 * Verify if access token is still valid
 * Used by frontend to check auth status
 *
 * GET /api/auth/verify
 * Requires: auth middleware
 */
export const verifyToken = asyncHandler(async (req, res) => {
  // If we reach here, token is valid (auth middleware passed)
  res.status(200).json({
    valid: true,
    user: {
      id: req.user.id,
      email: req.user.email,
      societeId: req.user.societeId,
      isSuperAdmin: req.user.isSuperAdmin,
    },
  });
});
