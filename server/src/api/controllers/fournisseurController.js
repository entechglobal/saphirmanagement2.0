import * as FournisseurService from "../services/fournisseurService.js";
import asyncHandler from "express-async-handler";

// ============================================
// GET ALL FOURNISSEURS (UPDATED with société filter)
// ============================================
export const getAllFournisseurs = asyncHandler(async (req, res) => {
  // ⭐ Pass societeId from middleware
  const fournisseursData = await FournisseurService.getAll(
    req.query,
    req.societeId,
  );

  res.status(200).json({
    success: true,
    results: fournisseursData.results,
    pagination: fournisseursData.pagination,
    data: fournisseursData.data,
  });
});

// ============================================
// GET FOURNISSEUR BY ID (UPDATED with société check)
// ============================================
export const getFournisseurById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // ⭐ Pass requesting user for authorization
  const fournisseur = await FournisseurService.getById(Number(id), req.user);

  res.status(200).json({
    success: true,
    message: "Fournisseur information retrieved successfully",
    data: fournisseur,
  });
});

// ============================================
// CREATE FOURNISSEUR (UPDATED with société)
// ============================================
export const createFournisseur = asyncHandler(async (req, res) => {
  // ⭐ Pass societeId from middleware
  const fournisseur = await FournisseurService.create(req.body, req.societeId);

  res.status(201).json({
    success: true,
    message: "Fournisseur created successfully",
    data: fournisseur,
  });
});

// ============================================
// UPDATE FOURNISSEUR (UPDATED with société check)
// ============================================
export const updateFournisseur = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // ⭐ Pass requesting user for authorization
  const fournisseur = await FournisseurService.update(
    Number(id),
    req.body,
    req.user,
  );

  res.status(200).json({
    success: true,
    message: "Fournisseur updated successfully",
    data: fournisseur,
  });
});

// ============================================
// DELETE FOURNISSEUR (UPDATED with société check)
// ============================================
export const deleteFournisseur = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // ⭐ Pass requesting user for authorization
  await FournisseurService.remove(Number(id), req.user);

  res.status(200).json({
    success: true,
    message: "Fournisseur deleted successfully",
  });
});

// ============================================
// GET FOURNISSEUR STATISTICS (UPDATED with société filter)
// ============================================
export const getFournisseurStatistics = asyncHandler(async (req, res) => {
  // ⭐ Pass societeId from middleware (null for super admin)
  const stats = await FournisseurService.getStatistics(req.societeId);

  res.status(200).json({
    success: true,
    message: "Fournisseur statistics retrieved successfully",
    data: stats,
  });
});

// ============================================
// EXPORT FOURNISSEURS TO CSV (UPDATED with société filter)
// ============================================
export const exportFournisseursCSV = asyncHandler(async (req, res) => {
  // ⭐ Pass societeId from middleware
  const csv = await FournisseurService.exportFournisseursCSV(req.societeId);

  res.header("Content-Type", "text/csv");
  res.attachment("fournisseurs.csv");
  res.send(csv);
});

// ============================================
// EXPORT FOURNISSEURS TO EXCEL (UPDATED with société filter)
// ============================================
export const exportFournisseursExcel = asyncHandler(async (req, res) => {
  // ⭐ Pass societeId from middleware
  const workbook = await FournisseurService.exportFournisseursExcel(
    req.societeId,
  );

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader(
    "Content-Disposition",
    "attachment; filename=fournisseurs.xlsx",
  );
  await workbook.xlsx.write(res);
  res.end();
});

// ============================================
// IMPORT FOURNISSEURS FROM CSV (UPDATED with société)
// ============================================
export const importFournisseursCSV = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No file uploaded",
    });
  }

  // ⭐ Pass societeId from middleware
  const importedCount = await FournisseurService.importFournisseursCSV(
    req.file.buffer,
    req.societeId,
  );

  res.status(201).json({
    success: true,
    message: "CSV imported successfully",
    imported: importedCount,
  });
});

// ============================================
// IMPORT FOURNISSEURS FROM EXCEL (UPDATED with société)
// ============================================
export const importFournisseursExcel = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No file uploaded",
    });
  }

  // ⭐ Pass societeId from middleware
  const importedCount = await FournisseurService.importFournisseursExcel(
    req.file.buffer,
    req.societeId,
  );

  res.status(201).json({
    success: true,
    message: "Excel imported successfully",
    imported: importedCount,
  });
});

// ============================================
// EXPORT FUNCTIONS
// ============================================
export default {
  getAllFournisseurs,
  getFournisseurById,
  createFournisseur,
  updateFournisseur,
  deleteFournisseur,
  getFournisseurStatistics,
  exportFournisseursCSV,
  exportFournisseursExcel,
  importFournisseursCSV,
  importFournisseursExcel,
};
