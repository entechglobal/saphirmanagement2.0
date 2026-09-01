import asyncHandler from "express-async-handler";
import { createSalesDocumentService } from "../services/salesDocumentService.js";

export const createSalesDocumentController = (typeKey) => {
  const service = createSalesDocumentService(typeKey);
  const { label } = service.config;
  const fileSlug = typeKey === "commande" ? "bon-commande" : typeKey;

  return {
    getNextDocumentNumber: asyncHandler(async (req, res) => {
      const result = await service.getNextDocumentNumber(req.query, req.user);
      res.status(200).json({ success: true, data: result });
    }),

    getProducts: asyncHandler(async (req, res) => {
      const result = await service.getProducts(req.query, req.user);
      res.status(200).json({
        success: true,
        results: result.products.length,
        priceField: result.priceField,
        pagination: result.pagination,
        data: result.products,
      });
    }),

    getAll: asyncHandler(async (req, res) => {
      const result = await service.getAll(req.query, req.user);
      res.status(200).json({
        success: true,
        results: result.items.length,
        pagination: result.pagination,
        data: result.items,
      });
    }),

    getById: asyncHandler(async (req, res) => {
      const item = await service.getById(parseInt(req.params.id), req.user);
      res.status(200).json({ success: true, data: item });
    }),

    create: asyncHandler(async (req, res) => {
      const item = await service.create(req.body, req.user);
      res.status(201).json({
        success: true,
        message: `${label} created successfully`,
        data: item,
      });
    }),

    update: asyncHandler(async (req, res) => {
      const item = await service.update(
        parseInt(req.params.id),
        req.body,
        req.user,
      );
      res.status(200).json({
        success: true,
        message: `${label} updated successfully`,
        data: item,
      });
    }),

    remove: asyncHandler(async (req, res) => {
      const result = await service.remove(parseInt(req.params.id), req.user);
      res.status(200).json({ success: true, message: result.message });
    }),

    print: asyncHandler(async (req, res) => {
      const doc = await service.generatePDF(parseInt(req.params.id), req.user);
      res.setHeader("Content-Type", "application/pdf");
      if (req.query.view === "inline") {
        res.setHeader(
          "Content-Disposition",
          `inline; filename=${fileSlug}.pdf`,
        );
      } else {
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=${fileSlug}-${req.params.id}-${Date.now()}.pdf`,
        );
      }
      doc.pipe(res);
      doc.end();
    }),
  };
};

export default createSalesDocumentController;
