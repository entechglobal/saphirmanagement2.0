import * as StockService from "../services/stockByDepotService.js";
import asyncHandler from "express-async-handler";

/* ============================================================
   GET ALL STOCK
   Super Admin : all depots — optional ?depotId or ?societeId filters
   Regular User: only own société's depots
============================================================ */
export const getAllStock = asyncHandler(async (req, res) => {
  const stockData = await StockService.getAll(req.query, req.user);

  res.status(200).json({
    success: true,
    results: stockData.results,
    pagination: stockData.pagination,
    data: stockData.data,
  });
});

/* ============================================================
   GET STOCK BY ID
   Super Admin : any record
   Regular User: only own société's records
============================================================ */
export const getStockById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const stock = await StockService.getById(Number(id), req.user);

  res.status(200).json({
    success: true,
    message: "Stock record retrieved successfully",
    data: stock,
  });
});

/* ============================================================
   GET STOCK BY DEPOT
   depotFilter middleware runs before this and injects req.depot.
   We pass req.depot directly — no re-fetching inside service.
============================================================ */
export const getStockByDepot = asyncHandler(async (req, res) => {
  // req.depot is injected by depotFilter (existence + active + société auth done)
  const stockData = await StockService.getByDepot(
    req.depot,
    req.user,
    req.query,
  );

  res.status(200).json({
    success: true,
    depot: stockData.depot,
    results: stockData.results,
    pagination: stockData.pagination,
    data: stockData.data,
  });
});

/* ============================================================
   GET STOCK BY ARTICLE (across all accessible depots)
   Super Admin : all depots globally
   Regular User: only own société's depots
============================================================ */
export const getStockByArticle = asyncHandler(async (req, res) => {
  const { articleId } = req.params;
  const result = await StockService.getByArticle(Number(articleId), req.user);
  res.status(200).json({
    success: true,
    message: "Stock by article retrieved successfully",
    article: result.article,
    summary: result.summary,
    data: result.data,
  });
});

/* ============================================================
   GET STOCK BY VARIANT (across all accessible depots)
   Super Admin : all depots globally
   Regular User: only own société's depots
============================================================ */
export const getStockByVariant = asyncHandler(async (req, res) => {
  const { variantId } = req.params;
  const result = await StockService.getByVariant(Number(variantId), req.user);

  res.status(200).json({
    success: true,
    message: "Stock by variant retrieved successfully",
    variant: result.variant,
    summary: result.summary,
    data: result.data,
  });
});
/* ============================================================
   CREATE STOCK ENTRY
   Super Admin : MUST provide depotId — can target any depot
   Regular User: depotId optional — defaults to PRINCIPAL depot of own société
============================================================ */
export const createStock = asyncHandler(async (req, res) => {
  const stock = await StockService.create(req.body, req.user);

  res.status(201).json({
    success: true,
    message: "Stock entry created successfully",
    data: stock,
  });
});

/* ============================================================
   CREATE BULK STOCK ENTRIES
   superAdminOnly middleware already blocks non-admins on the route.
============================================================ */
export const createBulkStock = asyncHandler(async (req, res) => {
  const { entries } = req.body;
  const result = await StockService.createBulk(entries, req.user);
  const check = result.errors?.length > 0;

  res.status(check ? 404 : 201).json({
    success: check ? false : true,
    message: `Bulk stock creation complete: ${result.created} created, ${result.failed} failed`,
    created: result.created,
    failed: result.failed,
    results: result.results,
    errors: result.errors,
  });
});

/* ============================================================
   UPDATE STOCK ENTRY
   Super Admin : any record
   Regular User: only own société's records
============================================================ */
export const updateStock = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const stock = await StockService.update(Number(id), req.body, req.user);

  res.status(200).json({
    success: true,
    message: "Stock entry updated successfully",
    data: stock,
  });
});

/* ============================================================
   DELETE STOCK ENTRY
   Only possible when all quantities are zero.
============================================================ */
export const deleteStock = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await StockService.remove(Number(id), req.user);

  res.status(200).json({
    success: true,
    message: "Stock entry deleted successfully",
  });
});

/* ============================================================
   STOCK STATISTICS
   Super Admin : global stats | optional ?societeId filter
   Regular User: own société stats only
============================================================ */
export const getStockStatistics = asyncHandler(async (req, res) => {
  const stats = await StockService.getStatistics(req.user, req.query);

  res.status(200).json({
    success: true,
    message: "Stock statistics retrieved successfully",
    data: stats,
  });
});
