import express from "express";
import { auth } from "../middlewares/authMiddleware.js";
import validatorMiddleware from "../middlewares/validatorMiddleware.js";
import * as notificationController from "../controllers/notificationController.js";
import { idValidator } from "../validations/caisseValidation.js";

const router = express.Router();

router.use(auth);

router.get("/", notificationController.getMyNotifications);
router.get("/unread-count", notificationController.getUnreadCount);
router.patch("/read-all", notificationController.markAllRead);
router.patch(
  "/:id/read",
  idValidator,
  validatorMiddleware,
  notificationController.markRead
);

export default router;
