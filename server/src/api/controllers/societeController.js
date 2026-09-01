import asyncHandler from "express-async-handler";
import * as SocieteService from "../services/societeService.js";

// ============================================
// GET ALL SOCIÉTÉS
// GET /api/societes
// Access: Super Admin Only
// ============================================
export const getAllSocietes = asyncHandler(async (req, res) => {
  const result = await SocieteService.getAll(req.query);

  res.status(200).json({
    success: true,
    ...result,
  });
});

// ============================================
// GET SOCIÉTÉ BY ID
// GET /api/societes/:id
// Access: Super Admin (any) | Regular User (own only)
// ============================================
export const getSocieteById = asyncHandler(async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (!Number.isFinite(id) || id < 1) {
    return res.status(404).json({
      success: false,
      message: "Société not found",
    });
  }

  const societe = await SocieteService.getById(id, req.user);

  res.status(200).json({
    success: true,
    data: societe,
  });
});

// ============================================
// GET MY SOCIÉTÉ
// GET /api/societes/me
// Access: Authenticated Users
// ============================================
export const getMySociete = asyncHandler(async (req, res) => {
  const societe = await SocieteService.getMySociete(req.user.societeId);

  res.status(200).json({
    success: true,
    data: societe,
  });
});

// ============================================
// CREATE SOCIÉTÉ
// POST /api/societes
// Access: Super Admin Only
// ============================================
export const createSociete = asyncHandler(async (req, res) => {
  const societe = await SocieteService.create(req.body);

  res.status(201).json({
    success: true,
    message: "Société created successfully",
    data: societe,
  });
});

// ============================================
// UPDATE SOCIÉTÉ
// PUT /api/societes/:id
// Access: Super Admin (any) | Société Admin (own only)
// ============================================
export const updateSociete = asyncHandler(async (req, res) => {
  const societe = await SocieteService.update(
    parseInt(req.params.id),
    req.body,
    req.user,
  );

  res.status(200).json({
    success: true,
    message: "Société updated successfully",
    data: societe,
  });
});

// ============================================
// DELETE SOCIÉTÉ
// DELETE /api/societes/:id
// Access: Super Admin Only
// ============================================
export const deleteSociete = asyncHandler(async (req, res) => {
  const result = await SocieteService.deleteSociete(parseInt(req.params.id));

  res.status(200).json({
    success: true,
    ...result,
  });
});

// ============================================
// GET SOCIÉTÉ STATISTICS
// GET /api/societes/:id/statistics
// Access: Super Admin (any) | Regular User (own only)
// ============================================
export const getSocieteStatistics = asyncHandler(async (req, res) => {
  const societeId = parseInt(req.params.id);

  // Authorization: users can only view their own société stats
  if (!req.user.isSuperAdmin && req.user.societeId !== societeId) {
    return res.status(403).json({
      success: false,
      message: "Access denied. You can only view your own société statistics.",
    });
  }

  const statistics = await SocieteService.getStatistics(societeId);

  res.status(200).json({
    success: true,
    data: statistics,
  });
});

// ============================================
// GET SOCIÉTÉ BY ICE
// GET /api/societes/ice/:ice
// Access: Super Admin Only
// ============================================
export const getSocieteByICE = asyncHandler(async (req, res) => {
  const societe = await SocieteService.getByICE(req.params.ice);

  res.status(200).json({
    success: true,
    data: societe,
  });
});

// ============================================
// CHECK ICE AVAILABILITY
// GET /api/societes/check-ice/:ice
// Access: Public (for validation during creation)
// ============================================
export const checkICEAvailability = asyncHandler(async (req, res) => {
  const { ice } = req.params;
  const { excludeId } = req.query;

  await SocieteService.checkICEAvailability(
    ice,
    excludeId ? parseInt(excludeId) : null,
  );

  res.status(200).json({
    success: true,
    available: true,
    message: "ICE is available",
  });
});

export const updateMyDocumentHeader = asyncHandler(async (req, res) => {
  const societeId = req.user?.isSuperAdmin
    ? parseInt(req.body.societeId, 10) || req.user.societeId
    : req.user.societeId;

  if (!societeId) {
    return res.status(400).json({
      success: false,
      message: "No société associated with this user",
    });
  }

  const societe = await SocieteService.updateDocumentHeaderConfig(
    societeId,
    req.body.config ?? req.body,
    req.user,
  );

  res.status(200).json({
    success: true,
    message: "Document header settings updated",
    data: societe,
  });
});

// ============================================
// EXPORT FUNCTIONS
// ============================================
export default {
  getAllSocietes,
  getSocieteById,
  getMySociete,
  createSociete,
  updateSociete,
  deleteSociete,
  getSocieteStatistics,
  getSocieteByICE,
  checkICEAvailability,
  updateMyDocumentHeader,
};
