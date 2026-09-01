import * as StockTransactionService from "../services/stockTransactionService.js";
import asyncHandler from "express-async-handler";

/* ============================================================
   GET STOCK MOVEMENTS (ADVANCED FILTERING)
============================================================ */
export const getStockMovements = asyncHandler(async (req, res) => {
  const filters = {
    societeId: req.query.societeId,
    depotId: req.query.depotId,
    familyId: req.query.familyId,
    articleId: req.query.articleId,
    variantId: req.query.variantId,
    documentType: req.query.documentType,
    movement: req.query.movement,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    clientId: req.query.clientId,
    fournisseurId: req.query.fournisseurId,
  };

  const result = await StockTransactionService.getStockMovements(
    filters,
    req.user,
  );

  res.status(200).json({
    success: true,
    message: "Stock movements retrieved successfully",
    ...result,
  });
});

/* ============================================================
   PRINT STOCK MOVEMENTS (PDF GENERATION)
============================================================ */
export const printStockMovements = asyncHandler(async (req, res) => {
  const filters = {
    societeId: req.query.societeId,
    depotId: req.query.depotId,
    familyId: req.query.familyId,
    articleId: req.query.articleId,
    variantId: req.query.variantId,
    documentType: req.query.documentType,
    movement: req.query.movement,
    startDate: req.query.startDate,
    endDate: req.query.endDate,
    clientId: req.query.clientId,
    fournisseurId: req.query.fournisseurId,
  };

  const doc = await StockTransactionService.generateStockMovementsPDF(
    filters,
    req.user,
  );

  // Set response headers
  res.setHeader("Content-Type", "application/pdf");

  // Option 1: Download (default)
  // res.setHeader("Content-Disposition", "attachment; filename=stock-movements.pdf");

  // Option 2: Inline view (if ?view=inline)
  if (req.query.view === "inline") {
    res.setHeader(
      "Content-Disposition",
      "inline; filename=stock-movements.pdf",
    );
  } else {
    const filename = `mouvements-stock-${Date.now()}.pdf`;
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
  }

  // Pipe PDF to response
  doc.pipe(res);
  doc.end();
});

/* ============================================================
   products combinison
============================================================ */
export const getUnifiedProducts = asyncHandler(async (req, res) => {
  const { familyId, search, page, limit } = req.query;

  const result = await StockTransactionService.getUnifiedProducts({
    user: req.user,
    familyId: familyId ? parseInt(familyId) : undefined,
    search: search || undefined,
    page: page ? parseInt(page) : 1,
    limit: limit ? parseInt(limit) : 50,
  });

  res.status(200).json({
    success: true,
    message: "Products retrieved successfully",
    results: result.products.length,
    pagination: result.pagination,
    data: result.products,
  });
});
