import { body, query } from "express-validator";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";

export const getAllValidator = [
  query("search").optional().isString().isLength({ max: 255 }),
  query("page").optional().isInt({ min: 1 }).toInt(),
  query("limit").optional().isInt({ min: 1, max: 100 }).toInt(),
  validatorMiddleware,
];

export const markAsReceivedValidator = [
  body("colisTrackingNumber")
    .notEmpty().withMessage("colisTrackingNumber is required")
    .isString()
    .isLength({ max: 100 }).withMessage("colisTrackingNumber cannot exceed 100 characters")
    .trim(),
  validatorMiddleware,
];
