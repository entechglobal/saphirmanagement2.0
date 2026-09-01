import * as ArticleVariantService from "../services/articleVariantService.js";
import asyncHandler from "express-async-handler";

// ============================================
// GET ALL VARIANTS
// ============================================
export const getAllVariants = asyncHandler(async (req, res) => {
  const variantsData = await ArticleVariantService.getAll(req.query);

  res.status(200).json({
    success: true,
    results: variantsData.results,
    pagination: variantsData.pagination,
    data: variantsData.data,
  });
});

// ============================================
// GET VARIANTS BY ARTICLE
// ============================================
export const getVariantsByArticle = asyncHandler(async (req, res) => {
  const { articleId } = req.params;
  const variants = await ArticleVariantService.getByArticle(Number(articleId));

  res.status(200).json({
    success: true,
    message: "Variants by article retrieved successfully",
    results: variants.length,
    data: variants,
  });
});

// ============================================
// GET VARIANT BY ID
// ============================================
export const getVariantById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const variant = await ArticleVariantService.getById(Number(id));

  res.status(200).json({
    success: true,
    message: "Variant information retrieved successfully",
    data: variant,
  });
});

// ============================================
// CREATE VARIANT
// ============================================
export const createVariant = asyncHandler(async (req, res) => {
  const variant = await ArticleVariantService.create(req.body);

  res.status(201).json({
    success: true,
    message: "Variant created successfully",
    data: variant,
  });
});

// ============================================
// UPDATE VARIANT
// ============================================
export const updateVariant = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const variant = await ArticleVariantService.update(Number(id), req.body);

  res.status(200).json({
    success: true,
    message: "Variant updated successfully",
    data: variant,
  });
});

// ============================================
// DELETE VARIANT
// ============================================
export const deleteVariant = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await ArticleVariantService.remove(Number(id));

  res.status(200).json({
    success: true,
    message: "Variant deleted successfully",
  });
});

// ============================================
// CREATE BULK VARIANTS
// ============================================
export const createBulkVariants = asyncHandler(async (req, res) => {
  const { articleId } = req.params;
  const variants = await ArticleVariantService.createBulk(
    Number(articleId),
    req.body.variants,
  );

  res.status(201).json({
    success: true,
    message: `${variants.length} variant(s) created successfully`,
    results: variants.length,
    data: variants,
  });
});

// ============================================
// UPDATE VARIANT ATTRIBUTES
// ============================================
export const updateVariantAttributes = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const variant = await ArticleVariantService.updateAttributes(
    Number(id),
    req.body.attributes,
  );

  res.status(200).json({
    success: true,
    message: "Variant attributes updated successfully",
    data: variant,
  });
});

// ============================================
// EXPORT FUNCTIONS
// ============================================
export default {
  getAllVariants,
  getVariantsByArticle,
  getVariantById,
  createVariant,
  updateVariant,
  deleteVariant,
  createBulkVariants,
  updateVariantAttributes,
};
