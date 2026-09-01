import express from "express";
import { createSalesDocumentController } from "../controllers/salesDocumentController.js";
import { createSalesDocumentValidation } from "../validations/salesDocumentValidation.js";
import { auth } from "../middlewares/authMiddleware.js";
import { hasPermission } from "../middlewares/rbacMiddleware.js";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";

/**
 * Builds Express router for a sales document type.
 * @param {object} opts
 * @param {'commande'|'devis'|'facture'} opts.type
 * @param {boolean} opts.hidePrices
 * @param {boolean} opts.requireClient
 * @param {string} opts.permPrefix e.g. 'commande' → view_commande
 */
export const createSalesDocumentRouter = ({
  type,
  hidePrices = false,
  requireClient = true,
  permPrefix,
}) => {
  const router = express.Router();
  const controller = createSalesDocumentController(type);
  const validation = createSalesDocumentValidation({
    hidePrices,
    requireClient,
  });
  const p = permPrefix || type;

  router.use(auth);

  router.get(
    "/next-number",
    hasPermission(`view_${p}`),
    validation.getNextNumberValidator,
    validatorMiddleware,
    controller.getNextDocumentNumber,
  );

  router.get(
    "/products",
    hasPermission(`view_${p}`),
    validation.getProductsValidator,
    validatorMiddleware,
    controller.getProducts,
  );

  router.get(
    "/",
    hasPermission(`view_${p}`),
    validation.getAllValidator,
    validatorMiddleware,
    controller.getAll,
  );

  router.post(
    "/",
    hasPermission(`create_${p}`),
    validation.createValidator,
    validatorMiddleware,
    controller.create,
  );

  router.get(
    "/:id",
    hasPermission(`view_${p}`),
    validation.idValidator,
    validatorMiddleware,
    controller.getById,
  );

  router.put(
    "/:id",
    hasPermission(`update_${p}`),
    validation.updateValidator,
    validatorMiddleware,
    controller.update,
  );

  router.delete(
    "/:id",
    hasPermission(`delete_${p}`),
    validation.idValidator,
    validatorMiddleware,
    controller.remove,
  );

  router.get(
    "/:id/print",
    hasPermission(`view_${p}`),
    validation.idValidator,
    validatorMiddleware,
    controller.print,
  );

  return router;
};

export default createSalesDocumentRouter;
