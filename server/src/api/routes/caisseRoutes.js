import express from "express";
import { auth } from "../middlewares/authMiddleware.js";
import { hasPermission } from "../middlewares/rbacMiddleware.js";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";
import * as caisseController from "../controllers/caisseController.js";
import {
  createCaisseValidator,
  createMyCaisseValidator,
  updateCaisseValidator,
  createChargeValidator,
  createRetraitValidator,
  createDepotValidator,
  createTransferValidator,
  createBankWalletValidator,
  createCoffreWalletValidator,
  getTransactionsValidator,
  getAllTransactionsValidator,
  idValidator,
} from "../validations/caisseValidation.js";

const router = express.Router();

router.use(auth);

// ─── Static routes (before /:id to avoid conflicts) ──────────────

router.get("/me", caisseController.getMyCaisse);

router.post(
  "/me",
  createMyCaisseValidator,
  validatorMiddleware,
  caisseController.createMyCaisse
);

router.get(
  "/transactions",
  getAllTransactionsValidator,
  validatorMiddleware,
  caisseController.getAllTransactions
);

router.get(
  "/transferable",
  hasPermission("view_caisse"),
  caisseController.getTransferableCaisses
);

router.post(
  "/charge",
  createChargeValidator,
  validatorMiddleware,
  caisseController.createCharge
);

router.post(
  "/retrait",
  hasPermission("create_caisse_retrait"),
  createRetraitValidator,
  validatorMiddleware,
  caisseController.createRetrait
);

router.post(
  "/depot",
  hasPermission("create_caisse_depot"),
  createDepotValidator,
  validatorMiddleware,
  caisseController.createDepot
);

router.post(
  "/transfer",
  hasPermission("create_caisse_depot"),
  createTransferValidator,
  validatorMiddleware,
  caisseController.createTransfer
);

router.post(
  "/bank",
  hasPermission("create_caisse"),
  createBankWalletValidator,
  validatorMiddleware,
  caisseController.createBankWallet
);

router.post(
  "/coffre",
  hasPermission("create_caisse"),
  createCoffreWalletValidator,
  validatorMiddleware,
  caisseController.createCoffreWallet
);

// ─── Collection routes ────────────────────────────────────────────

router.get("/", caisseController.getAllCaisses);

router.post(
  "/",
  hasPermission("create_caisse"),
  createCaisseValidator,
  validatorMiddleware,
  caisseController.createCaisse
);

// ─── Item routes (:id last) ───────────────────────────────────────

router.get("/:id", idValidator, validatorMiddleware, caisseController.getCaisseById);

router.put(
  "/:id",
  hasPermission("update_caisse"),
  updateCaisseValidator,
  validatorMiddleware,
  caisseController.updateCaisse
);

router.delete(
  "/:id",
  hasPermission("delete_caisse"),
  idValidator,
  validatorMiddleware,
  caisseController.deleteCaisse
);

router.get(
  "/:id/transactions",
  getTransactionsValidator,
  validatorMiddleware,
  caisseController.getTransactions
);

router.get(
  "/:id/dashboard",
  idValidator,
  validatorMiddleware,
  caisseController.getDashboard
);

export default router;
