import { Router } from "express";
import * as DepotController from "../controllers/depotController.js";
import { auth } from "../middlewares/authMiddleware.js";
import { societyFilter } from "../middlewares/societyFilterMiddleware.js";
import { adminOnly } from "../middlewares/superAdminMiddleware.js";
import {
  createDepotValidator,
  updateDepotValidator,
  toggleActiveValidator,
} from "../validations/depotValidation.js";

const router = Router();

// ============================================
// ALL ROUTES REQUIRE AUTHENTICATION
// ============================================
router.use(auth);
router.use(societyFilter); // Auto-filter by société

// ============================================
// PUBLIC ROUTES (Authenticated + Société Filtered)
// ============================================

/**
 * Get All Dépôts
 * Super Admin: all dépôts (with ?societeId=X)
 * Regular User: own société's dépôts
 *
 * GET /api/depots?page=1&limit=10&search=&type=PRINCIPAL&active=true
 * Access: Authenticated (société-filtered)
 */
router.get("/", DepotController.getAllDepots);

/**
 * Get Active Dépôts List
 * For dropdowns, selects
 *
 * GET /api/depots/active/list
 * Access: Authenticated (own société)
 */
router.get("/active/list", DepotController.getActiveDepots);

/**
 * Check Code Availability
 * For form validation
 *
 * GET /api/depots/check-code/:code?excludeId=1
 * Access: Authenticated (own société)
 */
// router.get("/check-code/:code", DepotController.checkCodeAvailability);

/**
 * Get Dépôt by Code
 *
 * GET /api/depots/code/:code
 * Access: Authenticated (own société)
 */
// router.get("/code/:code", DepotController.getDepotByCode);

/**
 * Get Dépôts by Société
 *
 * GET /api/depots/societe/:societeId?activeOnly=true
 * Access: Super Admin (any) | Regular User (own only)
 */
router.get("/societe/:societeId", DepotController.getDepotsBySociete);

/**
 * Get Dépôt by ID
 *
 * GET /api/depots/:id
 * Access: Authenticated (own société only)
 */
router.get("/:id", DepotController.getDepotById);

/**
 * Get Dépôt Statistics
 *
 * GET /api/depots/:id/statistics
 * Access: Authenticated (own société only)
 */
router.get("/:id/statistics", DepotController.getDepotStatistics);

// ============================================
// ADMIN ROUTES (Super Admin OR Société Admin)
// ============================================

/**
 * Create Dépôt
 * Super Admin: can create for any société
 * Société Admin: creates for own société only
 *
 * POST /api/depots
 * Body: {
 *   societeId, // Optional for admin (defaults to own)
 *   code, // Optional (auto-generated)
 *   name,
 *   type,
 *   address,
 *   city,
 *   ...
 * }
 * Access: Admin (super or société)
 */
router.post("/", adminOnly, createDepotValidator, DepotController.createDepot);

/**
 * Update Dépôt
 *
 * PUT /api/depots/:id
 * Body: { name, address, city, type, capacity, ... }
 * Access: Admin (super or société)
 */
router.put(
  "/:id",
  adminOnly,
  updateDepotValidator,
  DepotController.updateDepot,
);

/**
 * Delete Dépôt
 * Soft delete if has stock, hard delete otherwise
 *
 * DELETE /api/depots/:id
 * Access: Admin (super or société)
 */
router.delete("/:id", adminOnly, DepotController.deleteDepot);

/**
 * Toggle Active Status
 *
 * PATCH /api/depots/:id/toggle-active
 * Body: { active: true/false }
 * Access: Admin (super or société)
 */
// router.patch(
//   "/:id/toggle-active",
//   adminOnly,
//   toggleActiveValidator,
//   DepotController.toggleActiveDepot,
// );

export default router;
