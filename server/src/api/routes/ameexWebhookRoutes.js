import express from "express";
import * as AmeexWebhookController from "../controllers/ameexWebhookController.js";

const router = express.Router();

/**
 * POST /api/webhooks/ameex
 *
 * Public endpoint — no auth.
 * Ameex sends application/x-www-form-urlencoded; express.urlencoded()
 * is applied at the route level so it doesn't affect other routes.
 */
router.post(
  "/ameex",
  express.urlencoded({ extended: false }),
  AmeexWebhookController.receive,
);

export default router;
