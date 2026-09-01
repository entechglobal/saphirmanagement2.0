import { Router } from "express";
import * as ReglementFournisseurController from "../controllers/reglementFournisseurController.js";
import { auth } from "../middlewares/authMiddleware.js";
import { societyFilter } from "../middlewares/societyFilterMiddleware.js";
import { hasPermission } from "../middlewares/rbacMiddleware.js";
import {
  createReglementValidator,
  getReglementValidator,
  deleteReglementValidator,
  getUnpaidBRsValidator,
} from "../validations/reglementFournisseurValidation.js";

const router = Router();

router.use(auth);
router.use(societyFilter);

/**
 * GET /api/reglements-fournisseur
 * Query: ?fournisseurId=&modeReglement=&startDate=&endDate=&page=1&limit=10
 */
router.get("/", ReglementFournisseurController.getAllReglements);

/**
 * GET /api/reglements-fournisseur/:id
 */
router.get("/:id", getReglementValidator, ReglementFournisseurController.getReglementById);

/**
 * GET /api/reglements-fournisseur/:id/pdf
 */
router.get("/:id/pdf", getReglementValidator, ReglementFournisseurController.downloadReglementPDF);

/**
 * GET /api/reglements-fournisseur/unpaid/:fournisseurId
 * Returns unpaid BonReceptions + advances for a fournisseur
 */
router.get(
  "/unpaid/:fournisseurId",
  getUnpaidBRsValidator,
  ReglementFournisseurController.getUnpaidBonReceptions
);

/**
 * GET /api/reglements-fournisseur/advances/:fournisseurId
 * Returns all advances (avances) for a fournisseur
 */
router.get(
  "/advances/:fournisseurId",
  getUnpaidBRsValidator,
  ReglementFournisseurController.getFournisseurAdvances
);

/**
 * POST /api/reglements-fournisseur
 * Body: { date, fournisseurId, modeReglement, montantRegle, solde, documentNumbers?,
 *         refDocument?, dateEcheance?, banqueId? }
 */
router.post(
  "/",
  hasPermission("create_reglements_fournisseur"),
  createReglementValidator,
  ReglementFournisseurController.createReglement
);

/**
 * DELETE /api/reglements-fournisseur/:id
 * Rolls back all BonReception amountPaid updates
 */
router.delete(
  "/:id",
  hasPermission("delete_reglements_fournisseur"),
  deleteReglementValidator,
  ReglementFournisseurController.deleteReglement
);

export default router;
