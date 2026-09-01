import ApiError from "../utils/apiError.js";
import prisma from "../../loaders/prisma.js";

/**
 * ========================================
 * RBAC MIDDLEWARE (UPDATED for Multi-Société)
 * ========================================
 *
 * Role-Based Access Control with société context
 *
 * Changes from original:
 * - Super admin bypasses all permission checks
 * - Regular users checked against their role permissions
 * - Société context considered for resource access
 *
 * Permissions are cached per request to avoid multiple DB queries
 */

/**
 * Check if user has permission
 * @param {string} permissionName - Permission to check (e.g., "create_client")
 */
export const hasPermission = (permissionName) => {
  return async (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        throw new ApiError("User not authenticated", 401);
      }

      // Super admin has all permissions
      if (user.isSuperAdmin) {
        return next();
      }
      // if (user.roleName === "Societe_Admin") {
      //   return next();
      // }

      // Get user permissions (with caching)
      if (!req.userPermissions) {
        req.userPermissions = await getUserPermissions(user.id);
      }

      // Check if user has the required permission
      const hasAccess = req.userPermissions.includes(permissionName);

      if (!hasAccess) {
        throw new ApiError(
          `Access denied. Required permission: ${permissionName}`,
          403,
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Check if user has any of the permissions
 * @param {string[]} permissionNames - Array of permissions
 */
export const hasAnyPermission = (permissionNames) => {
  return async (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        throw new ApiError("User not authenticated", 401);
      }
      // Super admin has all permissions
      if (user.isSuperAdmin) {
        return next();
      }

      // Get user permissions
      if (!req.userPermissions) {
        req.userPermissions = await getUserPermissions(user.id);
      }

      // Check if user has any of the required permissions
      const hasAccess = permissionNames.some((permission) =>
        req.userPermissions.includes(permission),
      );

      if (!hasAccess) {
        throw new ApiError(
          `Access denied. Required permissions: ${permissionNames.join(" OR ")}`,
          403,
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Check if user has all permissions
 * @param {string[]} permissionNames - Array of permissions
 */
export const hasAllPermissions = (permissionNames) => {
  return async (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        throw new ApiError("User not authenticated", 401);
      }

      // Super admin has all permissions
      if (user.isSuperAdmin) {
        return next();
      }

      // Get user permissions
      if (!req.userPermissions) {
        req.userPermissions = await getUserPermissions(user.id);
      }

      // Check if user has all required permissions
      const hasAccess = permissionNames.every((permission) =>
        req.userPermissions.includes(permission),
      );

      if (!hasAccess) {
        throw new ApiError(
          `Access denied. Required permissions: ${permissionNames.join(" AND ")}`,
          403,
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Check if user has specific role
 * @param {string[]} roleNames - Array of allowed role names
 */
export const hasRole = (roleNames) => {
  return async (req, res, next) => {
    try {
      const user = req.user;

      if (!user) {
        throw new ApiError("User not authenticated", 401);
      }

      // Super admin bypasses role check
      if (user.isSuperAdmin) {
        return next();
      }

      // Get user role
      const userRole = await prisma.user.findUnique({
        where: { id: user.id },
        include: {
          role: {
            select: { name: true },
          },
        },
      });

      if (!userRole) {
        throw new ApiError("User not found", 404);
      }

      // Check if user role is in allowed roles
      const hasAccess = roleNames.includes(userRole.role.name.toLowerCase());

      if (!hasAccess) {
        throw new ApiError(
          `Access denied. Required roles: ${roleNames.join(" OR ")}`,
          403,
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Resource Owner Check
 * Verifies user owns the resource (e.g., can only edit own profile)
 * @param {string} resourceIdParam - Request param containing resource ID
 */
export const isResourceOwner = (resourceIdParam = "id") => {
  return (req, res, next) => {
    try {
      const user = req.user;
      const resourceId = parseInt(req.params[resourceIdParam]);

      if (!user) {
        throw new ApiError("User not authenticated", 401);
      }

      // Super admin can access any resource
      if (user.isSuperAdmin) {
        return next();
      }

      // Check if resource belongs to user
      if (resourceId !== user.id) {
        throw new ApiError(
          "Access denied. You can only access your own resources.",
          403,
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Société Scope Check
 * Ensures user can only perform actions within their société
 * Use in combination with societyFilter middleware
 */
export const societyScoped = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user) {
      throw new ApiError("User not authenticated", 401);
    }

    // Super admin can access any société
    if (user.isSuperAdmin) {
      return next();
    }

    // Regular user must have société
    if (!user.societeId) {
      throw new ApiError("User must belong to a société", 403);
    }

    // If req.societeId is set (by route or body), verify it matches user's société
    const targetSocieteId =
      req.params.societeId || req.body.societeId || req.query.societeId;

    if (targetSocieteId && parseInt(targetSocieteId) !== user.societeId) {
      throw new ApiError(
        "Access denied. You can only access resources within your société.",
        403,
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Get all permissions for a user
 * Includes role permissions + extra permissions - removed permissions
 */
async function getUserPermissions(userId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      role: {
        include: {
          rolePermissions: {
            include: {
              permission: true,
            },
          },
        },
      },
      extraPermissions: {
        include: {
          permission: true,
        },
      },
      removedPermissions: {
        include: {
          permission: true,
        },
      },
    },
  });

  if (!user) {
    return [];
  }

  // Get role permissions
  const rolePermissions = user.role.rolePermissions.map(
    (rp) => rp.permission.name,
  );

  // Get extra permissions
  const extraPermissions = user.extraPermissions.map(
    (ep) => ep.permission.name,
  );

  // Get removed permissions
  const removedPermissions = user.removedPermissions.map(
    (rp) => rp.permission.name,
  );

  // Combine: (role + extra) - removed
  const allPermissions = [
    ...new Set([...rolePermissions, ...extraPermissions]),
  ];

  return allPermissions.filter((perm) => !removedPermissions.includes(perm));
}

/**
 * Check if user can access resource in specific société
 */
export async function canAccessSocieteResource(userId, resourceSocieteId) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      isSuperAdmin: true,
      societeId: true,
    },
  });

  if (!user) {
    return false;
  }

  // Super admin can access any société
  if (user.isSuperAdmin) {
    return true;
  }

  // Regular user: must match société
  return user.societeId === resourceSocieteId;
}

export default hasPermission;
