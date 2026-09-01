import asyncHandler from "express-async-handler";
import * as ColisTrackingService from "../services/colisTrackingService.js";

export const getAll = asyncHandler(async (req, res) => {
  const result = await ColisTrackingService.getAll(req.query, req.user);
  res.status(200).json({
    success: true,
    results: result.data.length,
    pagination: result.pagination,
    data: result.data,
  });
});

export const markAsReceived = asyncHandler(async (req, res) => {
  const { colisTrackingNumber } = req.body;
  const result = await ColisTrackingService.markAsReceived(
    colisTrackingNumber,
    req.user,
  );
  res.status(200).json({
    success: true,
    message: `Colis ${result.colisTrackingNumber} marked as received`,
    data: result,
  });
});
