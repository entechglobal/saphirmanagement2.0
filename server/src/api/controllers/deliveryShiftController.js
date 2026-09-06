import asyncHandler from "express-async-handler";
import * as DeliveryShiftService from "../services/deliveryShiftService.js";

export const getMyActive = asyncHandler(async (req, res) => {
  const data = await DeliveryShiftService.getMyActive(req.user);
  res.status(200).json({ success: true, data });
});

export const start = asyncHandler(async (req, res) => {
  const data = await DeliveryShiftService.startShift(req.user);
  res.status(201).json({ success: true, data });
});

export const getAll = asyncHandler(async (req, res) => {
  const result = await DeliveryShiftService.getAll(
    req.query,
    req.societeId || req.query.societeId,
    req.user,
  );
  res.status(200).json({
    success: true,
    results: result.data.length,
    pagination: result.pagination,
    data: result.data,
  });
});

export const getById = asyncHandler(async (req, res) => {
  const shift = await DeliveryShiftService.getById(
    parseInt(req.params.id),
    req.user,
  );
  res.status(200).json({ success: true, data: shift });
});

export const close = asyncHandler(async (req, res) => {
  const shift = await DeliveryShiftService.closeShift(
    parseInt(req.params.id),
    req.user,
  );
  res.status(200).json({ success: true, data: shift });
});

export const remit = asyncHandler(async (req, res) => {
  const result = await DeliveryShiftService.remitShift(
    parseInt(req.params.id),
    req.body,
    req.user,
  );
  res.status(200).json({ success: true, data: result });
});
