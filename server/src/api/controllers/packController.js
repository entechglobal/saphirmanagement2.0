import asyncHandler from "express-async-handler";
import * as PackService from "../services/packService.js";

export const getAll = asyncHandler(async (req, res) => {
  const result = await PackService.getAll(req.query, req.societeId, req.user);
  res.status(200).json({
    success: true,
    results: result.data.length,
    pagination: result.pagination,
    data: result.data,
  });
});

export const getById = asyncHandler(async (req, res) => {
  const pack = await PackService.getById(
    parseInt(req.params.id),
    req.societeId,
    req.user,
  );
  res.status(200).json({ success: true, data: pack });
});

export const create = asyncHandler(async (req, res) => {
  const pack = await PackService.create(req.body, req.societeId, req.user);
  res.status(201).json({ success: true, data: pack });
});

export const update = asyncHandler(async (req, res) => {
  const pack = await PackService.update(
    parseInt(req.params.id),
    req.body,
    req.societeId,
    req.user,
  );
  res.status(200).json({ success: true, data: pack });
});

export const remove = asyncHandler(async (req, res) => {
  const result = await PackService.remove(
    parseInt(req.params.id),
    req.societeId,
    req.user,
  );
  res.status(200).json({ success: true, message: result.message });
});

export const checkStockAvailability = asyncHandler(async (req, res) => {
  // Accept packIds as comma-separated string or repeated params:
  //   ?packIds=1,2,3  OR  ?packIds[]=1&packIds[]=2
  const raw = req.query.packIds;
  const packIds = Array.isArray(raw)
    ? raw.map(Number)
    : String(raw).split(",").map(Number);

  const result = await PackService.checkPackStockAvailability(
    packIds,
    parseInt(req.query.depotId),
    req.societeId,
    req.user,
  );
  res.status(200).json({ success: true, data: result });
});

export const getProductsPicker = asyncHandler(async (req, res) => {
  const result = await PackService.getProductsPicker(req.query, req.user);
  res.status(200).json({
    success: true,
    priceField: result.priceField,
    results: result.data.length,
    pagination: result.pagination,
    data: result.data,
  });
});
