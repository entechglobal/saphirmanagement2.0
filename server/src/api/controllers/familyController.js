import * as FamilyService from "../services/familyService.js";

import asyncHandler from "express-async-handler";

export const getAllFamilies = asyncHandler(async (req, res) => {
  const familiesData = await FamilyService.getAll(req.query);
  res.status(200).json({
    data: familiesData.data,
    pagination: familiesData.pagination,
    results: familiesData.results,
  });
});

export const getFamiliesByCategory = asyncHandler(async (req, res) => {
  const { categoryId } = req.params;
  const families = await FamilyService.getByCategory(Number(categoryId));
  res
    .status(200)
    .json({ message: "all your families by category", data: families });
});

export const getFamilyById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const family = await FamilyService.getById(Number(id));
  res.status(200).json({ message: "your family infromations", data: family });
});

export const createFamily = asyncHandler(async (req, res) => {
  console.log(req.body);
  const family = await FamilyService.create(req.body);
  res.status(201).json({
    message: "Family created successfully",
    data: family,
  });
});

export const updateFamily = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const family = await FamilyService.update(Number(id), req.body);
  res.status(200).json({
    message: "Family updated successfully",
    data: family,
  });
});

export const deleteFamily = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await FamilyService.remove(Number(id));
  res.status(204).json({ message: "Family deleted successfully" });
});

/* =========================
   EXPORT CONTROLLERS
========================= */

export const exportFamiliesCSV = asyncHandler(async (req, res) => {
  const csv = await FamilyService.exportFamiliesCSV();
  res.header("Content-Type", "text/csv");
  res.attachment("families.csv");
  res.send(csv);
});

export const exportFamiliesExcel = asyncHandler(async (req, res) => {
  const workbook = await FamilyService.exportFamiliesExcel();
  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader("Content-Disposition", "attachment; filename=families.xlsx");
  await workbook.xlsx.write(res);
  res.end();
});

/* =========================
   IMPORT CONTROLLERS
========================= */

export const importFamiliesCSV = asyncHandler(async (req, res) => {
  const importedCount = await FamilyService.importFamiliesCSV(req.file.buffer);
  res.status(201).json({
    message: "CSV imported successfully",
    imported: importedCount,
  });
});

export const importFamiliesExcel = asyncHandler(async (req, res) => {
  const importedCount = await FamilyService.importFamiliesExcel(
    req.file.buffer,
  );
  res.status(201).json({
    message: "Excel imported successfully",
    imported: importedCount,
  });
});
