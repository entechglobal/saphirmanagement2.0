import express from "express";
import * as AdvancedBLController from "../controllers/advancedBonLivraisonController.js";
import * as AdvancedBLValidation from "../validations/advancedBonLivraisonValidation.js";
import { auth } from "../middlewares/authMiddleware.js";
import { hasPermission } from "../middlewares/rbacMiddleware.js";

const router = express.Router();

router.use(auth);

/**
 * GET /api/advanced-bon-livraisons
 * Returns paginated list of ADVANCED bon livraisons.
 * Filters: clientId, depotId, agenceId, commandStatus,
 *          commercialId, preparateurId, livreurId, startDate, endDate
 */
router.get(
  "/",
  hasPermission("view_advanced_bl"),
  AdvancedBLValidation.getAllValidator,
  AdvancedBLController.getAll,
);

/**
 * POST /api/advanced-bon-livraisons
 * Creates a new ADVANCED bon livraison with workflow status EN_COURS.
 * No stock impact at creation — stock deducted at PREPARE status,
 * which also creates a STANDARD BonLivraison linked to the order.
 */
router.post(
  "/",
  hasPermission("create_advanced_bl"),
  AdvancedBLValidation.createValidator,
  AdvancedBLController.create,
);

/**
 * GET /api/advanced-bon-livraisons/picker
 * Unified picker for products or packs.
 * Query: products=true | pack=true, search, priceField, page, limit
 */
router.get(
  "/picker",
  hasPermission("view_advanced_bl"),
  AdvancedBLValidation.pickerValidator,
  AdvancedBLController.getProductsOrPacks,
);

/**
 * GET /api/advanced-bon-livraisons/livreurs
 * Unified livreurs picker.
 * Query: type=intern|extern, search, active, page, limit
 */
router.get(
  "/livreurs",
  hasPermission("view_advanced_bl"),
  AdvancedBLValidation.livreursValidator,
  AdvancedBLController.getLivreurs,
);

/**
 * GET /api/advanced-bon-livraisons/preparateurs
 * Returns paginated users with the Preparateur role.
 * Query: search, active, page, limit
 */
router.get(
  "/preparateurs",
  hasPermission("view_advanced_bl"),
  AdvancedBLValidation.preparateursValidator,
  AdvancedBLController.getPreparateurs,
);

/**
 * GET /api/advanced-bon-livraisons/commercials
 * Returns users with the Commercial role (id + name).
 */
router.get(
  "/commercials",
  hasPermission("view_advanced_bl"),
  AdvancedBLController.getCommercials,
);

/**
 * GET /api/advanced-bon-livraisons/commercial-stats
 * Commission & order stats grouped by commercial.
 * Query: dateFrom?, dateTo?, commercialId?, commandStatus? (repeatable / comma-separated)
 */
router.get(
  "/commercial-stats",
  hasPermission("view_advanced_bl"),
  AdvancedBLController.getCommercialStats,
);

/**
 * GET /api/advanced-bon-livraisons/top-commercials
 * Top commercials by commission for dashboard sidebar.
 * Query: dateFrom?, dateTo?, limit?
 */
router.get(
  "/top-commercials",
  hasPermission("view_advanced_bl"),
  AdvancedBLController.getTopCommercials,
);

/**
 * GET /api/advanced-bon-livraisons/workflow-counts
 * Role-aware counters of Advanced BLs grouped by next actionable step.
 * Query: dateFrom?, dateTo? (filters on dateLivraison)
 */
router.get(
  "/workflow-counts",
  hasPermission("view_advanced_bl"),
  AdvancedBLController.getWorkflowCounts,
);
/**
 * GET /api/advanced-bon-livraisons/BLs-By-Status
 * Paginated BL list filtered by status — drives dashboard card drill-down.
 * Query: status (required), livreurId?, page?, limit?
 */
router.get(
  "/BLs-By-Status",
  hasPermission("view_advanced_bl"),
  AdvancedBLValidation.blsByStatusValidator,
  AdvancedBLController.getBLsByStatus,
);

/**
 * GET /api/advanced-bon-livraisons/planning
 * Operational planning view grouped by day across [startDate, endDate].
 * Query: livreurId?, startDate, endDate
 */
router.get(
  "/planning",
  hasPermission("view_advanced_bl"),
  AdvancedBLValidation.planningValidator,
  AdvancedBLController.getPlanning,
);

/**
 * GET /api/advanced-bon-livraisons/:id
 */
router.get(
  "/:id",
  hasPermission("view_advanced_bl"),
  AdvancedBLValidation.idValidator,
  AdvancedBLController.getById,
);

/**
 * GET /api/advanced-bon-livraisons/:id/details
 * Full UI aggregation: { timeline, destinataire, blInfo, propos, history }
 */
router.get(
  "/:id/details",
  hasPermission("view_advanced_bl"),
  AdvancedBLValidation.idValidator,
  AdvancedBLController.getAdvancedBLDetails,
);

/**
 * PUT /api/advanced-bon-livraisons/:id/status
 * Transition workflow status.
 * body: { targetStatus: "CONFIRME" | "PREPARE" | ... }
 * Stock OUTBOUND on PREPARE; INBOUND rollback on ANNULE
 * from PREPARE/COLLECTE/EN_ROUTE.
 */
router.put(
  "/:id/status",
  hasPermission("update_status_advanced_bl"),
  AdvancedBLValidation.transitionStatusValidator,
  AdvancedBLController.transitionStatus,
);

/**
 * POST /api/advanced-bon-livraisons/:id/suspended
 * Toggle suspension. Blocks transitionStatus while isSuspended = true.
 * Logs SUSPENDED or CONTINUED in history.
 */
router.post(
  "/:id/suspended",
  hasPermission("update_status_advanced_bl"),
  AdvancedBLValidation.idValidator,
  AdvancedBLController.suspended,
);

/**
 * POST /api/advanced-bon-livraisons/:id/report
 * Mark BL as reported (parallel operational condition).
 * body: { reason, nextDeliveryDate }
 * Does NOT change commandStatus or move stock.
 */
router.post(
  "/:id/report",
  hasPermission("report_advanced_bl"),
  AdvancedBLValidation.reportValidator,
  AdvancedBLController.reportBL,
);

/**
 * POST /api/advanced-bon-livraisons/:id/resume
 * Clear the reported flag — workflow continues from current status.
 */
router.post(
  "/:id/resume",
  hasPermission("report_advanced_bl"),
  AdvancedBLValidation.idValidator,
  AdvancedBLController.resumeReportedBL,
);

/**
 * PUT /api/advanced-bon-livraisons/:id
 * Update data (only when commandStatus = EN_COURS).
 */
router.put(
  "/:id",
  hasPermission("update_advanced_bl"),
  AdvancedBLValidation.updateValidator,
  AdvancedBLController.update,
);

/**
 * DELETE /api/advanced-bon-livraisons/:id
 * Only when commandStatus is EN_COURS or ANNULE.
 */
router.delete(
  "/:id",
  hasPermission("delete_advanced_bl"),
  AdvancedBLValidation.idValidator,
  AdvancedBLController.remove,
);

/**
 * GET /api/advanced-bon-livraisons/:id/print
 * Generate PDF for advanced bon livraison.
 */
router.get(
  "/:id/print",
  hasPermission("view_advanced_bl"),
  AdvancedBLValidation.idValidator,
  AdvancedBLController.printAdvancedBL,
);

export default router;
