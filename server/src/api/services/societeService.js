import asyncHandler from "express-async-handler";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";

import prisma from "../../loaders/prisma.js";
import ApiError from "../utils/apiError.js";
import ApiFeatures from "../utils/apiFeatures.js";
import { uploadSingleImage } from "../middlewares/uploadImageMiddleware.js";
import { buildImageUrl } from "../utils/buildImageUrl.js";
import {
  resolveDocumentHeaderConfig,
  sanitizeDocumentHeaderConfig,
} from "../utils/documentHeaderConfig.js";

export const uploadSocieteImage = uploadSingleImage("logo");

/** Prisma Json? may already be an object, a string, or null */
const parseFixedStructure = (value) => {
  if (value == null || value === "") return null;
  if (typeof value === "object") return value;
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch {
      return null;
    }
  }
  return null;
};

export const resizeSocieteImage = asyncHandler(async (req, res, next) => {
  if (req.file) {
    const filename = `societe-${uuidv4()}-${Date.now()}.jpeg`;
    await sharp(req.file.buffer)
      .resize(200, 200) // Increased from 200x200 for better quality
      .toFormat("jpeg")
      .jpeg({ quality: 90 })
      .toFile(`uploads/societes/${filename}`);

    req.body.logo = filename;
  }
  next();
});

// ============================================
// GET ALL SOCIÉTÉS (Super Admin Only)
// ============================================
/**
 * Get all sociétés with pagination, search, and filtering
 * Only accessible by super admin
 */
export const getAll = async (query) => {
  // Build where clause

  // Filter by active status if provided
  //   if (query.active !== undefined) {
  //     where.active = query.active === "true";
  //   }

  // Count total
  const count = await prisma.societe.count();

  // Build query with ApiFeatures
  const apiFeatures = new ApiFeatures(query)
    .sort() // Default: -createdAt
    .search(["email", "ice", "raisonSocial"])
    .paginate(count);

  const baseQuery = apiFeatures.build();

  // Get sociétés with stats
  const societes = await prisma.societe.findMany({
    ...baseQuery,
    include: {
      _count: {
        select: {
          depots: true,
          users: true,
          clients: true,
          fournisseurs: true,
          clientDocuments: true,
          fournisseurDocuments: true,
        },
      },
      depots: {
        where: { active: true },
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
          active: true,
        },
      },
    },
  });

  // Parse fixedStructure for all sociétés
  const societesWithParsedFixedStructure = societes.map((societe) => ({
    ...societe,
    logo: buildImageUrl("societes", societe.logo),
    fixedStructure: parseFixedStructure(societe.fixedStructure),
  }));

  return {
    results: societesWithParsedFixedStructure.length,
    pagination: apiFeatures.paginationResult,
    data: societesWithParsedFixedStructure,
  };
};

// ============================================
// GET SOCIÉTÉ BY ID
// ============================================
/**
 * Get société by ID with full details
 * Super admin: any société
 * Regular user: only their own société
 */
export const getById = async (id, requestingUser = null) => {
  const societe = await prisma.societe.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          depots: true,
          users: true,
          clients: true,
          fournisseurs: true,
          clientDocuments: true,
          fournisseurDocuments: true,
        },
      },
      depots: {
        where: { active: true },
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
          address: true,
          city: true,
          region: true,
          phone: true,
          active: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!societe) {
    throw new ApiError("Société not found", 404);
  }
  // Authorization check (if requesting user provided)
  if (requestingUser && !requestingUser.isSuperAdmin) {
    if (requestingUser.societeId !== id) {
      throw new ApiError(
        "Access denied. You can only view your own société.",
        403,
      );
    }
  }
  const validsociete = {
    ...societe,
    logo: buildImageUrl("societes", societe.logo),
    fixedStructure: parseFixedStructure(societe.fixedStructure),
    documentHeaderConfig: resolveDocumentHeaderConfig(
      societe.documentHeaderConfig,
    ),
  };
  return validsociete;
};

// ============================================
// GET MY SOCIÉTÉ (Current User's Société)
// ============================================
/**
 * Get current user's société
 */
export const getMySociete = async (societeId) => {
  if (!societeId) {
    return null;
  }

  return getById(societeId);
};

