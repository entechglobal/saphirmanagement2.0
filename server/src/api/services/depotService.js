import prisma from "../../loaders/prisma.js";
import ApiError from "../utils/apiError.js";
import ApiFeatures from "../utils/apiFeatures.js";
import { buildImageUrl } from "../utils/buildImageUrl.js";

// ============================================
// GET ALL DÉPÔTS
// ============================================
/**
 * Get all dépôts with pagination, search, and filtering
 * Super admin: can see all dépôts across all sociétés
 * Regular user: only their société's dépôts
 */

export const getAll = async (query, societeId = null) => {
  const where = {};

  if (societeId) {
    where.societeId = societeId;
  }

  if (query.active !== undefined) {
    where.active = query.active === "true";
  }

  if (query.type) {
    where.type = query.type;
  }

  if (query.keyword) {
    where.OR = [
      { code: { contains: query.keyword, mode: "insensitive" } },
      { name: { contains: query.keyword, mode: "insensitive" } },
      { city: { contains: query.keyword, mode: "insensitive" } },
    ];
  }

  const count = await prisma.depot.count({ where });

  const apiFeatures = new ApiFeatures(query).sort().paginate(count);

  const depots = await prisma.depot.findMany({
    ...apiFeatures.build(),
    where,
    include: {
      societe: {
        select: {
          id: true,
          raisonSocial: true,
          logo: true,
        },
      },
      _count: {
        select: {
          stockByDepot: true,
          stockTransactions: true,
          stockReservations: true,
        },
      },
    },
  });

  // ✅ Add full logo URL
  const formattedDepots = depots.map((depot) => ({
    ...depot,
    societe: depot.societe
      ? {
          ...depot.societe,
          logo: depot.societe.logo
            ? buildImageUrl("societes", depot.societe.logo)
            : null,
        }
      : null,
  }));

  return {
    results: formattedDepots.length,
    pagination: apiFeatures.paginationResult,
    data: formattedDepots,
  };
};

/**
 * Get dépôt by ID with full details
 */
export const getById = async (id, requestingUser = null) => {
  const depot = await prisma.depot.findUnique({
    where: { id },
    include: {
      societe: {
        select: {
          id: true,
          raisonSocial: true,
          logo: true,
          ice: true,
        },
      },
      _count: {
        select: {
          stockByDepot: true,
          stockTransactions: true,
          stockReservations: true,
        },
      },
    },
  });

  if (!depot) {
    throw new ApiError("Dépôt not found", 404);
  }

  // Authorization check (if requesting user provided)
  if (requestingUser && !requestingUser.isSuperAdmin) {
    if (requestingUser.societeId !== depot.societeId) {
      throw new ApiError(
        "Access denied. This dépôt belongs to another société.",
        403,
      );
    }
  }
  const formattedDepot = {
    ...depot,
    societe: depot.societe
      ? {
          ...depot.societe,
          logo: depot.societe.logo
            ? buildImageUrl("societes", depot.societe.logo)
            : null,
        }
      : null,
  };

  return formattedDepot;
};

// ============================================
// GET DÉPÔTS BY SOCIÉTÉ
// ============================================
/**
 * Get all dépôts for a specific société
 */
export const getBySociete = async (societeId, activeOnly = false) => {
  const where = { societeId };

  if (activeOnly) {
    where.active = true;
  }

  const depots = await prisma.depot.findMany({
    where,
    include: {
      _count: {
        select: {
          stockByDepot: true,
        },
      },
    },
    orderBy: [
      { type: "asc" }, // PRINCIPAL first
      { createdAt: "asc" },
    ],
  });

  return depots;
};

// ============================================
// CREATE DÉPÔT
// ============================================
/**
 * Create new dépôt
 * Auto-generates code if not provided
 */
export const create = async (data, createdBy = null) => {
  // Verify société exists
  if (createdBy.isSuperAdmin && !data.societeId) {
    throw new ApiError(`societeId is required`, 409);
  }
  const societe = await prisma.societe.findUnique({
    where: { id: data.societeId },
  });

  if (!societe) {
    throw new ApiError("Société not found", 404);
  }

  // Check if code already exists in this société
  if (data.code) {
    const existingCode = await prisma.depot.findFirst({
      where: {
        societeId: data.societeId,
        code: data.code,
      },
    });

    if (existingCode) {
      throw new ApiError(
        `Depot code ${data.code} already exists in this société`,
        409,
      );
    }
  } else {
    // Auto-generate code
    data.code = await generateDepotCode(data.societeId);
  }

  // Check if trying to create another PRINCIPAL depot
  if (data.type === "PRINCIPAL") {
    const existingPrincipal = await prisma.depot.findFirst({
      where: {
        societeId: data.societeId,
        type: "PRINCIPAL",
      },
    });

    if (existingPrincipal) {
      throw new ApiError(
        "A PRINCIPAL depot already exists for this société. Consider using SECONDARY type.",
        409,
      );
    }
  }

  // Create dépôt
  const depot = await prisma.depot.create({
    data: {
      code: data.code,
      name: data.name,
      type: data.type || "SECONDARY",
      societeId: data.societeId,
      address: data.address,
      city: data.city,
      region: data.region,
      phone: data.phone,
      email: data.email,
      manager: data.manager,
      capacity: data.capacity,
      surface: data.surface,
      active: true,
    },
    include: {
      societe: {
        select: {
          id: true,
          raisonSocial: true,
        },
      },
    },
  });

  return depot;
};

