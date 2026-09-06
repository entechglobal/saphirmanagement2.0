import asyncHandler from "express-async-handler";
import * as dashboardService from "../services/dashboardService.js";

export const getOverview = asyncHandler(async (req, res) => {
  const data = await dashboardService.getOverview(req.query, req.societeId, req.user);

  res.status(200).json({
    success: true,
    data,
  });
});

export const getWalletsOverview = asyncHandler(async (req, res) => {
  const data = await dashboardService.getWalletsOverview();

  res.status(200).json({
    success: true,
    data,
  });
});
