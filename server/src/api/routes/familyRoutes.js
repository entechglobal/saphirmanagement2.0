import { Router } from "express";
import * as FamilyController from "../controllers/familyController.js";
import {
  uploadFamilyImage,
  resizeFamilyImage,
} from "../services/familyService.js";

import {
  createFamilyValidator,
  getFamiliesByCategoryValidator,
  getFamilyValidator,
  updateFamilyValidator,
  deleteFamilyValidator,
} from "../validations/familyValidation.js";

import uploadFile from "../utils/uploadFiles.js";

const router = Router();

// Family CRUD
router.get("/", FamilyController.getAllFamilies);
router.get(
  "/category/:categoryId",
  getFamiliesByCategoryValidator,
  FamilyController.getFamiliesByCategory
);
router.post(
  "/",
  uploadFamilyImage,
  createFamilyValidator,
  resizeFamilyImage,
  FamilyController.createFamily
);
router.get("/:id", getFamilyValidator, FamilyController.getFamilyById);

router.put(
  "/:id",
  uploadFamilyImage,
  updateFamilyValidator,
  resizeFamilyImage,
  FamilyController.updateFamily
);
router.delete("/:id", deleteFamilyValidator, FamilyController.deleteFamily);

// Export routes
router.get("/export/csv", FamilyController.exportFamiliesCSV);
router.get("/export/excel", FamilyController.exportFamiliesExcel);

// Import routes
router.post("/import/csv", uploadFile, FamilyController.importFamiliesCSV);
router.post("/import/excel", uploadFile, FamilyController.importFamiliesExcel);

export default router;
