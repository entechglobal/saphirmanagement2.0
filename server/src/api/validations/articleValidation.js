import { check, param, query } from "express-validator";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";
import prisma from "../../loaders/prisma.js";
import ApiError from "../utils/apiError.js";

// ============================================
// CREATE ARTICLE VALIDATOR
// ============================================
export const createArticleValidator = [
  // Barcode validation (required, globally unique)
  check("barcode")
    .notEmpty()
    .withMessage("Article barcode is required")
    .isLength({ min: 2, max: 50 })
    .withMessage("Article barcode must be between 2 and 50 characters")
    .trim()
    .custom(async (barcode) => {
      const existingArticle = await prisma.article.findUnique({
        where: { barcode },
      });

      if (existingArticle) {
        throw new ApiError("Article barcode already exists", 409);
      }

      return true;
    }),

  // Name validation (required)
  check("name")
    .notEmpty()
    .withMessage("Article name is required")
    .isLength({ min: 2, max: 255 })
    .withMessage("Article name must be between 2 and 255 characters")
    .trim(),

  // Family ID validation + existence check (required)
  check("familyId")
    .notEmpty()
    .withMessage("Family ID is required")
    .isInt({ min: 1 })
    .withMessage("Family ID must be a positive integer")
    .custom(async (familyId) => {
      const family = await prisma.family.findUnique({
        where: { id: parseInt(familyId) },
      });

      if (!family) {
        throw new ApiError("Family not found", 404);
      }

      return true;
    }),

  // Unite Principale ID validation + existence check (required)
  check("unitePrincipaleId")
    .notEmpty()
    .withMessage("Unite Principale ID is required")
    .isInt({ min: 1 })
    .withMessage("Unite Principale ID must be a positive integer")
    .custom(async (unitePrincipaleId) => {
      const unit = await prisma.unit.findUnique({
        where: { id: parseInt(unitePrincipaleId) },
      });

      if (!unit) {
        throw new ApiError("Unite Principale not found", 404);
      }

      return true;
    }),

  // Unite Secondaire ID validation + existence check (optional)
  check("uniteSecondaireId")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("Unite Secondaire ID must be a positive integer")
    .custom(async (uniteSecondaireId) => {
      if (uniteSecondaireId) {
        const unit = await prisma.unit.findUnique({
          where: { id: parseInt(uniteSecondaireId) },
        });

        if (!unit) {
          throw new ApiError("Unite Secondaire not found", 404);
        }
      }

      return true;
    }),

  // Unite Complementaire ID validation + existence check (optional)
  check("uniteComplementaireId")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("Unite Complementaire ID must be a positive integer")
    .custom(async (uniteComplementaireId) => {
      if (uniteComplementaireId) {
        const unit = await prisma.unit.findUnique({
          where: { id: parseInt(uniteComplementaireId) },
        });

        if (!unit) {
          throw new ApiError("Unite Complementaire not found", 404);
        }
      }

      return true;
    }),

  // Conversion Secondaire validation (optional)
  check("conversionSecondaire")
    .optional({ nullable: true })
    .isFloat({ min: 0.0001 })
    .withMessage("Conversion Secondaire must be a positive number"),

  // Conversion Complementaire validation (optional)
  check("conversionComplementaire")
    .optional({ nullable: true })
    .isFloat({ min: 0.0001 })
    .withMessage("Conversion Complementaire must be a positive number"),

  // Prix Achat validation (required)
  check("prixAchat")
    .notEmpty()
    .withMessage("Prix Achat is required")
    .isFloat({ min: 0 })
    .withMessage("Prix Achat must be a positive number"),

  // Prix Vente 1 validation (required)
  check("prixVente1")
    .notEmpty()
    .withMessage("Prix Vente 1 is required")
    .isFloat({ min: 0 })
    .withMessage("Prix Vente 1 must be a positive number"),

  // Prix Vente 2 validation (required)
  check("prixVente2")
    .notEmpty()
    .withMessage("Prix Vente 2 is required")
    .isFloat({ min: 0 })
    .withMessage("Prix Vente 2 must be a positive number"),

  // Prix Vente 3 validation (required)
  check("prixVente3")
    .notEmpty()
    .withMessage("Prix Vente 3 is required")
    .isFloat({ min: 0 })
    .withMessage("Prix Vente 3 must be a positive number"),

  // Gere En Stock validation (optional, default true)
  check("gereEnStock")
    .optional()
    .isBoolean()
    .withMessage("gereEnStock must be a boolean (true/false)")
    .toBoolean(),

  // Visible validation (optional, default true)
  check("visible")
    .optional()
    .isBoolean()
    .withMessage("Visible must be a boolean (true/false)")
    .toBoolean(),

  // Remise validation (optional, 0-1)
  check("remise")
    .optional({ nullable: true })
    .isFloat({ min: 0, max: 1 })
    .withMessage("Remise must be between 0 and 1"),

  // Date Expiration validation (optional)
  check("dateExpiration")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("Date Expiration must be a valid date"),

  // Duree Expiration validation (optional)
  check("dureeExpiration")
    .optional({ nullable: true })
    .isString()
    .withMessage("Duree Expiration must be a string"),

  validatorMiddleware,
];

