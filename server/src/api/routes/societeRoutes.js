import { Router } from "express";
import * as SocieteController from "../controllers/societeController.js";
import { auth } from "../middlewares/authMiddleware.js";
import {
  superAdminOnly,
  adminOnly,
} from "../middlewares/superAdminMiddleware.js";
import {
  createSocieteValidator,
  updateSocieteValidator,
} from "../validations/societeValidation.js";
import {
  uploadSocieteImage,
  resizeSocieteImage,
} from "../services/societeService.js";

const router = Router();

// ============================================
// PUBLIC ROUTES
// ============================================

/**
 * Check ICE Availability
 * For form validation during création/update
 *
 * GET /api/societes/check-ice/:ice?excludeId=1
 */
router.get("/check-ice/:ice", SocieteController.checkICEAvailability);

// ============================================
// AUTHENTICATED ROUTES
// ============================================

// All routes below require authentication
router.use(auth);

/**
 * Get My Société
 * Returns current user's société with full details
 *
 * GET /api/societes/me
 * Access: Any authenticated user
 */
router.get("/me", SocieteController.getMySociete);

/**
 * Update document header branding (super admin)
 * PUT /api/societes/me/document-header
 * Body: { config: { ... }, societeId?: number }
 */
router.put(
  "/me/document-header",
  superAdminOnly,
  SocieteController.updateMyDocumentHeader,
);

// ============================================
// SUPER ADMIN ONLY ROUTES
// ============================================

/**
 * Get All Sociétés
 * With pagination, search, and filtering
 *
 * GET /api/societes?page=1&limit=10&search=xyz&active=true
 * Access: Super Admin Only
 */
router.get("/", superAdminOnly, SocieteController.getAllSocietes);

/**
 * Get Société by ICE
 *
 * GET /api/societes/ice/:ice
 * Access: Super Admin Only
 */
router.get("/ice/:ice", superAdminOnly, SocieteController.getSocieteByICE);

/**
 * Create Société
 *
 * POST /api/societes
 * Body: { raisonSocial, address, tel, phone, email, ice, rc, tp, if, ... }
 * Access: Super Admin Only
 */
router.post(
  "/",
  superAdminOnly,
  uploadSocieteImage,
  createSocieteValidator,
  resizeSocieteImage,
  SocieteController.createSociete,
);

/**
 * Delete Société
 * Soft delete if has related data, hard delete otherwise
 *
 * DELETE /api/societes/:id
 * Access: Super Admin Only
 */
router.delete("/:id", superAdminOnly, SocieteController.deleteSociete);

// ============================================
// ADMIN ROUTES (Super Admin OR Société Admin)
// ============================================

/**
 * Get Société by ID
 * Super Admin: can view any société
 * Regular User: can only view their own société
 *
 * GET /api/societes/:id
 * Access: Super Admin (any) | Regular User (own only)
 */
router.get("/:id", SocieteController.getSocieteById);

/**
 * Get Société Statistics
 *
 * GET /api/societes/:id/statistics
 * Access: Super Admin (any) | Regular User (own only)
 */
router.get("/:id/statistics", SocieteController.getSocieteStatistics);

/**
 * Update Société
 * Super Admin: can update any société
 * Société Admin: can only update their own société
 *
 * PUT /api/societes/:id
 * Body: { raisonSocial, address, tel, phone, email, ice, ... }
 * Access: Super Admin (any) | Société Admin (own only)
 */
router.put(
  "/:id",
  adminOnly,
  uploadSocieteImage,
  updateSocieteValidator,
  resizeSocieteImage,
  SocieteController.updateSociete,
);

export default router;
