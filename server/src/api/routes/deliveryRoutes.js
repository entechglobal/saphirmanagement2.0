import { Router } from "express";
import * as DeliveryController from "../controllers/deliveryController.js";
import { auth } from "../middlewares/authMiddleware.js";
import { societyFilter } from "../middlewares/societyFilterMiddleware.js";
import { hasPermission } from "../middlewares/rbacMiddleware.js";
import {
  createDeliveryValidator,
  updateDeliveryValidator,
  getDeliveryValidator,
  deleteDeliveryValidator,
} from "../validations/deliveryValidation.js";

const router = Router();

router.use(auth);
router.use(societyFilter);

/**
 * GET /api/deliveries
 * Query: ?keyword=&type=PARTICULIER|SOCIETE&active=true&page=1&limit=10
 */
router.get("/", DeliveryController.getAllDeliveries);

/**
 * GET /api/deliveries/:id
 */
router.get("/:id", getDeliveryValidator, DeliveryController.getDeliveryById);

/**
 * POST /api/deliveries
 * Body: { name, type?, tel?, address?, active? }
 */
router.post(
  "/",
  hasPermission("create_deliveries"),
  createDeliveryValidator,
  DeliveryController.createDelivery
);

/**
 * PUT /api/deliveries/:id
 */
router.put(
  "/:id",
  hasPermission("update_deliveries"),
  updateDeliveryValidator,
  DeliveryController.updateDelivery
);

/**
 * DELETE /api/deliveries/:id
 */
router.delete(
  "/:id",
  hasPermission("delete_deliveries"),
  deleteDeliveryValidator,
  DeliveryController.deleteDelivery
);

/**
 * PATCH /api/deliveries/:id/toggle-active
 */
router.patch(
  "/:id/toggle-active",
  hasPermission("update_deliveries"),
  getDeliveryValidator,
  DeliveryController.toggleDeliveryActive
);

export default router;
