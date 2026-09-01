import asyncHandler from "express-async-handler";
import * as BanqueService from "../services/banqueService.js";

export const getAllBanques = asyncHandler(async (req, res) => {
  const data = await BanqueService.getAll(req.query);
  res.status(200).json({
    success: true,
    results: data.results,
    pagination: data.pagination,
    data: data.data,
  });
});

export const getBanqueById = asyncHandler(async (req, res) => {
  const banque = await BanqueService.getById(Number(req.params.id));
  res.status(200).json({ success: true, data: banque });
});

export const createBanque = asyncHandler(async (req, res) => {
  const banque = await BanqueService.create(req.body);
  res.status(201).json({ success: true, data: banque });
});

export const updateBanque = asyncHandler(async (req, res) => {
  const banque = await BanqueService.update(Number(req.params.id), req.body);
  res.status(200).json({ success: true, data: banque });
});

export const deleteBanque = asyncHandler(async (req, res) => {
  await BanqueService.remove(Number(req.params.id));
  res.status(200).json({ success: true, message: "Banque deleted successfully" });
});