// ============================================
// UPDATE ARTICLE VALIDATOR
// ============================================
export const updateArticleValidator = [
  // ID validation
  param("id")
    .isInt({ min: 1 })
    .withMessage("ID must be a positive integer")
    .toInt(),

  // Barcode validation (optional in update, globally unique if changed)
  check("barcode")
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage("Article barcode must be between 2 and 50 characters")
    .trim()
    .custom(async (barcode, { req }) => {
      const existingArticle = await prisma.article.findUnique({
        where: { barcode },
      });

      // Check if barcode exists and belongs to different article
      if (existingArticle && existingArticle.id !== parseInt(req.params.id)) {
        throw new ApiError("Article barcode already exists", 409);
      }

      return true;
    }),

  // Name validation (optional in update)
  check("name")
    .optional()
    .isLength({ min: 2, max: 255 })
    .withMessage("Article name must be between 2 and 255 characters")
    .trim(),

  // Family ID validation + existence check (optional in update)
  check("familyId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Family ID must be a positive integer")
    .custom(async (familyId) => {
      const family = await prisma.family.findUnique({
        where: { id: parseInt(familyId) },
      });

      if (!family) {
        throw new ApiError("Family not found", 404);
      }

      return true;
    }),

  // Unite Principale ID validation + existence check (optional in update)
  check("unitePrincipaleId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Unite Principale ID must be a positive integer")
    .custom(async (unitePrincipaleId) => {
      const unit = await prisma.unit.findUnique({
        where: { id: parseInt(unitePrincipaleId) },
      });

      if (!unit) {
        throw new ApiError("Unite Principale not found", 404);
      }

      return true;
    }),

  // Unite Secondaire ID validation + existence check (optional)
  check("uniteSecondaireId")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("Unite Secondaire ID must be a positive integer")
    .custom(async (uniteSecondaireId) => {
      if (uniteSecondaireId) {
        const unit = await prisma.unit.findUnique({
          where: { id: parseInt(uniteSecondaireId) },
        });

        if (!unit) {
          throw new ApiError("Unite Secondaire not found", 404);
        }
      }

      return true;
    }),

  // Unite Complementaire ID validation + existence check (optional)
  check("uniteComplementaireId")
    .optional({ nullable: true })
    .isInt({ min: 1 })
    .withMessage("Unite Complementaire ID must be a positive integer")
    .custom(async (uniteComplementaireId) => {
      if (uniteComplementaireId) {
        const unit = await prisma.unit.findUnique({
          where: { id: parseInt(uniteComplementaireId) },
        });

        if (!unit) {
          throw new ApiError("Unite Complementaire not found", 404);
        }
      }

      return true;
    }),

  // Conversion Secondaire validation (optional)
  check("conversionSecondaire")
    .optional({ nullable: true })
    .isFloat({ min: 0.0001 })
    .withMessage("Conversion Secondaire must be a positive number"),

  // Conversion Complementaire validation (optional)
  check("conversionComplementaire")
    .optional({ nullable: true })
    .isFloat({ min: 0.0001 })
    .withMessage("Conversion Complementaire must be a positive number"),

  // Prix Achat validation (optional in update)
  check("prixAchat")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Prix Achat must be a positive number"),

  // Prix Vente 1 validation (optional in update)
  check("prixVente1")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Prix Vente 1 must be a positive number"),

  // Prix Vente 2 validation (optional in update)
  check("prixVente2")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Prix Vente 2 must be a positive number"),

  // Prix Vente 3 validation (optional in update)
  check("prixVente3")
    .optional()
    .isFloat({ min: 0 })
    .withMessage("Prix Vente 3 must be a positive number"),

  // Gere En Stock validation (optional in update)
  check("gereEnStock")
    .optional()
    .isBoolean()
    .withMessage("gereEnStock must be a boolean (true/false)")
    .toBoolean(),

  // Visible validation (optional in update)
  check("visible")
    .optional()
    .isBoolean()
    .withMessage("Visible must be a boolean (true/false)")
    .toBoolean(),

  // Remise validation (optional in update)
  check("remise")
    .optional({ nullable: true })
    .isFloat({ min: 0, max: 1 })
    .withMessage("Remise must be between 0 and 1"),

  // Date Expiration validation (optional)
  check("dateExpiration")
    .optional({ nullable: true })
    .isISO8601()
    .withMessage("Date Expiration must be a valid date"),

  // Duree Expiration validation (optional)
  check("dureeExpiration")
    .optional({ nullable: true })
    .isString()
    .withMessage("Duree Expiration must be a string"),

  validatorMiddleware,
];

