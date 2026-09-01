import express from "express";
import * as ColisTrackingController from "../controllers/colisTrackingController.js";
import { auth } from "../middlewares/authMiddleware.js";
import { hasPermission } from "../middlewares/rbacMiddleware.js";
import * as ColisTrackingValidation from "../validations/colisTrackingValidation.js";

const router = express.Router();

router.use(auth);

/**
 * GET /api/colis-tracking
 * ADVANCED BonLivraisons with commandStatus=ANNULE and a tracking number.
 * Query: search?, page?, limit?
 */
router.get(
  "/",
  hasPermission("view_advanced_bl"),
  ColisTrackingValidation.getAllValidator,
  ColisTrackingController.getAll,
);

/**
 * POST /api/colis-tracking/receive
 * Mark a returned colis as RECEIVED after barcode scan.
 * Body: { colisTrackingNumber }
 */
router.post(
  "/receive",
  hasPermission("view_advanced_bl"),
  ColisTrackingValidation.markAsReceivedValidator,
  ColisTrackingController.markAsReceived,
);

export default router;
