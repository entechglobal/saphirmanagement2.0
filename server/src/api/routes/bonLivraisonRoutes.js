import express from "express";
import * as bonLivraisonController from "../controllers/bonLivraisonController.js";
import * as bonLivraisonValidation from "../validations/bonLivraisonValidation.js";
import { auth } from "../middlewares/authMiddleware.js";
import { hasPermission } from "../middlewares/rbacMiddleware.js";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";

const router = express.Router();

// All routes require authentication
router.use(auth);

/* =============================================================================
   STATIC ROUTES (must be declared before /:id to avoid param collision)
============================================================================= */

/**
 * GET /api/bon-livraisons/next-number
 *
 * Returns the next auto-generated document number for a new bon livraison.
 * Format: BL-{YEAR}-{SEQUENCE} (e.g. BL-2026-000004)
 * Sequence resets every year, unique per société.
 *
 * Query params:
 *   societeId  (optional, superAdmin only — ignored for regular users)
 */
router.get(
  "/next-number",
  hasPermission("view_bon_livraison"),
  bonLivraisonValidation.getNextNumberValidator,
  validatorMiddleware,
  bonLivraisonController.getNextDocumentNumber,
);

/**
 * GET /api/bon-livraisons/products
 *
 * Returns a unified list of products (articles without variants + variants)
 * formatted for bon livraison line selection.
 *
 * Query params:
 *   depotId     (required) — stock levels shown for this depot
 *   priceField  (optional, default: prixVente1) — prixVente1 | prixVente2 | prixVente3
 *               The response includes selectedPrice (TTC) for the chosen field
 *               and tva from the family model.
 *   search      (optional) — matches name or barcode
 *   categoryId  (optional)
 *   familyId    (optional)
 *   page        (optional, default: 1)
 *   limit       (optional, default: 50, max: 100)
 */
router.get(
  "/products",
  hasPermission("view_bon_livraison"),
  bonLivraisonValidation.getProductsValidator,
  validatorMiddleware,
  bonLivraisonController.getProductsForBonLivraison,
);

/* =============================================================================
   COLLECTION ROUTES
============================================================================= */

/**
 * GET /api/bon-livraisons
 *
 * Returns paginated list of bon livraisons.
 *
 * Query params:
 *   clientId   (optional)
 *   depotId    (optional)
 *   status     (optional) — DRAFT | CONFIRMED | PARTIAL | COMPLETED | CANCELLED
 *   startDate  (optional, ISO 8601)
 *   endDate    (optional, ISO 8601)
 *   page       (optional, default: 1)
 *   limit      (optional, default: 50, max: 100)
 */
router.get(
  "/",
  hasPermission("view_bon_livraison"),
  bonLivraisonValidation.getAllValidator,
  validatorMiddleware,
  bonLivraisonController.getAllBonLivraisons,
);

/**
 * POST /api/bon-livraisons
 *
 * Creates a new bon livraison.
 *
 * Key behaviours:
 *   - lines[].unitPrice is TTC — TVA is resolved from family model per product
 *   - lines[].priceField is required (prixVente1 | prixVente2 | prixVente3)
 *   - totalHT is back-calculated: totalTTC / (1 + family.TVA) — TVA is a decimal (0.20)
 *   - status = DRAFT or CONFIRMED → no stock movement
 *   - status = COMPLETED → creates OUTBOUND stock transactions
 *     for all lines where gereEnStock = true
 *   - Document number auto-generated (BL-{YEAR}-{SEQUENCE})
 *   - Entire operation is atomic (prisma.$transaction)
 */
router.post(
  "/",
  hasPermission("create_bon_livraison"),
  bonLivraisonValidation.createValidator,
  validatorMiddleware,
  bonLivraisonController.createBonLivraison,
);

/* =============================================================================
   ITEM ROUTES (/:id must come AFTER all static routes)
============================================================================= */

/**
 * GET /api/bon-livraisons/:id
 *
 * Returns full bon livraison detail including document lines, client,
 * depot, delivery person, linked commande, and stock transactions.
 */
router.get(
  "/:id",
  hasPermission("view_bon_livraison"),
  bonLivraisonValidation.idValidator,
  validatorMiddleware,
  bonLivraisonController.getBonLivraisonById,
);

/**
 * PUT /api/bon-livraisons/:id/validate
 *
 * Manages the status transition of a bon livraison.
 * body: { targetStatus: "COMPLETED" | "DRAFT" }
 *
 * DRAFT → COMPLETED:
 *   - Validates stock for all gereEnStock lines
 *   - Creates OUTBOUND stock transactions (one per stock-managed line)
 *   - Updates document status to COMPLETED
 *
 * COMPLETED → DRAFT:
 *   - Creates RETURN_IN audit records (preserves reversal history)
 *   - Deletes original OUTBOUND records (clean slate for re-validation)
 *   - Reverts document status to DRAFT
 *
 * Disallowed transitions (400 error):
 *   - Same status → same status  (no-op)
 *   - Any other status (CONFIRMED, CANCELLED, PARTIAL) → anything
 */
router.put(
  "/:id/validate",
  hasPermission("validate_bon_livraison"),
  bonLivraisonValidation.validateStatusValidator,
  validatorMiddleware,
  bonLivraisonController.validateBonLivraison,
);

/**
 * PUT /api/bon-livraisons/:id
 *
 * Updates a bon livraison. Only allowed when status = DRAFT.
 * Updatable fields: documentDate, dateLivraison, notes, internalNotes.
 * Lines and financial totals cannot be changed after creation.
 */
router.put(
  "/:id",
  hasPermission("update_bon_livraison"),
  bonLivraisonValidation.updateValidator,
  validatorMiddleware,
  bonLivraisonController.updateBonLivraison,
);

/**
 * DELETE /api/bon-livraisons/:id
 *
 * Deletes a bon livraison.
 * If status = COMPLETED, stock movements are reversed atomically
 * before the document and its lines are removed.
 */
router.delete(
  "/:id",
  hasPermission("delete_bon_livraison"),
  bonLivraisonValidation.idValidator,
  validatorMiddleware,
  bonLivraisonController.deleteBonLivraison,
);

/**
 * GET /api/bon-livraisons/:id/print
 *
 * Generate a PDF for bon livraison.
 *
 * Query params:
 * - view: "inline" → open in browser | omit → download attachment
 *
 * Returns:
 * - PDF (application/pdf), A4 portrait
 * - Header shows société info, client info, document number
 * - Table with all lines
 * - Summary with totals (HT, TVA, TTC)
 * - Signature section for driver and client
 * - Page numbers
 *
 * Permission: view_bon_livraison
 */
router.get(
  "/:id/print",
  hasPermission("view_bon_livraison"),
  bonLivraisonValidation.idValidator,
  validatorMiddleware,
  bonLivraisonController.printBonLivraison,
);

export default router;
