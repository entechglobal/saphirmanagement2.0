import express from "express";
import * as bonRetourClientController from "../controllers/bonRetourClientController.js";
import * as bonRetourClientValidation from "../validations/bonRetourClientValidation.js";
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
 * GET /api/bon-retour-clients/next-number
 *
 * Returns the next auto-generated document number for a new bon retour client.
 * Format: BRC-{YEAR}-{SEQUENCE} (e.g. BRC-2026-000001)
 * Sequence resets every year, unique per société.
 *
 * Query params:
 *   societeId  (optional, superAdmin only)
 */
router.get(
  "/next-number",
  hasPermission("view_bon_retour_client"),
  bonRetourClientValidation.getNextNumberValidator,
  validatorMiddleware,
  bonRetourClientController.getNextDocumentNumber,
);

/**
 * GET /api/bon-retour-clients/products
 *
 * Returns a unified list of products (articles without variants + variants)
 * formatted for bon retour client line selection.
 *
 * Query params:
 *   depotId     (required) — stock levels shown for this depot
 *   priceField  (optional, default: prixVente3)
 *   search      (optional)
 *   categoryId  (optional)
 *   familyId    (optional)
 *   page        (optional, default: 1)
 *   limit       (optional, default: 50, max: 100)
 */
router.get(
  "/products",
  hasPermission("view_bon_retour_client"),
  bonRetourClientValidation.getProductsValidator,
  validatorMiddleware,
  bonRetourClientController.getProductsForBonRetourClient,
);

/* =============================================================================
   COLLECTION ROUTES
============================================================================= */

/**
 * GET /api/bon-retour-clients
 *
 * Returns paginated list of bon retour clients.
 * Response fields: documentNumber, dateRetour, createdBy, clientName,
 *                  totalHT, totalTVA, totalTTC.
 *
 * Query params:
 *   clientId   (optional)
 *   depotId    (optional)
 *   status     (optional) — DRAFT | COMPLETED | CANCELLED
 *   startDate  (optional, ISO 8601)
 *   endDate    (optional, ISO 8601)
 *   page       (optional, default: 1)
 *   limit      (optional, default: 50, max: 100)
 */
router.get(
  "/",
  hasPermission("view_bon_retour_client"),
  bonRetourClientValidation.getAllValidator,
  validatorMiddleware,
  bonRetourClientController.getAllBonRetourClients,
);

/**
 * POST /api/bon-retour-clients
 *
 * Creates a new bon retour client.
 *
 * Key behaviours:
 *   - lines[].unitPrice is TTC — TVA resolved from family model per product
 *   - lines[].priceField is required per line
 *   - status = DRAFT → no stock movement, no financial reconciliation
 *   - status = COMPLETED → creates RETURN_IN stock transactions (stock increases)
 *     and applies totalTTC to amountPaid of the referenced BonLivraison(s)
 *   - bonLivraisonId is optional; if omitted, cascades across oldest unpaid BLs
 *   - Document number auto-generated (BRC-{YEAR}-{SEQUENCE})
 */
router.post(
  "/",
  hasPermission("create_bon_retour_client"),
  bonRetourClientValidation.createValidator,
  validatorMiddleware,
  bonRetourClientController.createBonRetourClient,
);

/* =============================================================================
   ITEM ROUTES (/:id must come AFTER all static routes)
============================================================================= */

/**
 * GET /api/bon-retour-clients/:id
 *
 * Returns full bon retour client detail including document lines, client,
 * depot, linked BonLivraison, stock transactions, and downstream avoirs.
 */
router.get(
  "/:id",
  hasPermission("view_bon_retour_client"),
  bonRetourClientValidation.idValidator,
  validatorMiddleware,
  bonRetourClientController.getBonRetourClientById,
);

/**
 * PUT /api/bon-retour-clients/:id/validate
 *
 * Manages the status transition of a bon retour client.
 * body: { targetStatus: "COMPLETED" | "DRAFT" }
 *
 * DRAFT → COMPLETED:
 *   - Applies RETURN_IN stock transactions (stock increases at depot)
 *   - Applies financial reconciliation (amountPaid on BL documents)
 *   - Updates document status to COMPLETED
 *
 * COMPLETED → DRAFT:
 *   - Creates RETURN_OUT audit records (history of reversal)
 *   - Deletes original RETURN_IN records (clean slate for re-validation)
 *   - Reverses financial reconciliation
 *   - Reverts document status to DRAFT
 */
router.put(
  "/:id/validate",
  hasPermission("validate_bon_retour_client"),
  bonRetourClientValidation.validateStatusValidator,
  validatorMiddleware,
  bonRetourClientController.validateBonRetourClient,
);

/**
 * GET /api/bon-retour-clients/:id/print
 *
 * Generates a PDF for a bon retour client (A4 portrait).
 * Includes: header (société, client, depot, BL source, motif),
 *           lines table, totals, and signature section.
 *
 * Query params:
 *   view=inline → open in browser | omit → download as attachment
 */
router.get(
  "/:id/print",
  hasPermission("view_bon_retour_client"),
  bonRetourClientValidation.idValidator,
  validatorMiddleware,
  bonRetourClientController.printBonRetourClient,
);

/**
 * PUT /api/bon-retour-clients/:id
 *
 * Updates a bon retour client. Only allowed when status = DRAFT.
 *
 * Mode 1 (no lines): updates metadata only
 *   (clientId, depotId, bonLivraisonId, documentDate, dateRetour,
 *    motifRetour, notes, internalNotes).
 *
 * Mode 2 (lines provided): diff-based line management + totals recalculation.
 *   - Lines with id → updated
 *   - Lines without id → created
 *   - Existing lines absent from array → deleted
 *   - No stock/financial changes — call /validate after editing
 */
router.put(
  "/:id",
  hasPermission("update_bon_retour_client"),
  bonRetourClientValidation.updateValidator,
  validatorMiddleware,
  bonRetourClientController.updateBonRetourClient,
);

/**
 * DELETE /api/bon-retour-clients/:id
 *
 * Deletes a bon retour client.
 * If status = COMPLETED: reverses RETURN_IN stock movements and financial
 * reconciliation atomically before deletion.
 */
router.delete(
  "/:id",
  hasPermission("delete_bon_retour_client"),
  bonRetourClientValidation.idValidator,
  validatorMiddleware,
  bonRetourClientController.deleteBonRetourClient,
);

export default router;
