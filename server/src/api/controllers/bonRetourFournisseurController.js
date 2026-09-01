import asyncHandler from "express-async-handler";
import * as bonRetourFournisseurService from "../services/bonRetourFournisseurService.js";

export const getNextDocumentNumber = asyncHandler(async (req, res) => {
  const result = await bonRetourFournisseurService.getNextDocumentNumber(
    req.query,
    req.user,
  );
  res.status(200).json({ success: true, data: result });
});

export const getProductsForBonRetourFournisseur = asyncHandler(
  async (req, res) => {
    const result =
      await bonRetourFournisseurService.getProductsForBonRetourFournisseur(
        req.query,
        req.user,
      );
    res.status(200).json({
      success: true,
      results: result.products.length,
      priceField: result.priceField,
      pagination: result.pagination,
      data: result.products,
    });
  },
);

export const getAllBonRetourFournisseurs = asyncHandler(async (req, res) => {
  const result = await bonRetourFournisseurService.getAll(req.query, req.user);
  res.status(200).json({
    success: true,
    results: result.bonRetourFournisseurs.length,
    pagination: result.pagination,
    data: result.bonRetourFournisseurs,
  });
});

export const getBonRetourFournisseurById = asyncHandler(async (req, res) => {
  const brf = await bonRetourFournisseurService.getById(
    parseInt(req.params.id),
    req.user,
  );
  res.status(200).json({ success: true, data: brf });
});

export const createBonRetourFournisseur = asyncHandler(async (req, res) => {
  const brf = await bonRetourFournisseurService.create(req.body, req.user);
  res.status(201).json({ success: true, data: brf });
});

export const validateBonRetourFournisseur = asyncHandler(async (req, res) => {
  const { targetStatus } = req.body;
  const result = await bonRetourFournisseurService.validate(
    parseInt(req.params.id),
    targetStatus,
    req.user,
  );
  res.status(200).json({
    success: true,
    message: `Bon retour fournisseur transitioned to ${targetStatus}`,
    transition: result.transition,
    data: result,
  });
});

export const updateBonRetourFournisseur = asyncHandler(async (req, res) => {
  const brf = await bonRetourFournisseurService.update(
    parseInt(req.params.id),
    req.body,
    req.user,
  );
  res.status(200).json({ success: true, data: brf });
});

export const printBonRetourFournisseur = asyncHandler(async (req, res) => {
  const doc = await bonRetourFournisseurService.generateBonRetourFournisseurPDF(
    parseInt(req.params.id),
    req.user,
  );

  res.setHeader("Content-Type", "application/pdf");
  if (req.query.view === "inline") {
    res.setHeader(
      "Content-Disposition",
      "inline; filename=bon-retour-fournisseur.pdf",
    );
  } else {
    const filename = `bon-retour-fournisseur-${req.params.id}-${Date.now()}.pdf`;
    res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
  }
  doc.pipe(res);
  doc.end();
});

export const deleteBonRetourFournisseur = asyncHandler(async (req, res) => {
  const result = await bonRetourFournisseurService.remove(
    parseInt(req.params.id),
    req.user,
  );
  res.status(200).json({ success: true, message: result.message });
});
