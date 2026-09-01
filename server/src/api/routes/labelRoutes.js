import { Router } from "express";
import { auth } from "../middlewares/authMiddleware.js";
import { societyFilter } from "../middlewares/societyFilterMiddleware.js";
import { hasPermission } from "../middlewares/rbacMiddleware.js";
import * as LabelController from "../controllers/labelController.js";
import {
  stockQuantitiesValidator,
  generateValidator,
  generatePacksValidator,
} from "../validations/labelValidation.js";

const router = Router();

router.use(auth);
router.use(societyFilter);

/**
 * GET /api/labels/products
 * Flat product picker (articles without variants + variants).
 * No depot required. Returns: type, id, articleId, variantId, barcode, name, prixAchat.
 * Query: search?, familyId?, categoryId?, page?, limit?
 */
router.get(
  "/products",
  hasPermission("view_article"),
  LabelController.getProductsPicker,
);

/**
 * POST /api/labels/stock-quantities
 * Preview quantities per depot for selected items (quantityDisponible mode).
 * Body: { items: [{ articleId? } | { variantId? }], depotIds: [] }
 */
router.post(
  "/stock-quantities",
  hasPermission("view_article"),
  stockQuantitiesValidator,
  LabelController.getStockQuantities,
);

/**
 * POST /api/labels/generate
 * Generate structured label data for frontend rendering and printing.
 * Body: {
 *   items:         [{ articleId?, variantId?, quantity? }],
 *   labelType:     "avecPrix" | "sansPrix" | "parametre" | "intitule",
 *   priceField:    "prixVente1" | "prixVente2" | "prixVente3",
 *   size:          "50x25" | "30x15",
 *   quantityMode:  "personnalise" | "quantityDisponible",
 *   depotIds?:     [],          // required for quantityDisponible
 *   parametreConfig?: { prefix, suffix }  // for labelType=parametre
 * }
 */
router.post(
  "/generate",
  hasPermission("view_article"),
  generateValidator,
  LabelController.generate,
);

/**
 * POST /api/labels/generate/packs
 * Generate labels for packs. No quantityMode — quantity is global.
 * prixAchat = purchasePrice, prixVente = prixVentePack.
 * Body: {
 *   packs:          [packId, ...],
 *   labelType:      "avecPrix" | "sansPrix" | "parametre" | "intitule",
 *   size?:          "50x25" | "30x15",
 *   quantity?:      number (default 1),
 *   parametreConfig?: { prefix, suffix }
 * }
 */
router.post(
  "/generate/packs",
  hasPermission("view_pack"),
  generatePacksValidator,
  LabelController.generateForPacks,
);

export default router;
