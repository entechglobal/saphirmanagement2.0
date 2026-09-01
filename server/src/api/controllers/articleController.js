import * as ArticleService from "../services/articleService.js";
import asyncHandler from "express-async-handler";

// ============================================
// GET ALL ARTICLES
// ============================================
export const getAllArticles = asyncHandler(async (req, res) => {
  const articlesData = await ArticleService.getAll(req.query);

  res.status(200).json({
    success: true,
    results: articlesData.results,
    pagination: articlesData.pagination,
    data: articlesData.data,
  });
});

/**
 * Get unified list of products (articles + variants)
 * Combines:
 * - Articles without variants
 * - Article variants (for articles that have variants)
 *
 * Each item includes stock from the specified depot
 */
export const getUnifiedProducts = asyncHandler(async (req, res) => {
  const { depotId, familyId, search, page, limit } = req.query;

  const result = await ArticleService.getUnifiedProducts({
    depotId: parseInt(depotId),
    user: req.user,
    familyId: familyId ? parseInt(familyId) : undefined,
    search: search || undefined,
    page: page ? parseInt(page) : 1,
    limit: limit ? parseInt(limit) : 50,
  });

  res.status(200).json({
    success: true,
    message: "Products retrieved successfully",
    results: result.products.length,
    pagination: result.pagination,
    data: result.products,
  });
});

// ============================================
// GET ARTICLES BY FAMILY
// ============================================
export const getArticlesByFamily = asyncHandler(async (req, res) => {
  const { familyId } = req.params;
  const articles = await ArticleService.getByFamily(Number(familyId));

  res.status(200).json({
    success: true,
    message: "Articles by family retrieved successfully",
    results: articles.length,
    data: articles,
  });
});

// ============================================
// GET ARTICLE BY ID
// ============================================
export const getArticleById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const article = await ArticleService.getById(Number(id));

  res.status(200).json({
    success: true,
    message: "Article information retrieved successfully",
    data: article,
  });
});

// ============================================
// CREATE ARTICLE
// ============================================
export const createArticle = asyncHandler(async (req, res) => {
  const article = await ArticleService.create(req.body);

  res.status(201).json({
    success: true,
    message: "Article created successfully",
    data: article,
  });
});

// ============================================
// UPDATE ARTICLE
// ============================================
export const updateArticle = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const article = await ArticleService.update(Number(id), req.body);

  res.status(200).json({
    success: true,
    message: "Article updated successfully",
    data: article,
  });
});

// ============================================
// DELETE ARTICLE
// ============================================
export const deleteArticle = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await ArticleService.remove(Number(id));

  res.status(200).json({
    success: true,
    message: "Article deleted successfully",
  });
});

// ============================================
// EXPORT ARTICLES TO CSV
// ============================================
export const exportArticlesCSV = asyncHandler(async (req, res) => {
  const csv = await ArticleService.exportArticlesCSV();

  res.header("Content-Type", "text/csv");
  res.attachment("articles.csv");
  res.send(csv);
});

// ============================================
// EXPORT ARTICLES TO EXCEL
// ============================================
export const exportArticlesExcel = asyncHandler(async (req, res) => {
  const workbook = await ArticleService.exportArticlesExcel();

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader("Content-Disposition", "attachment; filename=articles.xlsx");
  await workbook.xlsx.write(res);
  res.end();
});

// ============================================
// IMPORT ARTICLES FROM CSV
// ============================================
export const importArticlesCSV = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No file uploaded",
    });
  }

  const importedCount = await ArticleService.importArticlesCSV(req.file.buffer);

  res.status(201).json({
    success: true,
    message: "CSV imported successfully",
    imported: importedCount,
  });
});

// ============================================
// IMPORT ARTICLES FROM EXCEL
// ============================================
export const importArticlesExcel = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No file uploaded",
    });
  }

  const importedCount = await ArticleService.importArticlesExcel(
    req.file.buffer,
  );

  res.status(201).json({
    success: true,
    message: "Excel imported successfully",
    imported: importedCount,
  });
});

// ============================================
// EXPORT FUNCTIONS
// ============================================
export default {
  getAllArticles,
  getArticlesByFamily,
  getArticleById,
  createArticle,
  updateArticle,
  deleteArticle,
  exportArticlesCSV,
  exportArticlesExcel,
  importArticlesCSV,
  importArticlesExcel,
};
