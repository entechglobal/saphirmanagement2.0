import { Router } from "express";
import * as BanqueController from "../controllers/banqueController.js";
import { auth } from "../middlewares/authMiddleware.js";
import { hasPermission } from "../middlewares/rbacMiddleware.js";
import {
  createBanqueValidator,
  updateBanqueValidator,
  getBanqueValidator,
} from "../validations/banqueValidation.js";

const router = Router();

router.use(auth);

/**
 * GET /api/banques
 * Query: ?keyword=&page=1&limit=10
 */
router.get("/", BanqueController.getAllBanques);

/**
 * GET /api/banques/:id
 */
router.get("/:id", getBanqueValidator, BanqueController.getBanqueById);

/**
 * POST /api/banques
 * Body: { name, RIB?, ville? }
 */
router.post(
  "/",
  hasPermission("create_banques"),
  createBanqueValidator,
  BanqueController.createBanque
);

/**
 * PUT /api/banques/:id
 */
router.put(
  "/:id",
  hasPermission("update_banques"),
  updateBanqueValidator,
  BanqueController.updateBanque
);

/**
 * DELETE /api/banques/:id
 */
router.delete(
  "/:id",
  hasPermission("delete_banques"),
  getBanqueValidator,
  BanqueController.deleteBanque
);

export default router;
