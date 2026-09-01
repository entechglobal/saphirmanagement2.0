import { Router } from "express";
import * as AttributeController from "../controllers/attributeController.js";
import {
  getAttributeValidator,
  deleteAttributeValidator,
  createAttributeWithValuesValidator,
  updateAttributeWithValuesValidator,
} from "../validations/attributeValidation.js";

const router = Router();

// Get all attributes with their values (utility endpoint)
router.get("/with-values", AttributeController.getAttributesWithValues);

router.get("/:id", getAttributeValidator, AttributeController.getAttributeById);

router.delete(
  "/:id",
  deleteAttributeValidator,
  AttributeController.deleteAttribute
);

// Create attribute with values (combined endpoint)
router.post(
  "/with-values",
  createAttributeWithValuesValidator,
  AttributeController.createAttributeWithValues
);

router.put(
  "/:id/with-values",
  updateAttributeWithValuesValidator,
  AttributeController.updateAttributeWithValues
);

export default router;
