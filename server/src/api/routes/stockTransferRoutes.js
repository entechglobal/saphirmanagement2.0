import { Router } from "express";
import * as StockTransferController from "../controllers/stockTransferController.js";

// ── Middlewares ────────────────────────────────────────────────────────────────
import { auth } from "../middlewares/authMiddleware.js";
import { hasPermission } from "../middlewares/rbacMiddleware.js";

// ── Validators ─────────────────────────────────────────────────────────────────
import {
  createTransferValidator,
  transferIdValidator,
  depotIdParamValidator,
  getTransfersQueryValidator,
  appendTransferLinesValidator,
} from "../validations/stockTransferValidation.js";

const router = Router();

// ── Global auth ────────────────────────────────────────────────────────────────
router.use(auth); // Every transfer route requires a valid JWT

// =============================================================================
// STOCK TRANSFER CRUD
// =============================================================================

/**
 * GET /api/transfers
 *
 * List all transfers with filtering
 *
 * Super Admin: all transfers (optional ?societeId filter)
 * Regular User: only own société's transfers
 *
 * Query params:
 * - page, limit (pagination)
 * - societeId (Super Admin only)
 * - sourceDepotId (filter by source)
 * - destinationDepotId (filter by destination)
 * - status=PENDING|COMPLETED (filter by status)
 * - startDate, endDate (date range)
 */
router.get(
  "/",
  getTransfersQueryValidator,
  StockTransferController.getAllTransfers,
);

/**
 * GET /api/transfers/:id
 *
 * Get transfer by ID with full details
 * Includes: lines, transactions, depots, users
 */
router.get(
  "/:id",
  transferIdValidator,
  StockTransferController.getTransferById,
);

/**
 * GET /api/transfers/by-depot/:depotId
 *
 * Get all transfers for a specific depot (as source OR destination)
 *
 * Super Admin: any depot
 * Regular User: only own société's depots
 *
 * Query params: ?status=PENDING&startDate=2026-01-01
 */
router.get(
  "/by-depot/:depotId",
  depotIdParamValidator,
  StockTransferController.getTransfersByDepot,
);

/**
 * POST /api/transfers/:id/append-lines
 *
 * Append new lines to an existing transfer (ATOMIC OPERATION)
 *
 * ⚠️ STATUS-BASED BEHAVIOR:
 *
 * If PENDING:
 * - Simply adds new lines
 * - NO stock movement
 * - NO transactions
 * - NO stock validation
 *
 * If COMPLETED:
 * - Adds new lines
 * - ✅ VALIDATES stock availability in source
 * - ✅ DECREASES source depot stock
 * - ✅ INCREASES destination depot stock
 * - ✅ Creates TRANSFER_OUT + TRANSFER_IN transactions
 * - ALL in ONE transaction
 *
 * ⚠️ PREVENTS DUPLICATES:
 * - Cannot add products that already exist in the transfer
 * - Each new line must be a unique product
 *
 * Body:
 * {
 *   "lines": [
 *     {
 *       "articleId": 10,          // articleId OR variantId (not both)
 *       "quantityReceived": 25
 *     },
 *     {
 *       "variantId": 5,
 *       "quantityReceived": 50
 *     }
 *   ]
 * }
 *
 * Use cases:
 * - Missed products during initial transfer creation
 * - Adding more items to existing transfer
 * - Progressive/batch transfers
 *
 * Permission: create_transfer (same as creating transfer)
 */
router.post(
  "/:id/append-lines",
  hasPermission("create_transfer"),
  transferIdValidator,
  appendTransferLinesValidator,
  StockTransferController.appendTransferLines,
);

/**
 * POST /api/transfers/:id/validate
 *
 * Validate/Complete a PENDING transfer (ATOMIC OPERATION)
 *
 * ⚠️ CRITICAL: Status Transition Rules
 *
 * ALLOWED:
 * - PENDING → COMPLETED ✅
 *
 * FORBIDDEN:
 * - COMPLETED → COMPLETED ❌ (Error: "Transfer is already completed")
 * - COMPLETED → PENDING ❌ (Not possible)
 *
 * What happens when validating:
 * 1. ✅ Validates stock availability in source depot for ALL lines
 * 2. ✅ Changes status from PENDING to COMPLETED
 * 3. ✅ Decreases stock in source depot
 * 4. ✅ Increases stock in destination depot (creates if needed)
 * 5. ✅ Creates TRANSFER_OUT transactions (source)
 * 6. ✅ Creates TRANSFER_IN transactions (destination)
 * 7. ✅ Sets validatedBy and validatedAt
 * 8. ✅ ALL in ONE atomic transaction
 *
 * Use cases:
 * - Approval workflow: Create as PENDING → Review → Validate
 * - Two-step transfers: Plan first, execute later
 * - Manager approval required before stock movement
 *
 * Requirements:
 * - Transfer must be PENDING
 * - Transfer must have at least 1 line
 * - Both depots must be active
 * - Sufficient stock in source depot
 *
 * Permission: validate_transfer
 */
router.post(
  "/:id/validate",
  hasPermission("validate_transfer"),
  transferIdValidator,
  StockTransferController.validateTransfer,
);

/**
 * POST /api/transfers
 *
 * Create a new stock transfer (ATOMIC OPERATION)
 *
 * ⚠️ TWO MODES:
 *
 * 1. PENDING (Default):
 *    - Creates transfer + lines
 *    - NO stock movement
 *    - NO transactions
 *    - Use for: Planning, approval workflows
 *
 * 2. COMPLETED:
 *    - Creates transfer + lines
 *    - ✅ IMMEDIATE stock movement
 *    - ✅ Creates TRANSFER_OUT + TRANSFER_IN transactions
 *    - ✅ Updates StockByDepot in both depots
 *    - ✅ Validates stock availability
 *    - Use for: Instant transfers
 *
 * Body:
 * {
 *   "sourceDepotId": 1,
 *   "destinationDepotId": 2,
 *   "status": "COMPLETED",         // Optional: PENDING or COMPLETED
 *   "transferDate": "2026-02-24",  // Optional, defaults to today
 *   "notes": "Restock outlet",
 *   "lines": [
 *     {
 *       "articleId": 5,            // articleId OR variantId (not both)
 *       "quantityReceived": 100    // Must be > 0
 *     },
 *     {
 *       "variantId": 2,
 *       "quantityReceived": 50
 *     }
 *   ]
 * }
 *
 * ⚠️ CRITICAL RULES:
 * - Source and destination must be DIFFERENT depots
 * - Both depots must belong to SAME société
 * - Both depots must be ACTIVE
 * - Each product can appear only ONCE
 * - If COMPLETED: validates stock availability in source
 *
 * Permission: create_transfer
 */
router.post(
  "/",
  hasPermission("create_transfer"),
  createTransferValidator,
  StockTransferController.createTransfer,
);

/**
 * DELETE /api/transfers/:id
 *
 * Delete transfer and REVERT stock if COMPLETED (ATOMIC ROLLBACK)
 *
 * ⚠️ BEHAVIOR:
 *
 * If PENDING:
 * - Simply deletes transfer + lines
 * - No stock impact
 *
 * If COMPLETED:
 * - Reverts stock changes atomically:
 *   • Source depot: adds back quantity
 *   • Destination depot: subtracts quantity
 * - Deletes transactions
 * - Deletes transfer + lines
 * - ALL in ONE transaction
 *
 * Permission: delete_transfer
 */
router.delete(
  "/:id",
  hasPermission("delete_transfer"),
  transferIdValidator,
  StockTransferController.deleteTransfer,
);

export default router;
