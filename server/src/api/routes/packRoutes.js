import { Router } from "express";
import * as PackController from "../controllers/packController.js";
import { auth } from "../middlewares/authMiddleware.js";
import { societyFilter } from "../middlewares/societyFilterMiddleware.js";
import { hasPermission } from "../middlewares/rbacMiddleware.js";
import {
  createValidator,
  updateValidator,
  idValidator,
} from "../validations/packValidation.js";

const router = Router();

router.use(auth);
router.use(societyFilter);

router.get("/", hasPermission("view_pack"), PackController.getAll);

router.get(
  "/products/picker",
  hasPermission("view_pack"),
  PackController.getProductsPicker,
);

/**
 * GET /api/packs/stock-availability?packIds=1,2&depotId=1
 * Checks stock availability for one or more packs in a given depot.
 */
router.get(
  "/stock-availability",
  hasPermission("view_pack"),
  PackController.checkStockAvailability,
);

router.get(
  "/:id",
  hasPermission("view_pack"),
  idValidator,
  PackController.getById,
);

router.post(
  "/",
  hasPermission("create_pack"),
  createValidator,
  PackController.create,
);

router.put(
  "/:id",
  hasPermission("update_pack"),
  updateValidator,
  PackController.update,
);

router.delete(
  "/:id",
  hasPermission("delete_pack"),
  idValidator,
  PackController.remove,
);

export default router;