// ============================================
// UPDATE DOCUMENT HEADER CONFIG
// ============================================
export const updateDocumentHeaderConfig = async (
  societeId,
  rawConfig,
  requestingUser = null,
) => {
  if (!societeId) {
    throw new ApiError("Société id is required", 400);
  }

  const existing = await prisma.societe.findUnique({
    where: { id: societeId },
    select: { id: true },
  });
  if (!existing) {
    throw new ApiError("Société not found", 404);
  }

  if (requestingUser && !requestingUser.isSuperAdmin) {
    if (requestingUser.societeId !== societeId) {
      throw new ApiError(
        "Access denied. You can only update your own société.",
        403,
      );
    }
  }

  const documentHeaderConfig = sanitizeDocumentHeaderConfig(rawConfig);

  const societe = await prisma.societe.update({
    where: { id: societeId },
    data: { documentHeaderConfig },
  });

  return {
    ...societe,
    logo: buildImageUrl("societes", societe.logo),
    fixedStructure: parseFixedStructure(societe.fixedStructure),
    documentHeaderConfig: resolveDocumentHeaderConfig(
      societe.documentHeaderConfig,
    ),
  };
};

// ============================================
// CREATE SOCIÉTÉ (Super Admin Only)
// ============================================
/**
 * Create new société with default depot
 */
export const create = async (data) => {
  // Validate ICE uniqueness if provided
  if (data.ice) {
    const existingICE = await prisma.societe.findUnique({
      where: { ice: data.ice },
    });

    if (existingICE) {
      throw new ApiError(`ICE ${data.ice} already exists`, 409);
    }
  }

  // Create société with default depot
  const societe = await prisma.societe.create({
    data: {
      raisonSocial: data.raisonSocial,
      logo: data.logo,
      address: data.address,
      tel: data.tel,
      phone: data.phone,
      email: data.email,
      siteWeb: data.siteWeb,
      ice: data.ice,
      rc: data.rc,
      tp: data.tp,
      if: data.if,
      fixedStructure: data.fixedStructure,
    },
    include: {
      _count: {
        select: {
          users: true,
          clients: true,
          fournisseurs: true,
        },
      },
    },
  });
  const validsociete = {
    ...societe,
    logo: buildImageUrl("societes", societe.logo),
    fixedStructure: parseFixedStructure(societe.fixedStructure),
  };
  return validsociete;
};

// ============================================
// UPDATE SOCIÉTÉ
// ============================================
/**
 * Update société information
 * Super admin: can update any société
 * Société admin: can update only their own société
 */
export const update = async (id, data, requestingUser = null) => {
  // Check if société exists
  const existingSociete = await prisma.societe.findUnique({
    where: { id },
  });

  if (!existingSociete) {
    throw new ApiError("Société not found", 404);
  }

  // Authorization check
  if (requestingUser && !requestingUser.isSuperAdmin) {
    if (requestingUser.societeId !== id) {
      throw new ApiError(
        "Access denied. You can only update your own société.",
        403,
      );
    }
  }

  const hasImageField = Object.prototype.hasOwnProperty.call(data, "logo");
  if (hasImageField && existingSociete.logo) {
    const isRemoved = data.logo === null || data.logo === "";
    const isChanged = data.logo && data.logo !== existingSociete.logo;

    if (isRemoved || isChanged) {
      const oldImagePath = path.join(
        process.cwd(),
        "uploads/societes",
        existingSociete.logo,
      );

      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }
  }

  // Update société
  const societe = await prisma.societe.update({
    where: { id },
    data: {
      raisonSocial: data.raisonSocial,
      logo: data.logo,
      address: data.address,
      tel: data.tel,
      phone: data.phone,
      email: data.email,
      siteWeb: data.siteWeb,
      ice: data.ice,
      rc: data.rc,
      tp: data.tp,
      if: data.if,
      fixedStructure: data.fixedStructure,
      // active: data.active,
    },
    include: {
      _count: {
        select: {
          depots: true,
          users: true,
          clients: true,
          fournisseurs: true,
        },
      },
      depots: {
        where: { active: true },
        select: {
          id: true,
          code: true,
          name: true,
          type: true,
        },
      },
    },
  });

  const validsociete = {
    ...societe,
    logo: buildImageUrl("societes", societe.logo),
    fixedStructure: parseFixedStructure(societe.fixedStructure),
  };
  return validsociete;
};

// ============================================
// DELETE SOCIÉTÉ (Super Admin Only)
// ============================================
/**
 * Delete société (soft delete by setting active = false)
 * Hard delete only if no related data
 */
