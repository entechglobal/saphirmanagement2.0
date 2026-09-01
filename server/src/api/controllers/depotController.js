import asyncHandler from "express-async-handler";
import * as DepotService from "../services/depotService.js";

// ============================================
// GET ALL DÉPÔTS
// GET /api/depots
// Access: Authenticated (filtered by société)
// ============================================
export const getAllDepots = asyncHandler(async (req, res) => {
  const result = await DepotService.getAll(req.query, req.societeId);

  res.status(200).json({
    success: true,
    ...result,
  });
});

// ============================================
// GET DÉPÔT BY ID
// GET /api/depots/:id
// Access: Authenticated (own société only)
// ============================================
export const getDepotById = asyncHandler(async (req, res) => {
  const depot = await DepotService.getById(parseInt(req.params.id), req.user);

  res.status(200).json({
    success: true,
    data: depot,
  });
});

// ============================================
// GET DÉPÔTS BY SOCIÉTÉ
// GET /api/depots/societe/:societeId
// Access: Super Admin (any) | Regular User (own only)
// ============================================
export const getDepotsBySociete = asyncHandler(async (req, res) => {
  const societeId = parseInt(req.params.societeId);

  // Authorization: users can only view their own société's depots
  if (!req.user.isSuperAdmin && req.user.societeId !== societeId) {
    return res.status(403).json({
      success: false,
      message: "Access denied. You can only view dépôts in your own société.",
    });
  }

  const activeOnly = req.query.activeOnly === "true";
  const depots = await DepotService.getBySociete(societeId, activeOnly);

  res.status(200).json({
    success: true,
    results: depots.length,
    data: depots,
  });
});

// ============================================
// GET ACTIVE DÉPÔTS (For Dropdowns)
// GET /api/depots/active/list
// Access: Authenticated (own société only)
// ============================================
export const getActiveDepots = asyncHandler(async (req, res) => {
  if (!req.societeId) {
    return res.status(400).json({
      success: false,
      message: "SocieteId is required",
    });
  }

  const depots = await DepotService.getActiveDepots(req.societeId);

  res.status(200).json({
    success: true,
    results: depots.length,
    data: depots,
  });
});

// ============================================
// CREATE DÉPÔT
// POST /api/depots
// Access: Super Admin (any société) | Société Admin (own only)
// ============================================
export const createDepot = asyncHandler(async (req, res) => {
  // If not super admin, force their société
  if (!req.user.isSuperAdmin) {
    req.body.societeId = req.user.societeId;
  }
  if (req.user.isSuperAdmin) {
    req.body.societeId = req.societeId;
  }

  const depot = await DepotService.create(req.body, req.user);

  res.status(201).json({
    success: true,
    message: "Dépôt created successfully",
    data: depot,
  });
});

// ============================================
// UPDATE DÉPÔT
// PUT /api/depots/:id
// Access: Super Admin (any) | Société Admin (own only)
// ============================================
export const updateDepot = asyncHandler(async (req, res) => {
  const depot = await DepotService.update(
    parseInt(req.params.id),
    req.body,
    req.user,
  );

  res.status(200).json({
    success: true,
    message: "Dépôt updated successfully",
    data: depot,
  });
});

// ============================================
// DELETE DÉPÔT
// DELETE /api/depots/:id
// Access: Super Admin (any) | Société Admin (own only)
// ============================================
export const deleteDepot = asyncHandler(async (req, res) => {
  const result = await DepotService.deleteDepot(
    parseInt(req.params.id),
    req.user,
  );

  res.status(200).json({
    success: true,
    ...result,
  });
});

// ============================================
// TOGGLE ACTIVE STATUS
// PATCH /api/depots/:id/toggle-active
// Access: Super Admin (any) | Société Admin (own only)
// ============================================
// export const toggleActiveDepot = asyncHandler(async (req, res) => {
//   const { active } = req.body;

//   const depot = await DepotService.toggleActive(
//     parseInt(req.params.id),
//     active,
//     req.user,
//   );

//   res.status(200).json({
//     success: true,
//     message: `Dépôt ${active ? "activated" : "deactivated"} successfully`,
//     data: depot,
//   });
// });

// ============================================
// GET DÉPÔT STATISTICS
// GET /api/depots/:id/statistics
// Access: Authenticated (own société only)
// ============================================
export const getDepotStatistics = asyncHandler(async (req, res) => {
  const depotId = parseInt(req.params.id);

  // Verify depot belongs to user's société
  const depot = await DepotService.getById(depotId, req.user);

  const statistics = await DepotService.getStatistics(depotId);

  res.status(200).json({
    success: true,
    data: statistics,
  });
});

// ============================================
// GET DÉPÔT BY CODE
// GET /api/depots/code/:code
// Access: Authenticated (own société only)
// ============================================
// export const getDepotByCode = asyncHandler(async (req, res) => {
//   if (!req.societeId) {
//     return res.status(400).json({
//       success: false,
//       message: "SocieteId is required",
//     });
//   }

//   const depot = await DepotService.getByCode(req.societeId, req.params.code);

//   res.status(200).json({
//     success: true,
//     data: depot,
//   });
// });

// ============================================
// CHECK CODE AVAILABILITY
// GET /api/depots/check-code/:code
// Access: Authenticated
// ============================================
// export const checkCodeAvailability = asyncHandler(async (req, res) => {
//   const { code } = req.params;
//   const { excludeId } = req.query;

//   if (!req.societeId) {
//     return res.status(400).json({
//       success: false,
//       message: "SocieteId is required",
//     });
//   }

//   await DepotService.checkCodeAvailability(
//     req.societeId,
//     code,
//     excludeId ? parseInt(excludeId) : null,
//   );

//   res.status(200).json({
//     success: true,
//     available: true,
//     message: "Depot code is available",
//   });
// });

// ============================================
// EXPORT FUNCTIONS
// ============================================
export default {
  getAllDepots,
  getDepotById,
  getDepotsBySociete,
  getActiveDepots,
  createDepot,
  updateDepot,
  deleteDepot,
  // toggleActiveDepot,
  getDepotStatistics,
  // getDepotByCode,
  // checkCodeAvailability,
};
