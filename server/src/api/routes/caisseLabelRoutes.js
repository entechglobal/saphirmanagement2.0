import express from "express";
import { auth } from "../middlewares/authMiddleware.js";
import { hasPermission } from "../middlewares/rbacMiddleware.js";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";
import * as caisseLabelController from "../controllers/caisseLabelController.js";
import {
  createLabelValidator,
  updateLabelValidator,
  idValidator,
} from "../validations/caisseLabelValidation.js";

const router = express.Router();

router.use(auth);

// All authenticated users can view labels (needed in charge form dropdown)
router.get("/", caisseLabelController.getAllLabels);
router.get("/:id", idValidator, validatorMiddleware, caisseLabelController.getLabelById);

// Admin only: create, update, delete
router.post(
  "/",
  hasPermission("create_caisse_label"),
  createLabelValidator,
  validatorMiddleware,
  caisseLabelController.createLabel
);

router.put(
  "/:id",
  hasPermission("update_caisse_label"),
  updateLabelValidator,
  validatorMiddleware,
  caisseLabelController.updateLabel
);

router.delete(
  "/:id",
  hasPermission("delete_caisse_label"),
  idValidator,
  validatorMiddleware,
  caisseLabelController.deleteLabel
);

export default router;
