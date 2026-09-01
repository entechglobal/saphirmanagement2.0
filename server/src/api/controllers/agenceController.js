import asyncHandler from "express-async-handler";
import * as AgenceService from "../services/agenceService.js";

export const getAll = asyncHandler(async (req, res) => {
  const result = await AgenceService.getAll(req.query, req.societeId, req.user);
  res.status(200).json({
    success: true,
    results: result.data.length,
    pagination: result.pagination,
    data: result.data,
  });
});

export const getById = asyncHandler(async (req, res) => {
  const agence = await AgenceService.getById(
    parseInt(req.params.id),
    req.societeId,
    req.user,
  );
  res.status(200).json({ success: true, data: agence });
});

export const create = asyncHandler(async (req, res) => {
  const agence = await AgenceService.create(req.body, req.societeId, req.user);
  res.status(201).json({ success: true, data: agence });
});

export const update = asyncHandler(async (req, res) => {
  const agence = await AgenceService.update(
    parseInt(req.params.id),
    req.body,
    req.societeId,
    req.user,
  );
  res.status(200).json({ success: true, data: agence });
});

export const remove = asyncHandler(async (req, res) => {
  const result = await AgenceService.remove(
    parseInt(req.params.id),
    req.societeId,
    req.user,
  );
  res.status(200).json({ success: true, message: result.message });
});
