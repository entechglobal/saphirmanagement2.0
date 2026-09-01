import { Router } from "express";
import * as ClientController from "../controllers/clientController.js";
import { auth } from "../middlewares/authMiddleware.js";
import { societyFilter } from "../middlewares/societyFilterMiddleware.js";
import { hasPermission } from "../middlewares/rbacMiddleware.js";
import {
  createClientValidator,
  getClientValidator,
  updateClientValidator,
  deleteClientValidator,
  checkCreditLimitValidator,
} from "../validations/clientValidation.js";
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
 * Get Client Statistics
 * Super Admin: All sociétés stats
 * Regular User: Own société stats
 *
 * GET /api/clients/stats/summary
 * Access: Authenticated (société-filtered)
 */
router.get("/stats/summary", ClientController.getClientStatistics);

// ============================================
// EXPORT ROUTES (Must be before /:id)
// ============================================
/**
 * Export Clients to CSV
 * Super Admin: All clients (with ?societeId=X)
 * Regular User: Own société clients
 *
 * GET /api/clients/export/csv
 * Access: Authenticated (société-filtered)
 */
router.get("/export/csv", ClientController.exportClientsCSV);

/**
 * Export Clients to Excel
 * Super Admin: All clients (with ?societeId=X)
 * Regular User: Own société clients
 *
 * GET /api/clients/export/excel
 * Access: Authenticated (société-filtered)
 */
router.get("/export/excel", ClientController.exportClientsExcel);

// ============================================
// IMPORT ROUTES (Must be before /:id)
// ============================================
/**
 * Import Clients from CSV
 * Imports to current user's société
 *
 * POST /api/clients/import/csv
 * Body: FormData with file
 * Access: Authenticated + Permission
 */
router.post(
  "/import/csv",
  hasPermission("import_clients"),
  uploadFile,
  ClientController.importClientsCSV,
);

/**
 * Import Clients from Excel
 * Imports to current user's société
 *
 * POST /api/clients/import/excel
 * Body: FormData with file
 * Access: Authenticated + Permission
 */
router.post(
  "/import/excel",
  hasPermission("import_clients"),
  uploadFile,
  ClientController.importClientsExcel,
);

// ============================================
// CLIENT CRUD ROUTES
// ============================================

/**
 * Get All Clients
 * Super Admin: All clients (with ?societeId=X to filter)
 * Regular User: Only their société's clients
 *
 * GET /api/clients?page=1&limit=10&search=&type=&active=true
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
router.get("/", ClientController.getAllClients);

/**
 * Get Client by ID
 *
 * GET /api/clients/:id
 * Access: Authenticated (own société only)
 */
router.get("/:id", getClientValidator, ClientController.getClientById);

/**
 * Create New Client
 * Creates client in current user's société
 *
 * POST /api/clients
 * Body: { name, phone, type, email, ... }
 * Access: Authenticated + Permission
 */
router.post(
  "/",
  hasPermission("create_clients"),
  createClientValidator,
  ClientController.createClient,
);

/**
 * Update Client
 * Can only update clients in own société
 *
 * PUT /api/clients/:id
 * Body: { name, phone, email, ... }
 * Access: Authenticated + Permission + Own Société
 */
router.put(
  "/:id",
  hasPermission("update_clients"),
  updateClientValidator,
  ClientController.updateClient,
);

/**
 * Delete Client
 * Can only delete clients in own société
 * Cannot delete if client has active documents
 *
 * DELETE /api/clients/:id
 * Access: Authenticated + Permission + Own Société
 */
router.delete(
  "/:id",
  hasPermission("delete_clients"),
  deleteClientValidator,
  ClientController.deleteClient,
);

// ============================================
// BUSINESS LOGIC ROUTES
// ============================================

/**
 * Check Credit Limit
 * Verify if client can place order of given amount
 *
 * POST /api/clients/:id/check-credit
 * Body: { amount: 5000 }
 * Access: Authenticated + Own Société
 */
router.post(
  "/:id/check-credit",
  checkCreditLimitValidator,
  ClientController.checkCreditLimit,
);

export default router;
