import asyncHandler from "express-async-handler";
import * as AdvancedBLService from "../services/advancedBonLivraisonService.js";

export const getAll = asyncHandler(async (req, res) => {
  const result = await AdvancedBLService.getAll(req.query, req.user);
  res.status(200).json({
    success: true,
    results: result.data.length,
    pagination: result.pagination,
    data: result.data,
  });
});

export const getById = asyncHandler(async (req, res) => {
  const bl = await AdvancedBLService.getById(parseInt(req.params.id), req.user);
  res.status(200).json({ success: true, data: bl });
});

export const create = asyncHandler(async (req, res) => {
  const bl = await AdvancedBLService.create(req.body, req.user);
  res.status(201).json({ success: true, data: bl });
});

export const update = asyncHandler(async (req, res) => {
  const bl = await AdvancedBLService.update(
    parseInt(req.params.id),
    req.body,
    req.user,
  );
  res.status(200).json({ success: true, data: bl });
});

export const remove = asyncHandler(async (req, res) => {
  const result = await AdvancedBLService.remove(
    parseInt(req.params.id),
    req.user,
  );
  res.status(200).json({ success: true, message: result.message });
});

export const transitionStatus = asyncHandler(async (req, res) => {
  const result = await AdvancedBLService.transitionStatus(
    parseInt(req.params.id),
    req.body.targetStatus,
    req.user,
  );
  res.status(200).json({
    success: true,
    message: `Status transitioned to ${result.transition.to}`,
    transition: result.transition,
    data: result,
  });
});

export const getAdvancedBLDetails = asyncHandler(async (req, res) => {
  const data = await AdvancedBLService.getAdvancedBLDetails(
    parseInt(req.params.id),
    req.user,
  );
  res.status(200).json({ success: true, data });
});

export const suspended = asyncHandler(async (req, res) => {
  const result = await AdvancedBLService.suspended(
    parseInt(req.params.id),
    req.user,
  );
  res.status(200).json({
    success: true,
    isSuspended: result.isSuspended,
    message: result.isSuspended ? "BL suspended" : "BL resumed",
    data: result,
  });
});

export const reportBL = asyncHandler(async (req, res) => {
  const bl = await AdvancedBLService.reportBL(
    parseInt(req.params.id),
    req.body,
    req.user,
  );
  res.status(200).json({
    success: true,
    message: "BL marked as reported",
    data: bl,
  });
});

export const resumeReportedBL = asyncHandler(async (req, res) => {
  const bl = await AdvancedBLService.resumeReportedBL(
    parseInt(req.params.id),
    req.user,
  );
  res.status(200).json({
    success: true,
    message: "BL resumed",
    data: bl,
  });
});

export const getProductsOrPacks = asyncHandler(async (req, res) => {
  const result = await AdvancedBLService.getProductsOrPacks(
    req.query,
    req.user,
  );
  res.status(200).json({
    success: true,
    mode: result.mode,
    ...(result.priceField && { priceField: result.priceField }),
    results: result.data.length,
    pagination: result.pagination,
    data: result.data,
  });
});

export const getWorkflowCounts = asyncHandler(async (req, res) => {
  const data = await AdvancedBLService.getWorkflowCounts(req.user, req.query);
  res.status(200).json({ success: true, data });
});
export const getBLsByStatus = asyncHandler(async (req, res) => {
  const result = await AdvancedBLService.getBLsByStatus(req.query, req.user);
  res.status(200).json({
    success: true,
    pagination: result.pagination,
    data: result.data,
  });
});

export const getPlanning = asyncHandler(async (req, res) => {
  const result = await AdvancedBLService.getPlanning(req.query, req.user);
  res.status(200).json({
    success: true,
    metrics: result.metrics,
    data: result.groupedByDate,
  });
});

export const getCommercials = asyncHandler(async (req, res) => {
  const data = await AdvancedBLService.getCommercials(req.user);
  res.status(200).json({
    success: true,
    results: data.length,
    data,
  });
});

export const getCommercialStats = asyncHandler(async (req, res) => {
  const data = await AdvancedBLService.getCommercialStats(req.user, req.query);
  res.status(200).json({
    success: true,
    data,
  });
});

export const getTopCommercials = asyncHandler(async (req, res) => {
  const data = await AdvancedBLService.getTopCommercials(req.user, req.query);
  res.status(200).json({
    success: true,
    data,
  });
});

export const getPreparateurs = asyncHandler(async (req, res) => {
  const result = await AdvancedBLService.getPreparateurs(req.query, req.user);
  res.status(200).json({
    success: true,
    results: result.data.length,
    pagination: result.pagination,
    data: result.data,
  });
});

export const getLivreurs = asyncHandler(async (req, res) => {
  const result = await AdvancedBLService.getLivreurs(req.query, req.user);
  res.status(200).json({
    success: true,
    type: result.type,
    results: result.data.length,
    pagination: result.pagination,
    data: result.data,
  });
});

export const printAdvancedBL = asyncHandler(async (req, res) => {
  const doc = await AdvancedBLService.generatePDF(
    parseInt(req.params.id),
    req.user,
  );

  res.setHeader("Content-Type", "application/pdf");
  if (req.query.view === "inline") {
    res.setHeader("Content-Disposition", "inline; filename=bon-commande.pdf");
  } else {
    const filename = `bon-commande-${req.params.id}-${Date.now()}.pdf`;
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
  }

  doc.pipe(res);
  doc.end();
});
