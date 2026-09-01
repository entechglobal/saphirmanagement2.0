import { check } from "express-validator";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";

export const listSituationValidator = [
  check("page").optional().isInt({ min: 1 }),
  check("limit").optional().isInt({ min: 1, max: 100 }),
  check("keyword").optional().isString(),
  check("clientId").optional().isInt({ min: 1 }),
  check("fournisseurId").optional().isInt({ min: 1 }),
  check("startDate").optional().isISO8601(),
  check("endDate").optional().isISO8601(),
  validatorMiddleware,
];
