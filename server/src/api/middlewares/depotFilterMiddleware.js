import ApiError from "../utils/apiError.js";
import prisma from "../../loaders/prisma.js";

/**
 * ========================================
 * DÉPÔT FILTER MIDDLEWARE
 * ========================================
 *
 * Ensures that depot belongs to user's société before allowing operations.
 * Prevents users from accessing/modifying depots of other sociétés.
 *
 * Usage:
 * router.post('/transfer', auth, societyFilter, depotFilter, controller.transfer);
 */

/**
 * Depot Filter - Validates depot ownership
 * Checks depotId from params, body, or query
 */
export const depotFilter = async (req, res, next) => {
  try {
    // Extract depotId from various sources
    const depotId = req.params.depotId || req.body.depotId || req.query.depotId;

    // If no depotId, skip validation
    if (!depotId) {
      return next();
    }

    const id = parseInt(depotId);

    // Get depot
    const depot = await prisma.depot.findUnique({
      where: { id },
      select: {
        id: true,
        societeId: true,
        name: true,
        code: true,
        active: true,
      },
    });

    if (!depot) {
      throw new ApiError("Depot not found", 404);
    }

    // Check if depot is active
    if (!depot.active) {
      throw new ApiError("This depot is inactive", 400);
    }

    // Super admin can access any depot
    if (req.user.isSuperAdmin) {
      req.depot = depot;
      return next();
    }

    // Regular user: depot must belong to their société
    if (depot.societeId !== req.user.societeId) {
      throw new ApiError(
        "Access denied. This depot belongs to another société.",
        403,
      );
    }

    // Attach depot info to request
    req.depot = depot;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Multiple Depots Filter
 * Validates that all depots (from array) belong to user's société
 * Use for bulk operations or transfers between depots
 */
export const multipleDepotsFilter = async (req, res, next) => {
  try {
    // Extract depot IDs from body
    const depotIds = req.body.depotIds || [];

    if (!Array.isArray(depotIds) || depotIds.length === 0) {
      throw new ApiError("depotIds array is required", 400);
    }

    // Convert to integers
    const ids = depotIds.map((id) => parseInt(id));

    // Get all depots
    const depots = await prisma.depot.findMany({
      where: {
        id: { in: ids },
      },
      select: {
        id: true,
        societeId: true,
        name: true,
        active: true,
      },
    });

    // Check if all depots exist
    if (depots.length !== ids.length) {
      throw new ApiError("One or more depots not found", 404);
    }

    // Check if all depots are active
    const inactiveDepot = depots.find((d) => !d.active);
    if (inactiveDepot) {
      throw new ApiError(`Depot ${inactiveDepot.name} is inactive`, 400);
    }

    // Super admin can access any depots
    if (req.user.isSuperAdmin) {
      req.depots = depots;
      return next();
    }

    // Regular user: all depots must belong to their société
    const invalidDepot = depots.find((d) => d.societeId !== req.user.societeId);
    if (invalidDepot) {
      throw new ApiError(
        `Access denied. Depot ${invalidDepot.name} belongs to another société.`,
        403,
      );
    }

    req.depots = depots;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Transfer Depots Filter
 * Special validation for stock transfers between two depots
 * Ensures both depots belong to same société
 */
export const transferDepotsFilter = async (req, res, next) => {
  try {
    const { fromDepotId, toDepotId } = req.body;

    if (!fromDepotId || !toDepotId) {
      throw new ApiError("fromDepotId and toDepotId are required", 400);
    }

    if (fromDepotId === toDepotId) {
      throw new ApiError("Cannot transfer to the same depot", 400);
    }

    // Get both depots
    const depots = await prisma.depot.findMany({
      where: {
        id: { in: [parseInt(fromDepotId), parseInt(toDepotId)] },
      },
      select: {
        id: true,
        societeId: true,
        name: true,
        code: true,
        active: true,
      },
    });

    if (depots.length !== 2) {
      throw new ApiError("One or both depots not found", 404);
    }

    // Check if both are active
    const inactiveDepot = depots.find((d) => !d.active);
    if (inactiveDepot) {
      throw new ApiError(`Depot ${inactiveDepot.name} is inactive`, 400);
    }

    const fromDepot = depots.find((d) => d.id === parseInt(fromDepotId));
    const toDepot = depots.find((d) => d.id === parseInt(toDepotId));

    // Super admin: can transfer between any depots of same société
    if (req.user.isSuperAdmin) {
      // Still must be same société
      if (fromDepot.societeId !== toDepot.societeId) {
        throw new ApiError(
          "Cannot transfer stock between depots of different sociétés",
          400,
        );
      }

      req.fromDepot = fromDepot;
      req.toDepot = toDepot;
      return next();
    }

    // Regular user: both depots must belong to their société
    if (fromDepot.societeId !== req.user.societeId) {
      throw new ApiError(
        `Access denied. Source depot ${fromDepot.name} belongs to another société.`,
        403,
      );
    }

    if (toDepot.societeId !== req.user.societeId) {
      throw new ApiError(
        `Access denied. Destination depot ${toDepot.name} belongs to another société.`,
        403,
      );
    }

    // Both must be same société
    if (fromDepot.societeId !== toDepot.societeId) {
      throw new ApiError(
        "Cannot transfer stock between depots of different sociétés",
        400,
      );
    }

    req.fromDepot = fromDepot;
    req.toDepot = toDepot;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Depot Société Match Filter
 * Ensures depot matches the req.societeId (set by societyFilter)
 * Use in combination with societyFilter
 */
export const depotSocieteMatch = async (req, res, next) => {
  try {
    const depotId = req.params.depotId || req.body.depotId;

    if (!depotId) {
      throw new ApiError("depotId is required", 400);
    }

    const depot = await prisma.depot.findUnique({
      where: { id: parseInt(depotId) },
      select: { societeId: true, name: true },
    });

    if (!depot) {
      throw new ApiError("Depot not found", 404);
    }

    // If req.societeId is set (by societyFilter), verify match
    if (req.societeId && depot.societeId !== req.societeId) {
      throw new ApiError(
        `Depot ${depot.name} does not belong to the selected société`,
        400,
      );
    }

    next();
  } catch (error) {
    next(error);
  }
};

export default depotFilter;