// ============================================
// UPDATE DÉPÔT
// ============================================
/**
 * Update dépôt information
 */
export const update = async (id, data, requestingUser = null) => {
  // Check if dépôt exists
  const existingDepot = await prisma.depot.findUnique({
    where: { id },
  });

  if (!existingDepot) {
    throw new ApiError("Dépôt not found", 404);
  }

  // Authorization check
  if (requestingUser && !requestingUser.isSuperAdmin) {
    if (requestingUser.societeId !== existingDepot.societeId) {
      throw new ApiError(
        "Access denied. You can only update dépôts in your own société.",
        403,
      );
    }
  }

  if (data.active) {
    data.active = data.active === true || data.active === "true";
  }

  // Update dépôt
  const depot = await prisma.depot.update({
    where: { id },
    data: {
      code: data.code,
      name: data.name,
      type: data.type,
      address: data.address,
      city: data.city,
      region: data.region,
      phone: data.phone,
      email: data.email,
      manager: data.manager,
      capacity: data.capacity,
      surface: data.surface,
      active: data.active,
    },
    include: {
      societe: {
        select: {
          id: true,
          raisonSocial: true,
        },
      },
      _count: {
        select: {
          stockByDepot: true,
        },
      },
    },
  });

  return depot;
};

// ============================================
// DELETE DÉPÔT
// ============================================
/**
 * Delete dépôt (soft delete if has stock, hard delete otherwise)
 */
export const deleteDepot = async (id, requestingUser = null) => {
  const depot = await prisma.depot.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          stockByDepot: true,
          stockTransactions: true,
          stockReservations: true,
        },
      },
    },
  });

  if (!depot) {
    throw new ApiError("Dépôt not found", 404);
  }

  // Authorization check
  if (requestingUser && !requestingUser.isSuperAdmin) {
    if (requestingUser.societeId !== depot.societeId) {
      throw new ApiError(
        "Access denied. You can only delete dépôts in your own société.",
        403,
      );
    }
  }

  // Prevent deletion of PRINCIPAL depot if it's the only one
  if (depot.type === "PRINCIPAL") {
    const depotCount = await prisma.depot.count({
      where: {
        societeId: depot.societeId,
        active: true,
      },
    });

    if (depotCount <= 1) {
      throw new ApiError(
        "Cannot delete the last depot of a société. A société must have at least one depot.",
        400,
      );
    }
  }

  // Check if depot has related data
  const hasRelatedData =
    depot._count.stockByDepot > 0 ||
    depot._count.stockTransactions > 0 ||
    depot._count.stockReservations > 0;

  if (hasRelatedData) {
    throw new ApiError("this depot has related data", 400);
  } else {
    // Hard delete - no related data
    await prisma.depot.delete({
      where: { id },
    });

    return {
      message: "Dépôt deleted successfully",
      softDelete: false,
    };
  }
};

// ============================================
// TOGGLE ACTIVE STATUS
// ============================================
/**
 * Toggle dépôt active status
 */
// export const toggleActive = async (id, active, requestingUser = null) => {
//   const depot = await prisma.depot.findUnique({
//     where: { id },
//   });

//   if (!depot) {
//     throw new ApiError("Dépôt not found", 404);
//   }

//   // Authorization check
//   if (requestingUser && !requestingUser.isSuperAdmin) {
//     if (requestingUser.societeId !== depot.societeId) {
//       throw new ApiError("Access denied.", 403);
//     }
//   }

//   // Prevent deactivating the last active depot
//   if (!active && depot.active) {
//     const activeDepotCount = await prisma.depot.count({
//       where: {
//         societeId: depot.societeId,
//         active: true,
//       },
//     });

//     if (activeDepotCount <= 1) {
//       throw new ApiError(
//         "Cannot deactivate the last active depot. A société must have at least one active depot.",
//         400,
//       );
//     }
//   }

//   const updated = await prisma.depot.update({
//     where: { id },
//     data: { active },
//   });

//   return updated;
// };

// ============================================
// GET DÉPÔT STATISTICS
// ============================================
/**
 * Get detailed statistics for dépôt
 */
