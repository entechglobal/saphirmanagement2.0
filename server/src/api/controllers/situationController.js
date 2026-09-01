import asyncHandler from "express-async-handler";
import * as situationService from "../services/situationService.js";

export const getClientSituation = asyncHandler(async (req, res) => {
  const result = await situationService.getClientSituation(
    req.query,
    req.societeId,
  );

  res.status(200).json({
    success: true,
    results: result.results,
    pagination: result.pagination,
    summary: result.summary,
    data: result.data,
  });
});

export const getFournisseurSituation = asyncHandler(async (req, res) => {
  const result = await situationService.getFournisseurSituation(
    req.query,
    req.societeId,
  );

  res.status(200).json({
    success: true,
    results: result.results,
    pagination: result.pagination,
    summary: result.summary,
    data: result.data,
  });
});
