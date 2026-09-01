import asyncHandler from "express-async-handler";
import * as bonRetourClientService from "../services/bonRetourClientService.js";

/* ============================================================
   BON RETOUR CLIENT CONTROLLER
============================================================ */

/**
 * @desc    Get next document number for bon retour client
 * @route   GET /api/bon-retour-clients/next-number
 * @access  Private
 * @query   societeId (optional, superAdmin only)
 */
export const getNextDocumentNumber = asyncHandler(async (req, res) => {
  const result = await bonRetourClientService.getNextDocumentNumber(
    req.query,
    req.user,
  );
  res.status(200).json({
    success: true,
    data: result,
  });
});

/**
 * @desc    Get products available for bon retour client
 * @route   GET /api/bon-retour-clients/products
 * @access  Private
 * @query   depotId (required), priceField, search, categoryId, familyId, page, limit
 */
export const getProductsForBonRetourClient = asyncHandler(async (req, res) => {
  const result = await bonRetourClientService.getProductsForBonRetourClient(
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
 * @desc    Get all bon retour clients (paginated)
 * @route   GET /api/bon-retour-clients
 * @access  Private
 * @query   clientId, depotId, status, startDate, endDate, page, limit
 */
export const getAllBonRetourClients = asyncHandler(async (req, res) => {
  const result = await bonRetourClientService.getAll(req.query, req.user);
  res.status(200).json({
    success: true,
    results: result.bonRetourClients.length,
    pagination: result.pagination,
    data: result.bonRetourClients,
  });
});

/**
 * @desc    Get bon retour client by ID
 * @route   GET /api/bon-retour-clients/:id
 * @access  Private
 */
export const getBonRetourClientById = asyncHandler(async (req, res) => {
  const brc = await bonRetourClientService.getById(
    parseInt(req.params.id),
    req.user,
  );
  res.status(200).json({
    success: true,
    data: brc,
  });
});

/**
 * @desc    Create new bon retour client
 * @route   POST /api/bon-retour-clients
 * @access  Private — requires create_bon_retour_client permission
 *
 * Business rules enforced by service:
 *   - Stock movement (RETURN_IN) only created when status = COMPLETED
 *   - Financial reconciliation applied only when status = COMPLETED
 *   - If bonLivraisonId given → credit that BL first, cascade remainder
 *   - If no bonLivraisonId → cascade across oldest unpaid BLs for client
 *   - Document number auto-generated: BRC-{YEAR}-{SEQUENCE}
 */
export const createBonRetourClient = asyncHandler(async (req, res) => {
  const brc = await bonRetourClientService.create(req.body, req.user);
  res.status(201).json({
    success: true,
    data: brc,
  });
});

/**
 * @desc    Validate (transition status) bon retour client
 * @route   PUT /api/bon-retour-clients/:id/validate
 * @access  Private — requires validate_bon_retour_client permission
 *
 * body: { targetStatus: "COMPLETED" | "DRAFT" }
 *
 * DRAFT → COMPLETED:
 *   Applies RETURN_IN stock movements and financial reconciliation.
 *
 * COMPLETED → DRAFT:
 *   Creates RETURN_OUT audit records, deletes original RETURN_IN records,
 *   reverses financial reconciliation, reverts status to DRAFT.
 */
export const validateBonRetourClient = asyncHandler(async (req, res) => {
  const { targetStatus } = req.body;

  const result = await bonRetourClientService.validate(
    parseInt(req.params.id),
    targetStatus,
    req.user,
  );

  res.status(200).json({
    success: true,
    message: `Bon retour client transitioned to ${targetStatus}`,
    transition: result.transition,
    data: result,
  });
});

/**
 * @desc    Update bon retour client (DRAFT status only)
 * @route   PUT /api/bon-retour-clients/:id
 * @access  Private — requires update_bon_retour_client permission
 *
 * Mode 1 (no lines): updates metadata only.
 * Mode 2 (lines provided): diff-based line management + totals recalculation.
 * No stock or financial changes — call /validate after editing.
 */
export const updateBonRetourClient = asyncHandler(async (req, res) => {
  const brc = await bonRetourClientService.update(
    parseInt(req.params.id),
    req.body,
    req.user,
  );
  res.status(200).json({
    success: true,
    data: brc,
  });
});

/**
 * @desc    Generate PDF for bon retour client
 * @route   GET /api/bon-retour-clients/:id/print
 * @access  Private — requires view_bon_retour_client permission
 * @query   view=inline → open in browser | omit → download attachment
 */
export const printBonRetourClient = asyncHandler(async (req, res) => {
  const doc = await bonRetourClientService.generateBonRetourClientPDF(
    parseInt(req.params.id),
    req.user,
  );

  res.setHeader("Content-Type", "application/pdf");

  if (req.query.view === "inline") {
    res.setHeader(
      "Content-Disposition",
      "inline; filename=bon-retour-client.pdf",
    );
  } else {
    const filename = `bon-retour-client-${req.params.id}-${Date.now()}.pdf`;
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
  }

  doc.pipe(res);
  doc.end();
});

/**
 * @desc    Delete bon retour client
 * @route   DELETE /api/bon-retour-clients/:id
 * @access  Private — requires delete_bon_retour_client permission
 *
 * If status = COMPLETED: reverses RETURN_IN stock movements and
 * financial reconciliation before deletion.
 */
export const deleteBonRetourClient = asyncHandler(async (req, res) => {
  const result = await bonRetourClientService.remove(
    parseInt(req.params.id),
    req.user,
  );
  res.status(200).json({
    success: true,
    message: result.message,
  });
});
