import asyncHandler from "express-async-handler";
import * as ReglementFournisseurService from "../services/reglementFournisseurService.js";

export const getAllReglements = asyncHandler(async (req, res) => {
  const data = await ReglementFournisseurService.getAll(
    req.query,
    req.societeId,
  );
  res.status(200).json({
    success: true,
    results: data.results,
    pagination: data.pagination,
    data: data.data,
  });
});

export const getReglementById = asyncHandler(async (req, res) => {
  const reglement = await ReglementFournisseurService.getById(
    Number(req.params.id),
    req.user,
  );
  res.status(200).json({ success: true, data: reglement });
});

export const createReglement = asyncHandler(async (req, res) => {
  const reglement = await ReglementFournisseurService.create(
    req.body,
    req.societeId,
    req.user,
  );
  res.status(201).json({ success: true, data: reglement });
});

export const deleteReglement = asyncHandler(async (req, res) => {
  await ReglementFournisseurService.remove(Number(req.params.id), req.user);
  res.status(200).json({
    success: true,
    message: "Reglement deleted and BonReception payments rolled back",
  });
});

export const downloadReglementPDF = asyncHandler(async (req, res) => {
  const doc = await ReglementFournisseurService.generateReglementFournisseurPDF(
    Number(req.params.id),
    req.user,
  );
  const id = String(req.params.id).padStart(6, "0");
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="RF-${id}.pdf"`);
  doc.pipe(res);
  doc.end();
});

export const getUnpaidBonReceptions = asyncHandler(async (req, res) => {
  const fournisseurId = Number(req.params.fournisseurId);
  const data = await ReglementFournisseurService.getUnpaidBonReceptions(
    fournisseurId,
    req.societeId,
  );
  res.status(200).json({ success: true, data });
});

export const getFournisseurAdvances = asyncHandler(async (req, res) => {
  const data = await ReglementFournisseurService.getFournisseurAdvances(
    Number(req.params.fournisseurId),
    req.societeId,
  );
  res.status(200).json({ success: true, results: data.length, data });
});
