import * as CategoryService from "../services/categoryService.js";
import asyncHandler from "express-async-handler";
import prisma from "../../loaders/prisma.js";
import ApiError from "../utils/apiError.js";

export const getAllCategories = asyncHandler(async (req, res) => {
  const categoriesData = await CategoryService.getAll(req.query);
  res.status(200).json({
    data: categoriesData.data,
    pagination: categoriesData.pagination,
    results: categoriesData.results,
  });
});

export const getCategoryById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const category = await CategoryService.getById(Number(id));
  res.status(200).json({ data: category });
});

export const createCategory = asyncHandler(async (req, res) => {
  // Clean up empty or invalid image field
  if (
    req.body.image === "" ||
    (typeof req.body.image === "object" && !req.body.image)
  ) {
    delete req.body.image;
  }
  const category = await CategoryService.create(req.body);
  res
    .status(201)
    .json({ message: "Category created successfully", data: category });
});

export const updateCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const category = await CategoryService.update(Number(id), req.body);
  res
    .status(200)
    .json({ message: "Category updated successfully", data: category });
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await CategoryService.remove(Number(id));
  res.status(204).json({ message: "Category deleted successfully" });
});

/* =========================
   EXPORT CONTROLLERS
========================= */

// Export categories as CSV
export const exportCategoriesCSV = asyncHandler(async (req, res) => {
  const csv = await CategoryService.exportCategoriesCSV();

  res.header("Content-Type", "text/csv");
  res.attachment("categories.csv");
  res.send(csv);
});

// Export categories as Excel
export const exportCategoriesExcel = asyncHandler(async (req, res) => {
  const workbook = await CategoryService.exportCategoriesExcel();

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
  );
  res.setHeader("Content-Disposition", "attachment; filename=categories.xlsx");

  await workbook.xlsx.write(res);
  res.end();
});

/* =========================
   IMPORT CONTROLLERS
========================= */

// Import categories from CSV
export const importCategoriesCSV = asyncHandler(async (req, res) => {
  const importedCount = await CategoryService.importCategoriesCSV(
    req.file.buffer
  );

  res.status(201).json({
    message: "CSV imported successfully",
    imported: importedCount,
  });
});

// Import categories from Excel
export const importCategoriesExcel = asyncHandler(async (req, res) => {
  const importedCount = await CategoryService.importCategoriesExcel(
    req.file.buffer
  );

  res.status(201).json({
    message: "Excel imported successfully",
    imported: importedCount,
  });
});
