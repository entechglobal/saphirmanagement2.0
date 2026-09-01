import express from "express";
import * as bonRetourFournisseurController from "../controllers/bonRetourFournisseurController.js";
import * as bonRetourFournisseurValidation from "../validations/bonRetourFournisseurValidation.js";
import { auth } from "../middlewares/authMiddleware.js";
import { hasPermission } from "../middlewares/rbacMiddleware.js";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";

const router = express.Router();

router.use(auth);

router.get(
  "/next-number",
  hasPermission("view_bon_retour_fournisseur"),
  bonRetourFournisseurValidation.getNextNumberValidator,
  validatorMiddleware,
  bonRetourFournisseurController.getNextDocumentNumber,
);

router.get(
  "/products",
  hasPermission("view_bon_retour_fournisseur"),
  bonRetourFournisseurValidation.getProductsValidator,
  validatorMiddleware,
  bonRetourFournisseurController.getProductsForBonRetourFournisseur,
);

router.get(
  "/",
  hasPermission("view_bon_retour_fournisseur"),
  bonRetourFournisseurValidation.getAllValidator,
  validatorMiddleware,
  bonRetourFournisseurController.getAllBonRetourFournisseurs,
);

router.post(
  "/",
  hasPermission("create_bon_retour_fournisseur"),
  bonRetourFournisseurValidation.createValidator,
  validatorMiddleware,
  bonRetourFournisseurController.createBonRetourFournisseur,
);

router.get(
  "/:id",
  hasPermission("view_bon_retour_fournisseur"),
  bonRetourFournisseurValidation.idValidator,
  validatorMiddleware,
  bonRetourFournisseurController.getBonRetourFournisseurById,
);

router.put(
  "/:id/validate",
  hasPermission("validate_bon_retour_fournisseur"),
  bonRetourFournisseurValidation.validateStatusValidator,
  validatorMiddleware,
  bonRetourFournisseurController.validateBonRetourFournisseur,
);

router.get(
  "/:id/print",
  hasPermission("view_bon_retour_fournisseur"),
  bonRetourFournisseurValidation.idValidator,
  validatorMiddleware,
  bonRetourFournisseurController.printBonRetourFournisseur,
);

router.put(
  "/:id",
  hasPermission("update_bon_retour_fournisseur"),
  bonRetourFournisseurValidation.updateValidator,
  validatorMiddleware,
  bonRetourFournisseurController.updateBonRetourFournisseur,
);

router.delete(
  "/:id",
  hasPermission("delete_bon_retour_fournisseur"),
  bonRetourFournisseurValidation.idValidator,
  validatorMiddleware,
  bonRetourFournisseurController.deleteBonRetourFournisseur,
);

export default router;
