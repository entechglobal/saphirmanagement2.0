import prisma from "../../loaders/prisma.js";
import ApiError from "../utils/apiError.js";
import ApiFeatures from "../utils/apiFeatures.js";

/* =========================
   CRUD OPERATIONS
========================= */

/**
 * Create a new unit
 */
export const create = async (data) => {
  // Convert string to boolean if needed
  if (typeof data.allowsFractional === "string") {
    data.allowsFractional = data.allowsFractional.toLowerCase() === "true";
  }

  return prisma.unit.create({
    data,
  });
};

/**
 * Get all units with filtering, search, and pagination
 */
export const getAll = async (query) => {
  const count = await prisma.unit.count();

  const apiFeatures = new ApiFeatures(query)
    .filter()
    .search(["name", "symbol"])
    .sort()
    .limitFields({
      id: true,
      name: true,
      symbol: true,
      allowsFractional: true,
      createdAt: true,
      updatedAt: true,
    })
    .paginate(count);

  const baseQuery = apiFeatures.build();

  const units = await prisma.unit.findMany(baseQuery);

  return {
    results: units.length,
    pagination: apiFeatures.paginationResult,
    data: units,
  };
};

/**
 * Get unit by ID
 */
export const getById = async (id) => {
  const unit = await prisma.unit.findUnique({
    where: { id },
  });

  if (!unit) {
    throw new ApiError("Unit not found", 404);
  }

  return unit;
};

/**
 * Update unit
 */
export const update = async (id, data) => {
  const unit = await prisma.unit.findUnique({ where: { id } });

  if (!unit) {
    throw new ApiError("Unit not found", 404);
  }

  // Convert string to boolean if needed
  if (typeof data.allowsFractional === "string") {
    data.allowsFractional = data.allowsFractional.toLowerCase() === "true";
  }

  return prisma.unit.update({
    where: { id },
    data,
  });
};

/**
 * Remove unit
 */
export const remove = async (id) => {
  const unit = await prisma.unit.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          articlesAsPrincipale: true,
          articlesAsSecondaire: true,
          articlesAsComplementaire: true,
        },
      },
    },
  });

  if (!unit) {
    throw new ApiError("Unit not found", 404);
  }

  // Check if unit is in use
  const totalUsage =
    unit._count.articlesAsPrincipale +
    unit._count.articlesAsSecondaire +
    unit._count.articlesAsComplementaire;

  if (totalUsage > 0) {
    throw new ApiError(
      `Cannot delete unit. It is being used by ${totalUsage} article(s)`,
      400,
    );
  }

  return prisma.unit.delete({ where: { id } });
};

/* =========================
   UTILITY OPERATIONS
========================= */

/**
 * Get units by type (fractional or not)
 */
// export const getByType = async (allowsFractional) => {
//   return prisma.unit.findMany({
//     where: { allowsFractional },
//     orderBy: { name: "asc" },
//   });
// };

/**
 * Check unit usage across articles
 */
// export const checkUsage = async (id) => {
//   const unit = await prisma.unit.findUnique({
//     where: { id },
//     include: {
//       articlesAsPrincipale: {
//         select: {
//           id: true,
//           barcode: true,
//           name: true,
//         },
//         take: 5,
//       },
//       articlesAsSecondaire: {
//         select: {
//           id: true,
//           barcode: true,
//           name: true,
//         },
//         take: 5,
//       },
//       articlesAsComplementaire: {
//         select: {
//           id: true,
//           barcode: true,
//           name: true,
//         },
//         take: 5,
//       },
//       _count: {
//         select: {
//           articlesAsPrincipale: true,
//           articlesAsSecondaire: true,
//           articlesAsComplementaire: true,
//         },
//       },
//     },
//   });

//   if (!unit) {
//     throw new ApiError("Unit not found", 404);
//   }

//   return {
//     unit: {
//       id: unit.id,
//       name: unit.name,
//       symbol: unit.symbol,
//     },
//     usage: {
//       asPrincipale: {
//         count: unit._count.articlesAsPrincipale,
//         samples: unit.articlesAsPrincipale,
//       },
//       asSecondaire: {
//         count: unit._count.articlesAsSecondaire,
//         samples: unit.articlesAsSecondaire,
//       },
//       asComplementaire: {
//         count: unit._count.articlesAsComplementaire,
//         samples: unit.articlesAsComplementaire,
//       },
//       total:
//         unit._count.articlesAsPrincipale +
//         unit._count.articlesAsSecondaire +
//         unit._count.articlesAsComplementaire,
//     },
//     canDelete:
//       unit._count.articlesAsPrincipale === 0 &&
//       unit._count.articlesAsSecondaire === 0 &&
//       unit._count.articlesAsComplementaire === 0,
//   };
// };
