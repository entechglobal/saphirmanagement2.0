import asyncHandler from "express-async-handler";
import * as bonLivraisonService from "../services/bonLivraisonService.js";

/* ============================================================
   BON LIVRAISON CONTROLLER
============================================================ */

/**
 * @desc    Get next document number for bon livraison
 * @route   GET /api/bon-livraisons/next-number
 * @access  Private
 * @query   societeId (optional, superAdmin only)
 */
export const getNextDocumentNumber = asyncHandler(async (req, res) => {
  const result = await bonLivraisonService.getNextDocumentNumber(
    req.query,
    req.user,
  );
  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * @desc    Get products available for bon livraison (with price selection + TVA)
 * @route   GET /api/bon-livraisons/products
 * @access  Private
 * @query   depotId (required), priceField, search, categoryId, familyId, page, limit
 *
 * Response includes:
 *   - selectedPrice (TTC) for the chosen priceField
 *   - tva: family TVA rate (decimal, e.g. 0.20)
 *   - stock levels for the specified depot
 */
export const getProductsForBonLivraison = asyncHandler(async (req, res) => {
  const result = await bonLivraisonService.getProductsForBonLivraison(
    req.query,
    req.user,
  );
  res.status(200).json({
    success: true,
    results: result.products.length,
    priceField: result.priceField,
    pagination: result.pagination,
    data: result.products,
  });
});

/**
 * @desc    Get all bon livraisons (paginated)
 * @route   GET /api/bon-livraisons
 * @access  Private
 * @query   clientId, depotId, status, startDate, endDate, page, limit
 */
export const getAllBonLivraisons = asyncHandler(async (req, res) => {
  const result = await bonLivraisonService.getAll(req.query, req.user);
  res.status(200).json({
    success: true,
    results: result.bonLivraisons.length,
    pagination: result.pagination,
    data: result.bonLivraisons,
  });
});

/**
 * @desc    Get bon livraison by ID
 * @route   GET /api/bon-livraisons/:id
 * @access  Private
 */
export const getBonLivraisonById = asyncHandler(async (req, res) => {
  const bonLivraison = await bonLivraisonService.getById(
    parseInt(req.params.id),
    req.user,
  );
  res.status(200).json({
    success: true,
    data: bonLivraison,
  });
});

/**
 * @desc    Create new bon livraison
 * @route   POST /api/bon-livraisons
 * @access  Private — requires create_bon_livraison permission
 *
 * Business rules enforced by service:
 *   - unitPrice in lines is TTC (includes TVA)
 *   - TVA rate resolved from family model per product
 *   - HT and TVA back-calculated: totalHT = totalTTC / (1 + TVA/100)
 *   - Stock movement (OUTBOUND) only created when status = COMPLETED
 *   - Only gereEnStock = true products trigger stock transactions
 *   - Document number auto-generated: BL-{YEAR}-{SEQUENCE}
 */
export const createBonLivraison = asyncHandler(async (req, res) => {
  const bonLivraison = await bonLivraisonService.create(req.body, req.user);
  res.status(201).json({
    success: true,
    data: bonLivraison,
  });
});

/**
 * @desc    Validate (transition status) bon livraison
 * @route   PUT /api/bon-livraisons/:id/validate
 * @access  Private — requires validate_bon_livraison permission
 *
 * body: { targetStatus: "COMPLETED" | "DRAFT" }
 *
 * DRAFT → COMPLETED:
 *   Validates stock availability for all gereEnStock lines
 *   then applies OUTBOUND stock movements atomically.
 *
 * COMPLETED → DRAFT:
 *   Creates RETURN_IN audit records for each reversed OUTBOUND,
 *   deletes the original OUTBOUND records, then reverts status.
 */
export const validateBonLivraison = asyncHandler(async (req, res) => {
  const { targetStatus } = req.body;

  const result = await bonLivraisonService.validate(
    parseInt(req.params.id),
    targetStatus,
    req.user,
  );

  res.status(200).json({
    success: true,
    message: `Bon livraison transitioned to ${targetStatus}`,
    transition: result.transition,
    data: result,
  });
});

/**
 * @desc    Update bon livraison (DRAFT status only)
 * @route   PUT /api/bon-livraisons/:id
 * @access  Private — requires update_bon_livraison permission
 */
export const updateBonLivraison = asyncHandler(async (req, res) => {
  const bonLivraison = await bonLivraisonService.update(
    parseInt(req.params.id),
    req.body,
    req.user,
  );
  res.status(200).json({
    success: true,
    data: bonLivraison,
  });
});

/**
 * @desc    Delete bon livraison (reverses stock movements if COMPLETED)
 * @route   DELETE /api/bon-livraisons/:id
 * @access  Private — requires delete_bon_livraison permission
 */
export const deleteBonLivraison = asyncHandler(async (req, res) => {
  const result = await bonLivraisonService.remove(
    parseInt(req.params.id),
    req.user,
  );
  res.status(200).json({
    success: true,
    message: result.message,
  });
});

export const printBonLivraison = asyncHandler(async (req, res) => {
  const doc = await bonLivraisonService.generateBonLivraisonPDF(
    parseInt(req.params.id),
    req.user,
  );

  // Set response headers
  res.setHeader("Content-Type", "application/pdf");

  // Option 1: Inline view (if ?view=inline)
  if (req.query.view === "inline") {
    res.setHeader("Content-Disposition", "inline; filename=bon-livraison.pdf");
  } else {
    // Option 2: Download (default)
    const filename = `bon-livraison-${req.params.id}-${Date.now()}.pdf`;
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
  }

  // Pipe PDF to response
  doc.pipe(res);
  doc.end();
});
