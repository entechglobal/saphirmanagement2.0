import ApiError from "../utils/apiError.js";
import prisma from "../../loaders/prisma.js";
/**
 * ========================================
 * SUPER ADMIN MIDDLEWARE
 * ========================================
 *
 * Restricts access to super admin only.
 * Use for sensitive operations like:
 * - Creating/deleting sociétés
 * - Viewing global statistics
 * - System configuration
 * - User management across sociétés
 *
 * Usage:
 * router.post('/societes', auth, superAdminOnly, controller.create);
 */

/**
 * Super Admin Only
 * Blocks access for non-super-admin users
 */
export const superAdminOnly = (req, res, next) => {
  try {
    const user = req.user;

    if (!user) {
      throw new ApiError("User not authenticated", 401);
    }

    if (!user.isSuperAdmin) {
      throw new ApiError(
        "Access denied. This action requires super admin privileges.",
        403,
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Super Admin or Société Admin
 * Allows both super admin and société admin to access
 * Use for société-level management operations
 */
export const adminOnly = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user) {
      throw new ApiError("User not authenticated", 401);
    }

    // Super admin always allowed
    if (user.isSuperAdmin) {
      return next();
    }

    // Check if user has admin role for their sociéte

    const userWithRole = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        role: {
          select: {
            name: true,
          },
        },
      },
    });

    if (!userWithRole) {
      throw new ApiError("User not found", 404);
    }

    // Check if user is admin (you can customize role names)
    const adminRoles = ["Super_Admin", "Societe_Admin"];
    if (!adminRoles.includes(userWithRole.role.name)) {
      throw new ApiError(
        "Access denied. This action requires admin privileges.",
        403,
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Not Super Admin
 * Blocks super admin from accessing (for testing société-user perspective)
 * Use in development/testing
 */
export const notSuperAdmin = (req, res, next) => {
  try {
    const user = req.user;

    if (!user) {
      throw new ApiError("User not authenticated", 401);
    }

    if (user.isSuperAdmin) {
      throw new ApiError(
        "Access denied. Super admin cannot access this endpoint.",
        403,
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Require Société
 * Ensures user belongs to a société (not super admin)
 * Use when operation requires société context
 */
export const requireSociete = (req, res, next) => {
  try {
    const user = req.user;

    if (!user) {
      throw new ApiError("User not authenticated", 401);
    }

    if (user.isSuperAdmin) {
      throw new ApiError(
        "This operation requires a société context. Please select a société.",
        400,
      );
    }

    if (!user.societeId) {
      throw new ApiError(
        "User must belong to a société to perform this operation.",
        403,
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

export default superAdminOnly;
