import { check } from "express-validator";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";

export const overviewValidator = [
  check("dateFrom").optional().isISO8601(),
  check("dateTo").optional().isISO8601(),
  validatorMiddleware,
];
