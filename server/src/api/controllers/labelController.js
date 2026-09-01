import asyncHandler from "express-async-handler";
import * as LabelService from "../services/labelService.js";

export const getStockQuantities = asyncHandler(async (req, res) => {
  const result = await LabelService.getStockQuantities(req.body, req.user);
  res.status(200).json({ success: true, data: result });
});

export const generate = asyncHandler(async (req, res) => {
  const result = await LabelService.generate(req.body, req.user);
  res.status(200).json({ success: true, data: result });
});

export const generateForPacks = asyncHandler(async (req, res) => {
  const result = await LabelService.generateForPacks(req.body, req.user);
  res.status(200).json({ success: true, data: result });
});

export const getProductsPicker = asyncHandler(async (req, res) => {
  const result = await LabelService.getProductsPicker(req.query);
  res.status(200).json({
    success: true,
    results: result.products.length,
    pagination: result.pagination,
    data: result.products,
  });
});
