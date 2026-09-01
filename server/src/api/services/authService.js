import bcrypt from "bcryptjs";
import prisma from "../../loaders/prisma.js";
import jwt from "jsonwebtoken";
import ApiError from "../utils/apiError.js";
import { signAccessToken, signRefreshToken } from "../utils/token.js";

// =======================
// SIGN UP (UPDATED)
// =======================
/**
 * Register new user
 *
 * Changes:
 * - Super admin can create user for any société
 * - Regular signup creates user for default société
 * - Can optionally specify societeId (admin only)
 */
//------------------------------------------------------------------SuperAdmin------------------------------------------------------------------
export const registerUser = async (
  { name, email, password, societeId, roleId },
  createdBy = null,
) => {
  // Check if email already exists
  const existingUser = await prisma.user.findUnique({
    where: { email },
  });

  if (existingUser) {
    throw new ApiError("Email already exists", 409);
  }

  // Determine société
  let finalSocieteId = societeId;

  // If no societeId provided, use default société
  if (!finalSocieteId) {
    const defaultSociete = await prisma.societe.findFirst({
      // where: { active: true },
      orderBy: { createdAt: "asc" },
    });

    if (!defaultSociete) {
      throw new ApiError(
        "No active société found. Please contact administrator.",
        500,
      );
    }

    finalSocieteId = defaultSociete.id;
  }

  // Verify société exists
  const societe = await prisma.societe.findUnique({
    where: { id: finalSocieteId },
  });

  if (!societe) {
    throw new ApiError("Société not found", 404);
  }

  // Determine role
  let finalRoleId = roleId;

  if (!finalRoleId) {
    // Default role - find "user" or "caissier" role
    const defaultRole = await prisma.role.findFirst({
      where: {
        name: {
          in: ["Caissier", "Societe_Admin", "Gerant"],
        },
      },
      orderBy: { id: "asc" },
    });

    if (!defaultRole) {
      throw new ApiError("No default role found", 500);
    }

    finalRoleId = defaultRole.id;
  }

  // Resolve target role so we know whether to provision a Delivery record
  const targetRole = await prisma.role.findUnique({
    where: { id: finalRoleId },
    select: { id: true, name: true },
  });
  if (!targetRole) {
    throw new ApiError("Role not found", 404);
  }

  // Create user (+ linked INTERN Delivery when role = Livreur) atomically
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        roleId: finalRoleId,
        societeId: finalSocieteId,
        isSuperAdmin: false,
      },
      include: {
        role: { select: { id: true, name: true } },
        societe: { select: { id: true, raisonSocial: true, logo: true } },
      },
    });

    if (targetRole.name === "Livreur") {
      await tx.delivery.create({
        data: {
          societeId: finalSocieteId,
          userId: created.id,
          name: created.name,
          type: "INTERN",
        },
      });
    }

    return created;
  });

  return user;
};

// =======================
// LOGIN (UPDATED)
// =======================
/**
 * Login user and return tokens
 *
 * Changes:
 * - Includes societeId and isSuperAdmin in token
 * - Returns société info in user object
 * - Builds permissions correctly
 */
export const loginUser = async ({ email, password }) => {
  // Get user with all relations
  const user = await prisma.user.findUnique({
    where: { email },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: { permission: true },
          },
        },
      },
      societe: {
        select: {
          id: true,
          raisonSocial: true,
          logo: true,
          ice: true,
          address: true,
          fixedStructure: true,
        },
      },
      extraPermissions: {
        include: { permission: true },
      },
      removedPermissions: {
        include: { permission: true },
      },
    },
  });

  if (!user) {
    throw new ApiError("Invalid credentials", 401);
  }

  if (!user.active) {
    throw new ApiError("your account deactivated call the administration", 401);
  }

  // Verify password
  const isValid = await bcrypt.compare(password, user.password);
  if (!isValid) {
    throw new ApiError("Invalid credentials", 401);
  }

  // Check if user's société is active (if not super admin)
  if (!user.isSuperAdmin && user.societeId) {
    const societe = await prisma.societe.findUnique({
      where: { id: user.societeId },
      // select: { active: true },
    });

    if (!societe) {
      //|| !societe.active
      throw new ApiError(
        "Your société is inactive. Please contact administrator.",
        403,
      );
    }
  }

  // Build permissions
  const permissions = buildUserPermissions(user);

  // Generate tokens with société context
  const accessToken = signAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role.name,
    roleId: user.roleId,
    societeId: user.societeId, // ⭐ CRITICAL - Include in token
    isSuperAdmin: user.isSuperAdmin, // ⭐ CRITICAL - Include in token
  });

  const refreshToken = signRefreshToken({
    userId: user.id,
    societeId: user.societeId, // Include for token refresh
  });

  // Return user info
  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      roleId: user.roleId,
      role: user.role.name,
      societeId: user.societeId,
      isSuperAdmin: user.isSuperAdmin,
      societe: user.societe,
      permissions,
    },
  };
};

// =======================
// REFRESH TOKEN (UPDATED)
// =======================
/**
 * Refresh access token
 *
 * Changes:
 * - Includes societeId and isSuperAdmin in new token
 */
