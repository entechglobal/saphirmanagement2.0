import asyncHandler from "express-async-handler";
import * as ReglementClientService from "../services/reglementClientService.js";

export const getAllReglements = asyncHandler(async (req, res) => {
  const data = await ReglementClientService.getAll(req.query, req.societeId);
  res.status(200).json({
    success: true,
    results: data.results,
    pagination: data.pagination,
    data: data.data,
  });
});

export const getReglementById = asyncHandler(async (req, res) => {
  const reglement = await ReglementClientService.getById(
    Number(req.params.id),
    req.user,
  );
  res.status(200).json({ success: true, data: reglement });
});

export const createReglement = asyncHandler(async (req, res) => {
  const reglement = await ReglementClientService.create(
    req.body,
    req.societeId,
    req.user,
  );
  res.status(201).json({ success: true, data: reglement });
});

export const deleteReglement = asyncHandler(async (req, res) => {
  await ReglementClientService.remove(Number(req.params.id), req.user);
  res.status(200).json({
    success: true,
    message: "Reglement deleted and BonLivraison payments rolled back",
  });
});

export const downloadReglementPDF = asyncHandler(async (req, res) => {
  const doc = await ReglementClientService.generateReglementClientPDF(
    Number(req.params.id),
    req.user,
  );
  const id = String(req.params.id).padStart(6, "0");
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="RC-${id}.pdf"`);
  doc.pipe(res);
  doc.end();
});

export const getUnpaidBonLivraisons = asyncHandler(async (req, res) => {
  const clientId = Number(req.params.clientId);
  const data = await ReglementClientService.getUnpaidBonLivraisons(
    clientId,
    req.societeId,
  );
  res.status(200).json({ success: true, data });
});

export const getClientAdvances = asyncHandler(async (req, res) => {
  const data = await ReglementClientService.getClientAdvances(
    Number(req.params.clientId),
    req.societeId,
  );
  res.status(200).json({ success: true, results: data.length, data });
});
