import express from "express";
import * as bonReceptionController from "../controllers/bonReceptionController.js";
import * as bonReceptionValidation from "../validations/bonReceptionValidation.js";
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
 * GET /api/bon-receptions/next-number
 *
 * Returns the next auto-generated document number for a new bon de réception.
 * Format: BR-{YEAR}-{SEQUENCE} (e.g. BR-2026-000001)
 * Sequence resets every year, unique per société.
 *
 * Query params:
 *   societeId  (optional, superAdmin only)
 */
router.get(
  "/next-number",
  hasPermission("view_bon_reception"),
  bonReceptionValidation.getNextNumberValidator,
  validatorMiddleware,
  bonReceptionController.getNextDocumentNumber,
);

/**
 * GET /api/bon-receptions/products
 *
 * Returns a unified list of products (articles without variants + variants)
 * formatted for bon de réception line selection. No stock validation or
 * quantity-related fields are included.
 *
 * Query params:
 *   depotId     (optional)
 *   priceField  (optional)
 *   search      (optional)
 *   page        (optional, default: 1)
 *   limit       (optional, default: 50)
 */
router.get(
  "/products",
  hasPermission("view_bon_reception"),
  bonReceptionValidation.getProductsValidator,
  validatorMiddleware,
  bonReceptionController.getProductsForBonReception,
);

/* =============================================================================
   COLLECTION ROUTES
============================================================================= */

/**
 * GET /api/bon-receptions
 *
 * Returns paginated list of bon receptions.
 * Response fields: documentReference, dateReception, frsName,
 *                  totalHT, totalTVA, totalTTC, status.
 *
 * Query params:
 *   frsId      (optional)
 *   depotId    (optional)
 *   status     (optional) — DRAFT | COMPLETED
 *   search     (optional) — matches documentReference or frsName
 *   startDate  (optional, ISO 8601)
 *   endDate    (optional, ISO 8601)
 *   page       (optional, default: 1)
 *   limit      (optional, default: 50)
 */
router.get(
  "/",
  hasPermission("view_bon_reception"),
  bonReceptionValidation.getAllValidator,
  validatorMiddleware,
  bonReceptionController.getAllBonReceptions,
);

/**
 * POST /api/bon-receptions
 *
 * Creates a new bon de réception.
 *
 * Key behaviours:
 *   - lines[].remise is a discount fraction (0-1), applied to the line cost
 *   - Line cost = lines[].newPrixAchat if provided, else article.prixAchat
 *   - status = DRAFT → no stock movement, document only saved
 *   - status = COMPLETED → creates INBOUND stock transactions (stock increases
 *     in depotId) for every line
 *   - newPrixAchat/newPrixVente1-3 (if provided) update the article catalog
 *     immediately, regardless of status
 *   - documentReference is required and must be unique per société
 *   - Document number auto-generated (BR-{YEAR}-{SEQUENCE})
 */
router.post(
  "/",
  hasPermission("create_bon_reception"),
  bonReceptionValidation.createValidator,
  validatorMiddleware,
  bonReceptionController.createBonReception,
);

/* =============================================================================
   ITEM ROUTES (/:id must come AFTER all static routes)
============================================================================= */

/**
 * GET /api/bon-receptions/:id
 *
 * Returns full bon de réception detail including document lines, fournisseur,
 * depot, and stock transactions.
 */
router.get(
  "/:id",
  hasPermission("view_bon_reception"),
  bonReceptionValidation.idValidator,
  validatorMiddleware,
  bonReceptionController.getBonReceptionById,
);

/**
 * PUT /api/bon-receptions/:id/validate
 *
 * Manages the status transition of a bon de réception.
 * body: { targetStatus: "COMPLETED" | "DRAFT" }
 *
 * DRAFT → COMPLETED:
 *   - Applies INBOUND stock transactions (stock increases at depot)
 *   - Updates document status to COMPLETED
 *
 * COMPLETED → DRAFT:
 *   - Creates ADJUSTMENT audit records (history of reversal)
 *   - Deletes original INBOUND records (clean slate for re-validation)
 *   - Reverts document status to DRAFT
 */
router.put(
  "/:id/validate",
  hasPermission("validate_bon_reception"),
  bonReceptionValidation.validateStatusValidator,
  validatorMiddleware,
  bonReceptionController.validateBonReception,
);

/**
 * GET /api/bon-receptions/:id/print
 *
 * Generates a PDF for a bon de réception (A4 portrait).
 *
 * Query params:
 *   view=inline → open in browser | omit → download as attachment
 */
router.get(
  "/:id/print",
  hasPermission("view_bon_reception"),
  bonReceptionValidation.idValidator,
  validatorMiddleware,
  bonReceptionController.printBonReception,
);

/**
 * PUT /api/bon-receptions/:id
 *
 * Updates a bon de réception.
 *
 * Always updatable (DRAFT and COMPLETED): dateReception, frsId, note.
 * Only updatable in DRAFT: depotId, lines.
 *
 * Mode 1 (no lines): updates metadata only.
 * Mode 2 (lines provided): diff-based line management + totals recalculation.
 *   - Lines with id → updated
 *   - Lines without id → created
 *   - Existing lines absent from array → deleted
 *   - No stock changes — call /validate after editing
 */
router.put(
  "/:id",
  hasPermission("update_bon_reception"),
  bonReceptionValidation.updateValidator,
  validatorMiddleware,
  bonReceptionController.updateBonReception,
);

/**
 * DELETE /api/bon-receptions/:id
 *
 * Deletes a bon de réception.
 * If status = COMPLETED: reverses INBOUND stock movements before deletion.
 */
router.delete(
  "/:id",
  hasPermission("delete_bon_reception"),
  bonReceptionValidation.idValidator,
  validatorMiddleware,
  bonReceptionController.deleteBonReception,
);

export default router;
