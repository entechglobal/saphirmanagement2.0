import asyncHandler from "express-async-handler";
import * as Service from "../services/deliveryProviderConfigService.js";

export const getAll = asyncHandler(async (req, res) => {
  const data = await Service.getAll(req.query, req.user);
  res.status(200).json({ success: true, results: data.length, data });
});

export const getById = asyncHandler(async (req, res) => {
  const data = await Service.getById(parseInt(req.params.id), req.user);
  res.status(200).json({ success: true, data });
});

export const create = asyncHandler(async (req, res) => {
  const data = await Service.create(req.body, req.user);
  res.status(201).json({ success: true, data });
});

export const update = asyncHandler(async (req, res) => {
  const data = await Service.update(
    parseInt(req.params.id),
    req.body,
    req.user,
  );
  res.status(200).json({ success: true, data });
});

export const remove = asyncHandler(async (req, res) => {
  const result = await Service.remove(parseInt(req.params.id), req.user);
  res.status(200).json({ success: true, message: result.message });
});
