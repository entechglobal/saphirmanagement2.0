import asyncHandler from "express-async-handler";
import * as bonReceptionService from "../services/bonReceptionService.js";

/* ============================================================
   BON RECEPTION CONTROLLER
============================================================ */

/**
 * @desc    Get next document number for bon de réception
 * @route   GET /api/bon-receptions/next-number
 * @access  Private
 * @query   societeId (optional, superAdmin only)
 */
export const getNextDocumentNumber = asyncHandler(async (req, res) => {
  const result = await bonReceptionService.getNextDocumentNumber(
    req.query,
    req.user,
  );
  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * @desc    Get products available for bon de réception
 * @route   GET /api/bon-receptions/products
 * @access  Private
 * @query   depotId, priceField, search, page, limit
 */
export const getProductsForBonReception = asyncHandler(async (req, res) => {
  const result = await bonReceptionService.getProductsForBonReception(
    req.query,
    req.user,
  );
  res.status(200).json({
    success: true,
    results: result.products.length,
    pagination: result.pagination,
    data: result.products,
  });
});

/**
 * @desc    Get all bon receptions (paginated)
 * @route   GET /api/bon-receptions
 * @access  Private
 * @query   frsId, depotId, status, search, startDate, endDate, page, limit
 */
export const getAllBonReceptions = asyncHandler(async (req, res) => {
  const result = await bonReceptionService.getAll(req.query, req.user);
  res.status(200).json({
    success: true,
    results: result.bonReceptions.length,
    pagination: result.pagination,
    data: result.bonReceptions,
  });
});

/**
 * @desc    Get bon reception by ID
 * @route   GET /api/bon-receptions/:id
 * @access  Private
 */
export const getBonReceptionById = asyncHandler(async (req, res) => {
  const br = await bonReceptionService.getById(
    parseInt(req.params.id),
    req.user,
  );
  res.status(200).json({
    success: true,
    data: br,
  });
});

/**
 * @desc    Create new bon de réception
 * @route   POST /api/bon-receptions
 * @access  Private — requires create_bon_reception permission
 *
 * Business rules enforced by service:
 *   - status = DRAFT → document and lines saved only, no stock movement
 *   - status = COMPLETED → INBOUND stock transactions created for every
 *     line (StockByDepot updated for stock-managed products)
 *   - newPrixAchat/newPrixVente1-3 (if provided) update the article catalog
 *     immediately, regardless of status
 *   - documentReference must be unique per société
 *   - Document number auto-generated: BR-{YEAR}-{SEQUENCE}
 */
export const createBonReception = asyncHandler(async (req, res) => {
  const br = await bonReceptionService.create(req.body, req.user);
  res.status(201).json({
    success: true,
    data: br,
  });
});

/**
 * @desc    Validate (transition status) bon de réception
 * @route   PUT /api/bon-receptions/:id/validate
 * @access  Private — requires validate_bon_reception permission
 *
 * body: { targetStatus: "COMPLETED" | "DRAFT" }
 *
 * DRAFT → COMPLETED:
 *   Applies INBOUND stock movements for every line.
 *
 * COMPLETED → DRAFT:
 *   Creates ADJUSTMENT audit records, deletes original INBOUND records,
 *   reverts status to DRAFT.
 */
export const validateBonReception = asyncHandler(async (req, res) => {
  const { targetStatus } = req.body;

  const result = await bonReceptionService.validate(
    parseInt(req.params.id),
    targetStatus,
    req.user,
  );

  res.status(200).json({
    success: true,
    message: `Bon de réception transitioned to ${targetStatus}`,
    transition: result.transition,
    data: result,
  });
});

/**
 * @desc    Update bon de réception
 * @route   PUT /api/bon-receptions/:id
 * @access  Private — requires update_bon_reception permission
 *
 * Always updatable (DRAFT and COMPLETED): dateReception, frsId, note.
 * Only updatable in DRAFT: depotId, lines.
 *
 * Mode 1 (no lines): updates metadata only.
 * Mode 2 (lines provided): diff-based line management + totals recalculation
 *   (DRAFT only). No stock changes — call /validate after editing.
 */
export const updateBonReception = asyncHandler(async (req, res) => {
  const br = await bonReceptionService.update(
    parseInt(req.params.id),
    req.body,
    req.user,
  );
  res.status(200).json({
    success: true,
    data: br,
  });
});

/**
 * @desc    Generate PDF for bon de réception
 * @route   GET /api/bon-receptions/:id/print
 * @access  Private — requires view_bon_reception permission
 * @query   view=inline → open in browser | omit → download attachment
 */
export const printBonReception = asyncHandler(async (req, res) => {
  const doc = await bonReceptionService.generateBonReceptionPDF(
    parseInt(req.params.id),
    req.user,
  );

  res.setHeader("Content-Type", "application/pdf");

  if (req.query.view === "inline") {
    res.setHeader("Content-Disposition", "inline; filename=bon-reception.pdf");
  } else {
    const filename = `bon-reception-${req.params.id}-${Date.now()}.pdf`;
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
  }

  doc.pipe(res);
  doc.end();
});

/**
 * @desc    Delete bon de réception
 * @route   DELETE /api/bon-receptions/:id
 * @access  Private — requires delete_bon_reception permission
 *
 * If status = COMPLETED: reverses INBOUND stock movements before deletion.
 */
export const deleteBonReception = asyncHandler(async (req, res) => {
  const result = await bonReceptionService.remove(
    parseInt(req.params.id),
    req.user,
  );
  res.status(200).json({
    success: true,
    message: result.message,
  });
});
