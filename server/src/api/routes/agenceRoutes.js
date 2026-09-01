import { Router } from "express";
import * as AgenceController from "../controllers/agenceController.js";
import { auth } from "../middlewares/authMiddleware.js";
import { societyFilter } from "../middlewares/societyFilterMiddleware.js";
import { hasPermission } from "../middlewares/rbacMiddleware.js";
import {
  createValidator,
  updateValidator,
  idValidator,
} from "../validations/agenceValidation.js";

const router = Router();

router.use(auth);
router.use(societyFilter);

router.get("/", hasPermission("view_agence"), AgenceController.getAll);

router.get(
  "/:id",
  hasPermission("view_agence"),
  idValidator,
  AgenceController.getById,
);

router.post(
  "/",
  hasPermission("create_agence"),
  createValidator,
  AgenceController.create,
);

router.put(
  "/:id",
  hasPermission("update_agence"),
  updateValidator,
  AgenceController.update,
);

router.delete(
  "/:id",
  hasPermission("delete_agence"),
  idValidator,
  AgenceController.remove,
);

export default router;