export const refreshTokenService = async (req) => {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    throw new ApiError("Unauthorized - No refresh token", 401);
  }

  // Verify refresh token
  let payload;
  try {
    payload = jwt.verify(refreshToken, process.env.REFRESH_TOKEN_SECRET);
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      throw new ApiError("Refresh token expired. Please login again.", 401);
    }
    throw new ApiError("Invalid refresh token", 401);
  }

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: { permission: true },
          },
        },
      },
      societe: {
        select: {
          id: true,
          raisonSocial: true,
          logo: true,
          ice: true,
          address: true,
          fixedStructure: true,
        },
      },
      extraPermissions: {
        include: { permission: true },
      },
      removedPermissions: {
        include: { permission: true },
      },
    },
  });

  if (!user) {
    throw new ApiError("User not found", 401);
  }

  // Check if société is still active
  // if (!user.isSuperAdmin && user.societe && !user.societe.active) {
  //   throw new ApiError(
  //     "Your société is inactive. Please contact administrator.",
  //     403,
  //   );
  // }
  const permissions = buildUserPermissions(user);
  // Generate new access token with société context
  const newAccessToken = signAccessToken({
    userId: user.id,
    email: user.email,
    role: user.role.name,
    roleId: user.roleId,
    societeId: user.societeId, // ⭐ Include société
    isSuperAdmin: user.isSuperAdmin, // ⭐ Include flag
  });

  return {
    newAccessToken,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      roleId: user.roleId,
      role: user.role.name,
      societeId: user.societeId,
      isSuperAdmin: user.isSuperAdmin,
      isSocieteAdmin: user.role.name === "Societe_Admin",
      societe: user.societe,
      permissions,
    },
  };
};

// =======================
// BUILD USER PERMISSIONS
// =======================
/**
 * Build final permission list for user
 *
 * Logic:
 * 1. Super Admin gets all permissions
 * 2. Regular users: (role permissions + extra) - removed
 */
const buildUserPermissions = (user) => {
  // Super admin gets all permissions
  if (user.isSuperAdmin) {
    return ["*"]; // Wildcard - has all permissions
  }

  // Admin role shortcut (if you want admins to have all permissions)
  if (user.role.name === "Societe_Admin") {
    return user.role.rolePermissions.map((rp) => rp.permission.name); //user.role.rolePermissions=['socite_admin']
  }

  // 1. Get role permissions
  const rolePermissions = user.role.rolePermissions.map(
    (rp) => rp.permission.name,
  );

  // 2. Get extra permissions (user-specific additions)
  const extraPermissions = user.extraPermissions.map(
    (up) => up.permission.name,
  );

  // 3. Get removed permissions (user-specific removals)
  const removedPermissions = user.removedPermissions.map(
    (up) => up.permission.name,
  );

  // 4. Merge role + extra, then remove
  const finalPermissions = [
    ...new Set([...rolePermissions, ...extraPermissions]),
  ].filter((permission) => !removedPermissions.includes(permission));

  return finalPermissions;
};

// =======================
// CREATE USER (Admin Action)
// =======================
/**
 * Create user for specific société (admin action)
 *
 * Use this when:
 * - Super admin creates user for any société
 * - Société admin creates user for their société
 */
export const createUserForSociete = async (userData, createdBy) => {
  const { name, email, password, societeId, roleId } = userData;

  // Verify creator is authorized
  const creator = await prisma.user.findUnique({
    where: { id: createdBy },
    select: {
      isSuperAdmin: true,
      societeId: true,
    },
  });

  if (!creator) {
    throw new ApiError("Creator not found", 404);
  }

  // Super admin can create for any société
  // Regular admin can only create for their société
  if (!creator.isSuperAdmin && creator.societeId !== societeId) {
    throw new ApiError("You can only create users for your own société", 403);
  }

  // Create user
  return registerUser({ name, email, password, societeId, roleId }, createdBy);
};

// =======================
// GET USER WITH SOCIÉTÉ CONTEXT
// =======================
/**
 * Get user with full société context
 * Used by authMiddleware
 */
export const getUserWithContext = async (userId) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      name: true,
      roleId: true,
      societeId: true,
      isSuperAdmin: true,
      societe: {
        select: {
          id: true,
          raisonSocial: true,
          logo: true,
          fixedStructure: true,
        },
      },
      role: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return user;
};

// =======================
// VERIFY PASSWORD
// =======================
/**
 * Verify user password (for sensitive operations)
 */
export const verifyPassword = async (userId, password) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { password: true },
  });

  if (!user) {
    throw new ApiError("User not found", 404);
  }

  const isValid = await bcrypt.compare(password, user.password);

  if (!isValid) {
    throw new ApiError("Invalid password", 401);
  }

  return true;
};

// =======================
// CHANGE PASSWORD
// =======================
/**
 * Change user password
 */
export const changePassword = async (userId, oldPassword, newPassword) => {
  // Verify old password
  await verifyPassword(userId, oldPassword);

  // Hash new password
  const hashedPassword = await bcrypt.hash(newPassword, 10);

  // Update password
  await prisma.user.update({
    where: { id: userId },
    data: { password: hashedPassword },
  });

  return true;
};
