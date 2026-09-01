import { Router } from "express";
import * as CategoryController from "../controllers/categoryController.js";
import {
  uploadCategoryImage,
  resizeImage,
} from "../services/categoryService.js";

import uploadFile from "../utils/uploadFiles.js";

const router = Router();

// Category CRUD
router.get("/", CategoryController.getAllCategories);

router.post(
  "/",
  uploadCategoryImage,
  resizeImage,
  CategoryController.createCategory
);
router.get("/:id", CategoryController.getCategoryById);

router.put(
  "/:id",
  uploadCategoryImage,
  resizeImage,
  CategoryController.updateCategory
);
router.delete("/:id", CategoryController.deleteCategory);

/* =========================
   EXPORT ROUTES
========================= */
router.get("/export/csv", CategoryController.exportCategoriesCSV);
router.get("/export/excel", CategoryController.exportCategoriesExcel);

/* =========================
   IMPORT ROUTES
========================= */
router.post("/import/csv", uploadFile, CategoryController.importCategoriesCSV);

router.post(
  "/import/excel",
  uploadFile,
  CategoryController.importCategoriesExcel
);

export default router;
