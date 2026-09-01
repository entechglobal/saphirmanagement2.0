import { Router } from "express";
import * as InventoryController from "../controllers/inventoryController.js";

// ── Middlewares ────────────────────────────────────────────────────────────────
import { auth } from "../middlewares/authMiddleware.js";
import { hasPermission } from "../middlewares/rbacMiddleware.js";
import { depotFilter } from "../middlewares/depotFilterMiddleware.js";

// ── Validators ─────────────────────────────────────────────────────────────────
import {
  createInventoryValidator,
  inventoryIdValidator,
  depotIdParamValidator,
  dateRangeValidator,
  appendInventoryLinesValidator,
} from "../validations/inventoryValidation.js";

const router = Router();

// ── Global auth ────────────────────────────────────────────────────────────────
router.use(auth); // Every inventory route requires a valid JWT

// =============================================================================
// INVENTORY CRUD
// =============================================================================

/**
 * GET /api/inventories
 *
 * List all inventories
 * Super Admin: all inventories (optional ?societeId or ?depotId filter)
 * Regular User: only own société's inventories
 *
 * Query params: ?page=1&limit=20&startDate=2026-01-01&endDate=2026-02-20
 */
router.get("/", dateRangeValidator, InventoryController.getAllInventories);

/**
 * GET /api/inventories/:id
 *
 * Get a single inventory by ID with full details
 * Includes: lines, transactions, depot, users, summary
 */
router.get("/:id", inventoryIdValidator, InventoryController.getInventoryById);

/**
 * GET /api/inventories/by-depot/:depotId
 *
 * Get all inventories for a specific depot
 *
 * depotFilter middleware:
 *   ✅ Validates depot exists and is active
 *   ✅ Super Admin → any depot
 *   ✅ Regular User → only own société's depots
 *   ✅ Injects req.depot
 */
router.get(
  "/by-depot/:depotId",
  depotIdParamValidator,
  depotFilter,
  dateRangeValidator,
  InventoryController.getInventoriesByDepot,
);

/**
 * GET /api/inventories/:id/variance
 *
 * Get variance report for an inventory
 * Shows only lines with differences (quantityDifference !== 0)
 * Sorted by biggest variance first
 */
router.get(
  "/:id/variance",
  inventoryIdValidator,
  InventoryController.getVarianceReport,
);

/**
 * POST /api/inventories/:id/append-lines
 *
 * Append new lines to an existing inventory (ATOMIC OPERATION)
 *
 * ⚠️ CRITICAL: This is an IMMEDIATE, FINAL operation
 * - Adds new InventoryLines to existing inventory
 * - Generates StockTransaction (type: ADJUSTMENT) for each variance
 * - Updates StockByDepot to match counted quantities
 * - ALL in ONE transaction - either everything succeeds or nothing
 *
 * ⚠️ PREVENTS DUPLICATES:
 * - Cannot add products that already exist in the inventory
 * - Each new line must be a unique product
 *
 * Body:
 * {
 *   "lines": [
 *     {
 *       "articleId": 10,          // articleId OR variantId (not both)
 *       "quantityCounted": 25.5   // actual physical count
 *     },
 *     {
 *       "variantId": 5,
 *       "quantityCounted": 100
 *     }
 *   ]
 * }
 *
 * Use cases:
 * - Missed products during initial count
 * - Progressive counting (count in batches)
 * - Correcting incomplete inventories
 *
 * Permission: create_inventory (same as creating inventory)
 */
router.post(
  "/:id/append-lines",
  hasPermission("create_inventory"),
  inventoryIdValidator,
  appendInventoryLinesValidator,
  InventoryController.appendInventoryLines,
);

/**
 * POST /api/inventories
 *
 * Create a new inventory (ATOMIC OPERATION)
 *
 * ⚠️ CRITICAL: This is an IMMEDIATE, FINAL operation
 * - Creates Inventory + InventoryLines
 * - Generates StockTransaction (type: ADJUSTMENT) for each variance
 * - Updates StockByDepot to match counted quantities
 * - ALL in ONE transaction - either everything succeeds or nothing
 *
 * Body:
 * {
 *   "depotId": 1,
 *   "inventoryDate": "2026-02-20", // optional, defaults to today
 *   "notes": "Monthly physical count",
 *   "lines": [
 *     {
 *       "articleId": 5,           // articleId OR variantId (not both)
 *       "quantityCounted": 95.5   // actual physical count
 *     },
 *     {
 *       "variantId": 2,
 *       "quantityCounted": 120
 *     }
 *   ]
 * }
 *
 * Permission: create_inventory
 */
router.post(
  "/",
  hasPermission("create_inventory"),
  createInventoryValidator,
  InventoryController.createInventory,
);

/**
 * DELETE /api/inventories/:id
 *
 * Delete an inventory and REVERT all stock changes (ATOMIC ROLLBACK)
 *
 * ⚠️ CRITICAL: This reverses the entire inventory atomically
 * - Reverts StockByDepot to pre-inventory quantities
 * - Deletes all StockTransactions linked to this inventory
 * - Deletes all InventoryLines
 * - Deletes the Inventory
 * - ALL in ONE transaction
 *
 * Permission: delete_inventory
 */
//===========================================================For future usage============================================
// router.delete(
//   "/:id",
//   hasPermission("delete_inventory"),
//   inventoryIdValidator,
//   InventoryController.deleteInventory,
// );

export default router;
