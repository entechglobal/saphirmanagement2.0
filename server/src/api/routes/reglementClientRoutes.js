import { Router } from "express";
import * as ReglementClientController from "../controllers/reglementClientController.js";
import { auth } from "../middlewares/authMiddleware.js";
import { societyFilter } from "../middlewares/societyFilterMiddleware.js";
import { hasPermission } from "../middlewares/rbacMiddleware.js";
import {
  createReglementValidator,
  getReglementValidator,
  deleteReglementValidator,
  getUnpaidBLsValidator,
} from "../validations/reglementClientValidation.js";

const router = Router();

router.use(auth);
router.use(societyFilter);

/**
 * GET /api/reglements-client
 * Query: ?clientId=&modeReglement=&startDate=&endDate=&page=1&limit=10
 */
router.get("/", ReglementClientController.getAllReglements);

/**
 * GET /api/reglements-client/:id
 */
router.get(
  "/:id",
  getReglementValidator,
  ReglementClientController.getReglementById,
);

/**
 * GET /api/reglements-client/:id/pdf
 */
router.get(
  "/:id/pdf",
  getReglementValidator,
  ReglementClientController.downloadReglementPDF,
);

/**
 * GET /api/reglements-client/unpaid/:clientId
 * Returns unpaid BonLivraisons + advances for a client
 */
router.get(
  "/unpaid/:clientId",
  getUnpaidBLsValidator,
  ReglementClientController.getUnpaidBonLivraisons,
);

/**
 * GET /api/reglements-client/advances/:clientId
 * Returns all advances (avances) for a client
 */
router.get(
  "/advances/:clientId",
  getUnpaidBLsValidator,
  ReglementClientController.getClientAdvances,
);

/**
 * POST /api/reglements-client
 * Body: { date, clientId, modeReglement, montantRegle, solde, documentNumbers?,
 *         refDocument?, dateEcheance?, banqueId? }
 */
router.post(
  "/",
  hasPermission("create_reglements"),
  createReglementValidator,
  ReglementClientController.createReglement,
);

/**
 * DELETE /api/reglements-client/:id
 * Rolls back all BonLivraison amountPaid updates
 */
router.delete(
  "/:id",
  hasPermission("delete_reglements"),
  deleteReglementValidator,
  ReglementClientController.deleteReglement,
);

export default router;
