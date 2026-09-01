import ApiError from "../utils/apiError.js";
import prisma from "../../loaders/prisma.js";
/**
 * ========================================
 * SOCIÉTÉ FILTER MIDDLEWARE (CRITICAL ⭐)
 * ========================================
 *
 * Automatically filters data by société based on user role:
 * - Super Admin: Can optionally filter by query.societeId (context switching)
 * - Regular User: Always filtered by user.societeId (no context switch)
 *
 * This middleware should be applied to all société-scoped routes.
 *
 * Usage:
 * router.use(auth);
 * router.use(societyFilter);
 * router.get('/', controller.getAll);
 */

/**
 * Main Société Filter
 * Allows super admin to switch context via query param
 */
export const societyFilter = async (req, res, next) => {
  try {
    const user = req.user;
    // User must be authenticated
    if (!user) {
      throw new ApiError("User not authenticated", 401);
    }

    // ============================================
    // SUPER ADMIN - Can switch context
    // ============================================
    if (user.isSuperAdmin) {
      // Can optionally filter by query.societeId
      // If not provided, req.societeId = null (all sociétés)
      if (req.query?.societeId || req.body?.societeId) {
        req.societeId =
          parseInt(req.query.societeId) || parseInt(req.body.societeId);
        const societe = await prisma.societe.findUnique({
          where: { id: req.societeId },
        });

        if (!societe) {
          throw new ApiError(`Société with ID ${req.societeId} not found`, 404);
        }
      } else {
        // No filter - see all sociétés
        req.societeId = null;
      }

      // Remove from query to avoid duplicate filtering
      delete req.query.societeId;

      return next();
    }

    // ============================================
    // REGULAR USER - Must have société
    // ============================================
    if (!user.societeId) {
      throw new ApiError(
        "User must belong to a société. Please contact administrator.",
        403,
      );
    }

    // Force user's société (cannot be overridden)
    req.societeId = user.societeId;
    // Remove any société filter attempts from query
    delete req.query.societeId;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Strict Société Filter
 * Even super admin must provide societeId (no context switching allowed)
 * Use for sensitive operations like payments, financial reports
 */
export const strictSocietyFilter = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user) {
      throw new ApiError("User not authenticated", 401);
    }

    // Super admin must provide societeId
    if (user.isSuperAdmin) {
      if (
        !req.query.societeId &&
        !req.body.societeId &&
        !req.params.societeId
      ) {
        throw new ApiError("SocieteId is required for this operation", 400);
      }

      req.societeId = parseInt(
        req.query.societeId || req.body.societeId || req.params.societeId,
      );
    } else {
      // Regular user: use their société
      if (!user.societeId) {
        throw new ApiError("User must belong to a société", 403);
      }

      req.societeId = user.societeId;
    }

    // Remove from query/body/params
    delete req.query.societeId;
    delete req.body.societeId;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Optional Société Filter
 * Adds req.societeId if user has one, but doesn't enforce it
 * Use for global resources that can be filtered by société
 */
export const optionalSocietyFilter = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user) {
      return next();
    }

    if (user.isSuperAdmin) {
      req.societeId = req.query.societeId
        ? parseInt(req.query.societeId)
        : null;
    } else {
      req.societeId = user.societeId || null;
    }

    delete req.query.societeId;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Société Owner Check
 * Verifies that a resource (client, document, etc.) belongs to user's société
 * Use as route-specific middleware
 */
export const verifySocietyOwnership = (model, idParam = "id") => {
  return async (req, res, next) => {
    try {
      const user = req.user;
      const resourceId = parseInt(req.params[idParam]);

      if (!resourceId) {
        throw new ApiError(`Parameter ${idParam} is required`, 400);
      }

      // Get resource
      const resource = await prisma[model].findUnique({
        where: { id: resourceId },
        select: { societeId: true },
      });

      await prisma.$disconnect();

      if (!resource) {
        throw new ApiError(`${model} not found`, 404);
      }

      // Super admin can access any
      if (user.isSuperAdmin) {
        return next();
      }

      // Regular user: must match société
      if (resource.societeId !== user.societeId) {
        throw new ApiError(
          `Access denied. This ${model} belongs to another société.`,
          403,
        );
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};

export default societyFilter;
