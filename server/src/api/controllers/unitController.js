import * as UnitService from "../services/unitService.js";
import asyncHandler from "express-async-handler";

/* =========================
   CRUD OPERATIONS
========================= */

export const getAllUnits = asyncHandler(async (req, res) => {
  const unitsData = await UnitService.getAll(req.query);
  res.status(200).json({
    data: unitsData.data,
    pagination: unitsData.pagination,
    results: unitsData.results,
  });
});

export const getUnitById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const unit = await UnitService.getById(Number(id));
  res.status(200).json({
    message: "Unit information retrieved successfully",
    data: unit,
  });
});

export const createUnit = asyncHandler(async (req, res) => {
  const unit = await UnitService.create(req.body);
  res.status(201).json({
    message: "Unit created successfully",
    data: unit,
  });
});

export const updateUnit = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const unit = await UnitService.update(Number(id), req.body);
  res.status(200).json({
    message: "Unit updated successfully",
    data: unit,
  });
});

export const deleteUnit = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await UnitService.remove(Number(id));
  res.status(204).json({
    message: "Unit deleted successfully",
  });
});

/* =========================
   UTILITY OPERATIONS
========================= */

// export const getUnitsByType = asyncHandler(async (req, res) => {
//   const { allowsFractional } = req.query;
//   const units = await UnitService.getByType(allowsFractional === "true");
//   res.status(200).json({
//     message: "Units retrieved successfully",
//     data: units,
//     count: units.length,
//   });
// });

// export const checkUnitUsage = asyncHandler(async (req, res) => {
//   const { id } = req.params;
//   const usage = await UnitService.checkUsage(Number(id));
//   res.status(200).json({
//     message: "Unit usage information retrieved",
//     data: usage,
//   });
// });
