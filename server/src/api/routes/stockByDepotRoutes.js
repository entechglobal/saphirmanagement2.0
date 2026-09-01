import { Router } from "express";
import * as StockController from "../controllers/stockByDepotController.js";

// ── Middlewares ────────────────────────────────────────────────────────────────
import { auth } from "../middlewares/authMiddleware.js";
import { hasPermission } from "../middlewares/rbacMiddleware.js";
import { superAdminOnly } from "../middlewares/superAdminMiddleware.js";
import { depotFilter } from "../middlewares/depotFilterMiddleware.js";

// NOTE: societyFilter is intentionally NOT used here.
//
//   societyFilter sets req.societeId and is designed for models that carry their
//   own societeId column (Client, Fournisseur, Dépôt, …).
//
//   StockByDepot has NO societeId column — its société is inferred through
//   its Depot relation (StockByDepot → Depot → societeId).
//
//   Authorization is handled by:
//     • depotFilter         → validates a single depot param and injects req.depot
//     • transferDepotsFilter → validates two depot body fields and injects
//                              req.fromDepot / req.toDepot
//     • Service layer       → uses req.user.societeId for all remaining scope checks

// ── Validators ────────────────────────────────────────────────────────────────
import {
  createStockValidator,
  updateStockValidator,
  createBulkStockValidator,
  stockIdValidator,
  depotIdParamValidator,
  articleIdParamValidator,
  variantIdParamValidator,
} from "../validations/stockByDepotValidation.js";

const router = Router();

// ── Global auth ───────────────────────────────────────────────────────────────
router.use(auth); // Every stock route requires a valid JWT

// =============================================================================
// STATISTICS  (must be before /:id)
// =============================================================================
/**
 * GET /api/stock/stats
 *
 * Super Admin : global totals — optional ?societeId=X to scope
 * Regular User: own société totals only
 */
router.get("/stats", StockController.getStockStatistics);

// =============================================================================
// LOOKUP BY DEPOT  (must be before /:id)
// =============================================================================
/**
 * GET /api/stock/by-depot/:depotId
 *
 * depotFilter runs here and:
 *   ✅ verifies depot exists
 *   ✅ checks it is active
 *   ✅ Super Admin → any depot (req.depot injected)
 *   ✅ Regular User → must belong to own société (req.depot injected)
 *
 * Query: ?page=1&limit=20&lowStock=true&outOfStock=true
 */
router.get(
  "/by-depot/:depotId",
  depotIdParamValidator, // validates param is a positive integer only
  depotFilter, // DB lookup + active check + société auth → req.depot
  StockController.getStockByDepot,
);

// =============================================================================
// LOOKUP BY ARTICLE  (must be before /:id)
// =============================================================================
/**
 * GET /api/stock/by-article/:articleId
 *
 * Super Admin : stock in all depots globally
 * Regular User: stock only in own société's depots
 */
router.get(
  "/by-article/:articleId",
  articleIdParamValidator,
  StockController.getStockByArticle,
);
// =============================================================================
// LOOKUP BY VARIANT  (must be before /:id)
// =============================================================================
/**
 * GET /api/stock/by-variant/:variantId
 *
 * Get stock for a specific article variant across ALL accessible depots.
 * Super Admin : all depots globally
 * Regular User: only own société's depots
 *
 * Response includes the variant's full attribute list (colour, size, etc.),
 * the parent article, a summary (totalAvailable / reserved / inTransit /
 * depotCount), and per-depot breakdown with isLowStock / isOutOfStock flags.
 */
router.get(
  "/by-variant/:variantId",
  variantIdParamValidator,
  StockController.getStockByVariant,
);

// =============================================================================
// BULK CREATE  (must be before /:id)
// =============================================================================
/**
 * POST /api/stock/bulk
 *
 * Super Admin ONLY — useful for initial stock setup across multiple depots.
 * superAdminOnly middleware hard-blocks any non-super-admin before the handler.
 *
 * Body: { entries: [ { depotId, articleId|variantId, quantityAvailable, … } ] }
 */
router.post(
  "/bulk",
  // hasPermission("manage_stock"),

  // superAdminOnly, // blocks all non-super-admins with 403
  createBulkStockValidator,
  StockController.createBulkStock,
);

// =============================================================================
// CRUD
// =============================================================================

/**
 * GET /api/stock
 *
 * Super Admin : all depots — optional ?depotId=X or ?societeId=X filters
 * Regular User: only own société's depots
 *
 * Query: ?page=1&limit=20&articleId=X&lowStock=true&outOfStock=true
 */
router.get("/", StockController.getAllStock);

/**
 * GET /api/stock/:id
 *
 * Super Admin : any record
 * Regular User: only own société's records
 */
router.get("/:id", stockIdValidator, StockController.getStockById);

/**
 * POST /api/stock
 *
 * Super Admin : depotId REQUIRED — can target any depot
 * Regular User: depotId optional — defaults to PRINCIPAL depot of own société;
 *               if provided, must belong to own société
 *
 * Body: { depotId?, articleId|variantId, quantityAvailable?, reorderPoint?, … }
 */
router.post(
  "/",
  hasPermission("manage_stock"),
  createStockValidator,
  StockController.createStock,
);

/**
 * PUT /api/stock/:id
 *
 * Update quantities, reorder thresholds, location, lastInventoryDate.
 * articleId, variantId and depotId cannot be changed.
 *
 * Super Admin : any record
 * Regular User: only own société's records
 */
router.put(
  "/:id",
  hasPermission("manage_stock"),
  updateStockValidator,
  StockController.updateStock,
);

/**
 * DELETE /api/stock/:id
 *
 * Only allowed when ALL quantities are zero.
 * Super Admin : any record
 * Regular User: only own société's records
 */
router.delete(
  "/:id",
  hasPermission("manage_stock"),
  stockIdValidator,
  StockController.deleteStock,
);

export default router;
