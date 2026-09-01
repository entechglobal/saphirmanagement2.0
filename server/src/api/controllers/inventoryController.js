import * as InventoryService from "../services/inventoryService.js";
import asyncHandler from "express-async-handler";

/* ============================================================
   CREATE INVENTORY (ATOMIC)
   Creates Inventory + Lines + Transactions + Updates Stock
   All in one atomic operation
============================================================ */
export const createInventory = asyncHandler(async (req, res) => {
  const inventory = await InventoryService.create(req.body, req.user);

  res.status(201).json({
    success: true,
    message: `Inventory ${inventory.inventoryNumber} created successfully. ${inventory.summary.totalAdjustments} adjustments applied.`,
    data: inventory,
  });
});

/* ============================================================
   GET ALL INVENTORIES
============================================================ */
export const getAllInventories = asyncHandler(async (req, res) => {
  const result = await InventoryService.getAll(req.query, req.user);

  res.status(200).json({
    success: true,
    results: result.results,
    pagination: result.pagination,
    data: result.data,
  });
});

/* ============================================================
   GET INVENTORY BY ID
============================================================ */
export const getInventoryById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const inventory = await InventoryService.getById(Number(id), req.user);

  res.status(200).json({
    success: true,
    message: "Inventory retrieved successfully",
    data: inventory,
  });
});

/* ============================================================
   GET INVENTORIES BY DEPOT
   depotFilter middleware injects req.depot
============================================================ */
export const getInventoriesByDepot = asyncHandler(async (req, res) => {
  const result = await InventoryService.getByDepot(
    req.depot.id,
    req.user,
    req.query,
  );

  res.status(200).json({
    success: true,
    depot: result.depot,
    results: result.results,
    data: result.data,
  });
});

/* ============================================================
   DELETE INVENTORY (ATOMIC ROLLBACK)
   Deletes inventory and reverts all stock changes
============================================================ */
export const deleteInventory = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await InventoryService.remove(Number(id), req.user);

  res.status(200).json({
    success: true,
    message: result.message,
  });
});

/* ============================================================
   GET VARIANCE REPORT
============================================================ */
export const getVarianceReport = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const report = await InventoryService.getVarianceReport(Number(id), req.user);

  res.status(200).json({
    success: true,
    message: "Variance report generated successfully",
    data: report,
  });
});

/* ============================================================
   APPEND INVENTORY LINES (ATOMIC)
   Adds new lines to an existing inventory
============================================================ */
export const appendInventoryLines = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await InventoryService.appendLines(
    Number(id),
    req.body,
    req.user,
  );

  res.status(200).json({
    success: true,
    message: `Successfully appended ${result.appendInfo.linesAdded} line(s) to inventory ${result.inventoryNumber}. ${result.appendInfo.adjustmentsCreated} adjustment(s) created.`,
    data: result,
  });
});
