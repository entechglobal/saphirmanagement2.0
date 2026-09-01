import { Router } from "express";
import * as SituationController from "../controllers/situationController.js";
import { auth } from "../middlewares/authMiddleware.js";
import { societyFilter } from "../middlewares/societyFilterMiddleware.js";
import { hasPermission } from "../middlewares/rbacMiddleware.js";
import { listSituationValidator } from "../validations/situationValidation.js";

const router = Router();

router.use(auth);
router.use(societyFilter);

router.get(
  "/client",
  hasPermission("view_bon_livraison"),
  listSituationValidator,
  SituationController.getClientSituation,
);

router.get(
  "/fournisseur",
  hasPermission("view_bon_reception"),
  listSituationValidator,
  SituationController.getFournisseurSituation,
);

export default router;
