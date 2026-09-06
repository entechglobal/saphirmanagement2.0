import { Router } from "express";
import * as DeliveryShiftController from "../controllers/deliveryShiftController.js";
import { auth } from "../middlewares/authMiddleware.js";
import { societyFilter } from "../middlewares/societyFilterMiddleware.js";
import { hasPermission, hasAnyPermission } from "../middlewares/rbacMiddleware.js";
import {
  idValidator,
  listValidator,
  remitValidator,
} from "../validations/deliveryShiftValidation.js";

const router = Router();

router.use(auth);
router.use(societyFilter);

router.get(
  "/me/active",
  hasPermission("manage_delivery_shifts"),
  DeliveryShiftController.getMyActive,
);

router.post(
  "/start",
  hasPermission("manage_delivery_shifts"),
  DeliveryShiftController.start,
);

router.get(
  "/",
  hasAnyPermission(["view_delivery_shifts", "manage_delivery_shifts"]),
  listValidator,
  DeliveryShiftController.getAll,
);

router.get(
  "/:id",
  hasAnyPermission(["view_delivery_shifts", "manage_delivery_shifts"]),
  idValidator,
  DeliveryShiftController.getById,
);

router.post(
  "/:id/close",
  hasPermission("manage_delivery_shifts"),
  idValidator,
  DeliveryShiftController.close,
);

router.post(
  "/:id/remit",
  hasPermission("manage_delivery_shifts"),
  remitValidator,
  DeliveryShiftController.remit,
);

export default router;
