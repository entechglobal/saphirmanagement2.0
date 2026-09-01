import { Router } from "express";
import * as UnitController from "../controllers/unitController.js";

import {
  createUnitValidator,
  updateUnitValidator,
  getUnitValidator,
  deleteUnitValidator,
} from "../validations/unitValidation.js";

const router = Router();

/* =========================
   CRUD ROUTES
========================= */
router.get("/", UnitController.getAllUnits);

router.post("/", createUnitValidator, UnitController.createUnit);

router.get("/:id", getUnitValidator, UnitController.getUnitById);

router.put("/:id", updateUnitValidator, UnitController.updateUnit);

router.delete("/:id", deleteUnitValidator, UnitController.deleteUnit);

/* =========================
   UTILITY ROUTES
========================= */
// router.get("/type/filter", UnitController.getUnitsByType);

// router.get("/:id/usage", getUnitValidator, UnitController.checkUnitUsage);

export default router;