export const deleteSociete = async (id) => {
  const societe = await prisma.societe.findUnique({
    where: { id },
    include: {
      _count: {
        select: {
          users: true,
          clients: true,
          fournisseurs: true,
          depots: true,
          clientDocuments: true,
          fournisseurDocuments: true,
        },
      },
    },
  });

  if (!societe) {
    throw new ApiError("Société not found", 404);
  }

  // Check if société has related data
  const hasRelatedData =
    societe._count.users > 0 ||
    societe._count.clients > 0 ||
    societe._count.fournisseurs > 0 ||
    societe._count.clientDocuments > 0 ||
    societe._count.fournisseurDocuments > 0 ||
    societe._count.depots > 0;

  if (hasRelatedData) {
    throw new ApiError(" société has related data", 404);
  } else {
    // Hard delete - no related data
    if (societe.logo) {
      const imagePath = path.join(
        process.cwd(),
        "uploads/societes",
        societe.logo,
      );
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }
    await prisma.societe.delete({
      where: { id },
    });

    return {
      message: "Société deleted successfully",
      softDelete: false,
    };
  }
};

// ============================================
// GET SOCIÉTÉ STATISTICS
// ============================================
/**
 * Get detailed statistics for société
 */
export const getStatistics = async (societeId) => {
  const societe = await prisma.societe.findUnique({
    where: { id: societeId },
    include: {
      _count: {
        select: {
          depots: true,
          users: true,
          clients: true,
          fournisseurs: true,
          clientDocuments: true,
          fournisseurDocuments: true,
        },
      },
    },
  });

  if (!societe) {
    throw new ApiError("Société not found", 404);
  }

  // Get active counts
  const activeDepots = await prisma.depot.count({
    where: { societeId, active: true },
  });

  const activeClients = await prisma.client.count({
    where: { societeId, active: true },
  });

  const activeFournisseurs = await prisma.fournisseur.count({
    where: { societeId, active: true },
  });

  // Get recent documents count (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  console.log(thirtyDaysAgo);

  const recentClientDocuments = await prisma.clientDocument.count({
    where: {
      societeId,
      createdAt: { gte: thirtyDaysAgo },
    },
  });

  const recentFournisseurDocuments = await prisma.fournisseurDocument.count({
    where: {
      societeId,
      createdAt: { gte: thirtyDaysAgo },
    },
  });

  // Get total stock value (if stock exists)
  // This would require joining with StockByDepot and calculating
  // Placeholder for now

  return {
    societe: {
      id: societe.id,
      raisonSocial: societe.raisonSocial,
      ice: societe.ice,
      active: societe.active,
    },
    counts: {
      depots: {
        total: societe._count.depots,
        active: activeDepots,
      },
      users: {
        total: societe._count.users,
      },
      clients: {
        total: societe._count.clients,
        active: activeClients,
      },
      fournisseurs: {
        total: societe._count.fournisseurs,
        active: activeFournisseurs,
      },
      documents: {
        clientDocuments: {
          total: societe._count.clientDocuments,
          recent: recentClientDocuments,
        },
        fournisseurDocuments: {
          total: societe._count.fournisseurDocuments,
          recent: recentFournisseurDocuments,
        },
      },
    },
  };
};

// ============================================
// VALIDATE SOCIÉTÉ ICE
// ============================================
/**
 * Validate ICE format (Morocco)
 * Format: 15 digits
 */
export const validateICE = (ice) => {
  if (!ice) return true; // ICE is optional

  // Remove spaces
  const cleanICE = ice.replace(/\s/g, "");

  // Must be exactly 15 digits
  const iceRegex = /^\d{15}$/;

  if (!iceRegex.test(cleanICE)) {
    throw new ApiError("ICE must be exactly 15 digits", 400);
  }

  return true;
};

// ============================================
// CHECK ICE AVAILABILITY
// ============================================
/**
 * Check if ICE is available
 */
export const checkICEAvailability = async (ice, excludeId = null) => {
  if (!ice) return true;

  const where = { ice };

  // Exclude current société when updating
  if (excludeId) {
    where.NOT = { id: excludeId };
  }

  const existing = await prisma.societe.findFirst({ where });

  if (existing) {
    throw new ApiError(`ICE ${ice} is already registered`, 409);
  }

  return true;
};

// ============================================
// GET SOCIÉTÉ BY ICE
// ============================================
/**
 * Find société by ICE number
 */
export const getByICE = async (ice) => {
  const societe = await prisma.societe.findUnique({
    where: { ice },
    include: {
      depots: {
        where: { active: true },
        select: {
          id: true,
          code: true,
          name: true,
        },
      },
    },
  });

  if (!societe) {
    throw new ApiError("Société not found", 404);
  }

  const validsociete = {
    ...societe,
    logo: buildImageUrl("societes", societe.logo),
    fixedStructure: parseFixedStructure(societe.fixedStructure),
  };
  return validsociete;
};

// ============================================
// EXPORT FUNCTIONS
// ============================================
export default {
  getAll,
  getById,
  getMySociete,
  updateDocumentHeaderConfig,
  create,
  update,
  deleteSociete,
  getStatistics,
  validateICE,
  checkICEAvailability,
  getByICE,
};
