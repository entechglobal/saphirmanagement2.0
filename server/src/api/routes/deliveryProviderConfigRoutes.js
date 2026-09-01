import express from "express";
import * as Controller from "../controllers/deliveryProviderConfigController.js";
import * as Validation from "../validations/deliveryProviderConfigValidation.js";
import { auth } from "../middlewares/authMiddleware.js";
import { hasPermission } from "../middlewares/rbacMiddleware.js";
import societyFilter from "../middlewares/societyFilterMiddleware.js";

const router = express.Router();
router.use(auth);

// List configs — used by frontend picker when creating an advanced BL
router.get(
  "/",
  hasPermission("view_advanced_bl"),
  Validation.getAllValidator,
  Controller.getAll,
);

router.get(
  "/:id",
  hasPermission("manage_settings"),
  Validation.idValidator,
  Controller.getById,
);

router.post(
  "/",
  hasPermission("manage_settings"),
  Validation.createValidator,
  Controller.create,
);

router.put(
  "/:id",
  hasPermission("manage_settings"),
  Validation.updateValidator,
  Controller.update,
);

router.delete(
  "/:id",
  hasPermission("manage_settings"),
  Validation.idValidator,
  Controller.remove,
);

export default router;
