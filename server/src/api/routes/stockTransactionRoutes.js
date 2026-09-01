import { Router } from "express";
import * as StockTransactionController from "../controllers/stockTransactionController.js";
import { auth } from "../middlewares/authMiddleware.js";
import { hasPermission } from "../middlewares/rbacMiddleware.js";
import { getStockMovementsValidator } from "../validations/stockTransactionValidation.js";

const router = Router();

// Global auth
router.use(auth);

/* =============================================================================
   STOCK TRANSACTION QUERIES
============================================================================= */

/**
 * GET /api/stock-transactions
 *
 * Get stock movements with advanced filtering.
 * Hour-range restrictions from system settings are applied automatically.
 * Hidden articles and variants (visible = false) are excluded.
 *
 * Query params:
 * - societeId         (Super Admin only)
 * - depotId
 * - familyId
 * - articleId
 * - variantId
 * - documentType      BON_LIVRAISON | BON_RETOUR_CLIENT | BON_RECEPTION |
 *                     BON_RETOUR_FOURNISSEUR | INVENTORY | TRANSFER | ADJUSTMENT
 * - movement          ENTREE (quantity > 0) | SORTIE (quantity < 0)
 * - startDate         ISO 8601
 * - endDate           ISO 8601
 * - clientId
 * - fournisseurId
 *
 * Returns:
 * - List of transactions with referenceDocument, type, date,
 *   clientOrFournisseur, productName, quantity (signed), nature,
 *   unitPrice, cumul (running total)
 * - summary: totalTransactions, totalEntree, totalSortie,
 *            finalCumul, totalValue
 *
 * Features:
 * - Sorted chronologically (date ASC)
 * - Running cumulative total (cumul)
 * - Automatic client/fournisseur name resolution
 * - System hour-range filter applied transparently
 * - Invisible products filtered out
 *
 * Permission: view_stock_movements
 */
router.get(
  "/",
  hasPermission("view_stock_movements"),
  getStockMovementsValidator,
  StockTransactionController.getStockMovements,
);

/**
 * GET /api/stock-transactions/print
 *
 * Generate a PDF report of stock movements.
 * Accepts the same query parameters as GET /.
 *
 * Additional query params:
 * - view   "inline" → open in browser | omit → download attachment
 *
 * Returns:
 * - PDF (application/pdf), landscape A4
 * - Header shows active filters and system hour range (if restricted)
 * - Colour-coded rows: green = Augmenter, red = Diminuer
 * - Running cumulative total per row
 * - Summary block with totals
 * - Page numbers
 *
 * Permission: view_stock_movements
 */
router.get(
  "/print",
  hasPermission("view_stock_movements"),
  getStockMovementsValidator,
  StockTransactionController.printStockMovements,
);

/**
 * GET /api/stock-transactions/unified
 *
 * Returns a paginated, unified list of products (articles without variants
 * and article variants), filtered to visible items only.
 *
 * Query params:
 * - familyId
 * - search   (matches barcode or name)
 * - page     (default: 1)
 * - limit    (default: 50)
 */
router.get("/unified", StockTransactionController.getUnifiedProducts);

export default router;