export const getStatistics = async (depotId) => {
  const depot = await prisma.depot.findUnique({
    where: { id: depotId },
    include: {
      societe: {
        select: {
          id: true,
          raisonSocial: true,
        },
      },
      _count: {
        select: {
          stockByDepot: true,
          stockTransactions: true,
          stockReservations: true,
        },
      },
    },
  });

  if (!depot) {
    throw new ApiError("Dépôt not found", 404);
  }

  // Get stock summary
  const stockSummary = await prisma.stockByDepot.aggregate({
    where: { depotId },
    _sum: {
      quantityAvailable: true,
      quantityReserved: true,
      quantityInTransit: true,
    },
    _count: true,
  });

  // Get recent transactions (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentTransactions = await prisma.stockTransaction.count({
    where: {
      depotId,
      createdAt: { gte: thirtyDaysAgo },
    },
  });

  // Get active reservations
  const activeReservations = await prisma.stockReservation.count({
    where: {
      depotId,
      status: "PENDING",
    },
  });

  // Calculate utilization if capacity is set
  let utilization = null;
  if (depot.capacity) {
    const totalStock = Number(stockSummary._sum.quantityAvailable || 0);
    utilization = {
      current: totalStock,
      capacity: depot.capacity,
      percentage: `${(totalStock / depot.capacity) * 100}%`,
    };
  }

  return {
    depot: {
      id: depot.id,
      code: depot.code,
      name: depot.name,
      type: depot.type,
      active: depot.active,
      societe: depot.societe,
    },
    stock: {
      uniqueProducts: stockSummary._count,
      totalAvailable: Number(stockSummary._sum.quantityAvailable || 0),
      totalReserved: Number(stockSummary._sum.quantityReserved || 0),
      totalInTransit: Number(stockSummary._sum.quantityInTransit || 0),
    },
    transactions: {
      total: depot._count.stockTransactions,
      recent: recentTransactions,
    },
    reservations: {
      total: depot._count.stockReservations,
      active: activeReservations,
    },
    utilization,
  };
};

// ============================================
// CHECK CODE AVAILABILITY
// ============================================
/**
 * Check if depot code is available in société
 */
// export const checkCodeAvailability = async (
//   societeId,
//   code,
//   excludeId = null,
// ) => {
//   const where = {
//     societeId,
//     code,
//   };

//   // Exclude current depot when updating
//   if (excludeId) {
//     where.NOT = { id: excludeId };
//   }

//   const existing = await prisma.depot.findFirst({ where });

//   if (existing) {
//     throw new ApiError(
//       `Depot code ${code} already exists in this société`,
//       409,
//     );
//   }

//   return true;
// };

// ============================================
// GENERATE DEPOT CODE
// ============================================
/**
 * Auto-generate unique depot code for société
 * Format: DEP-XXX (e.g., DEP-001, DEP-002)
 */
const generateDepotCode = async (societeId) => {
  // Get last depot code for this société
  const lastDepot = await prisma.depot.findFirst({
    where: { societeId },
    orderBy: { createdAt: "desc" },
    select: { code: true },
  });
  if (!lastDepot) {
    return "DEP-001";
  }

  // Extract number from last code
  const match = lastDepot.code.match(/DEP-(\d+)/);
  if (match) {
    const lastNumber = parseInt(match[1]);
    const newNumber = lastNumber + 1;
    return `DEP-${String(newNumber).padStart(3, "0")}`;
  }

  // Fallback if code doesn't match pattern
  const depotCount = await prisma.depot.count({
    where: { societeId },
  });
  return `DEP-${String(depotCount + 1).padStart(3, "0")}`;
};

// ============================================
// GET ACTIVE DÉPÔTS (For Dropdowns)
// ============================================
/**
 * Get active dépôts for a société (for dropdowns, selects)
 */
export const getActiveDepots = async (societeId) => {
  const depots = await prisma.depot.findMany({
    where: {
      societeId,
      active: true,
    },
    select: {
      id: true,
      code: true,
      name: true,
      type: true,
      city: true,
    },
    orderBy: [
      { type: "asc" }, // PRINCIPAL first
      { name: "asc" },
    ],
  });

  return depots;
};

// ============================================
// GET DÉPÔT BY CODE
// ============================================
/**
 * Find dépôt by code within société
 */
// export const getByCode = async (societeId, code) => {
//   const depot = await prisma.depot.findFirst({
//     where: {
//       societeId,
//       code,
//     },
//     include: {
//       societe: {
//         select: {
//           id: true,
//           raisonSocial: true,
//         },
//       },
//     },
//   });

//   if (!depot) {
//     throw new ApiError("Dépôt not found", 404);
//   }

//   return depot;
// };

// ============================================
// EXPORT FUNCTIONS
// ============================================
export default {
  getAll,
  getById,
  getBySociete,
  create,
  update,
  deleteDepot,
  // toggleActive,
  getStatistics,
  // checkCodeAvailability,
  getActiveDepots,
  // getByCode,
};
