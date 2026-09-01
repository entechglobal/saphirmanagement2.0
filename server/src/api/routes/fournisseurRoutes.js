import { Router } from "express";
import * as FournisseurController from "../controllers/fournisseurController.js";
import { auth } from "../middlewares/authMiddleware.js";
import { societyFilter } from "../middlewares/societyFilterMiddleware.js";
import { hasPermission } from "../middlewares/rbacMiddleware.js";
import {
  createFournisseurValidator,
  getFournisseurValidator,
  updateFournisseurValidator,
  deleteFournisseurValidator,
} from "../validations/fournisseurValidation.js";
import uploadFile from "../utils/uploadFiles.js";

const router = Router();

// ============================================
// ALL ROUTES REQUIRE AUTHENTICATION
// ============================================
router.use(auth); // ⭐ Authenticate all requests
router.use(societyFilter); // ⭐ Auto-filter by société

// ============================================
// STATISTICS ROUTE (Must be before /:id)
// ============================================
/**
 * Get Fournisseur Statistics
 * Super Admin: All sociétés stats
 * Regular User: Own société stats
 *
 * GET /api/fournisseurs/stats/summary
 * Access: Authenticated (société-filtered)
 */
router.get("/stats/summary", FournisseurController.getFournisseurStatistics);

// ============================================
// EXPORT ROUTES (Must be before /:id)
// ============================================
/**
 * Export Fournisseurs to CSV
 * Super Admin: All fournisseurs (with ?societeId=X)
 * Regular User: Own société fournisseurs
 *
 * GET /api/fournisseurs/export/csv
 * Access: Authenticated (société-filtered)
 */
router.get("/export/csv", FournisseurController.exportFournisseursCSV);

/**
 * Export Fournisseurs to Excel
 * Super Admin: All fournisseurs (with ?societeId=X)
 * Regular User: Own société fournisseurs
 *
 * GET /api/fournisseurs/export/excel
 * Access: Authenticated (société-filtered)
 */
router.get("/export/excel", FournisseurController.exportFournisseursExcel);

// ============================================
// IMPORT ROUTES (Must be before /:id)
// ============================================
/**
 * Import Fournisseurs from CSV
 * Imports to current user's société
 *
 * POST /api/fournisseurs/import/csv
 * Body: FormData with file
 * Access: Authenticated + Permission
 */
router.post(
  "/import/csv",
  hasPermission("import_fournisseurs"),
  uploadFile,
  FournisseurController.importFournisseursCSV,
);

/**
 * Import Fournisseurs from Excel
 * Imports to current user's société
 *
 * POST /api/fournisseurs/import/excel
 * Body: FormData with file
 * Access: Authenticated + Permission
 */
router.post(
  "/import/excel",
  hasPermission("import_fournisseurs"),
  uploadFile,
  FournisseurController.importFournisseursExcel,
);

// ============================================
// FOURNISSEUR CRUD ROUTES
// ============================================

/**
 * Get All Fournisseurs
 * Super Admin: All fournisseurs (with ?societeId=X to filter)
 * Regular User: Only their société's fournisseurs
 *
 * GET /api/fournisseurs?page=1&limit=10&search=&type=&active=true
 * Query Params:
 * - page: Page number
 * - limit: Items per page
 * - search: Search in name, phone, email, ICE
 * - type: PARTICULIER or SOCIETE
 * - active: true/false
 * - sort: Sort field
 *
 * Access: Authenticated (société-filtered)
 */
router.get("/", FournisseurController.getAllFournisseurs);

/**
 * Get Fournisseur by ID
 *
 * GET /api/fournisseurs/:id
 * Access: Authenticated (own société only)
 */
router.get(
  "/:id",
  getFournisseurValidator,
  FournisseurController.getFournisseurById,
);

/**
 * Create New Fournisseur
 * Creates fournisseur in current user's société
 *
 * POST /api/fournisseurs
 * Body: { name, phone, type, email, ... }
 * Access: Authenticated + Permission
 */
router.post(
  "/",
  hasPermission("create_fournisseurs"),
  createFournisseurValidator,
  FournisseurController.createFournisseur,
);

/**
 * Update Fournisseur
 * Can only update fournisseurs in own société
 *
 * PUT /api/fournisseurs/:id
 * Body: { name, phone, email, ... }
 * Access: Authenticated + Permission + Own Société
 */
router.put(
  "/:id",
  hasPermission("update_fournisseurs"),
  updateFournisseurValidator,
  FournisseurController.updateFournisseur,
);

/**
 * Delete Fournisseur
 * Can only delete fournisseurs in own société
 * Cannot delete if fournisseur has active documents
 *
 * DELETE /api/fournisseurs/:id
 * Access: Authenticated + Permission + Own Société
 */
router.delete(
  "/:id",
  hasPermission("delete_fournisseurs"),
  deleteFournisseurValidator,
  FournisseurController.deleteFournisseur,
);

export default router;