// ============================================
// GET ARTICLE BY ID VALIDATOR
// ============================================
export const getArticleValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("ID must be a positive integer")
    .toInt(),

  validatorMiddleware,
];

// ============================================
// DELETE ARTICLE VALIDATOR
// ============================================
export const deleteArticleValidator = [
  param("id")
    .isInt({ min: 1 })
    .withMessage("ID must be a positive integer")
    .toInt(),

  validatorMiddleware,
];

// ============================================
// GET ARTICLES BY FAMILY VALIDATOR
// ============================================
export const getArticlesByFamilyValidator = [
  param("familyId")
    .isInt({ min: 1 })
    .withMessage("Family ID must be a positive integer")
    .toInt()
    .custom(async (familyId) => {
      const family = await prisma.family.findUnique({
        where: { id: parseInt(familyId) },
      });

      if (!family) {
        throw new ApiError("Family not found", 404);
      }

      return true;
    }),

  validatorMiddleware,
];

// ============================================
// GET PRODUCTS VALIDATOR
// ============================================

export const getProductsValidator = [
  // depotId - REQUIRED
  query("depotId")
    .notEmpty()
    .withMessage("Depot ID is required")
    .isInt({ min: 1 })
    .withMessage("Depot ID must be a positive integer")
    .custom(async (depotId) => {
      const depot = await prisma.depot.findUnique({
        where: { id: parseInt(depotId) },
      });

      if (!depot) {
        throw new ApiError("Depot not found", 404);
      }

      if (!depot.active) {
        throw new ApiError("Depot is inactive", 400);
      }

      return true;
    }),

  // familyId - OPTIONAL
  query("familyId")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Family ID must be a positive integer")
    .custom(async (familyId) => {
      if (familyId) {
        const family = await prisma.family.findUnique({
          where: { id: parseInt(familyId) },
        });

        if (!family) {
          throw new ApiError("Family not found", 404);
        }
      }

      return true;
    }),

  // page - OPTIONAL
  query("page")
    .optional()
    .isInt({ min: 1 })
    .withMessage("Page must be a positive integer")
    .toInt(),

  // limit - OPTIONAL
  query("limit")
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage("Limit must be between 1 and 100")
    .toInt(),

  validatorMiddleware,
];
