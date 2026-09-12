import { Router } from "express";
import * as AttendanceController from "../controllers/attendanceController.js";
import { auth } from "../middlewares/authMiddleware.js";
import { societyFilter } from "../middlewares/societyFilterMiddleware.js";
import { attendanceAdminOnly } from "../middlewares/attendanceAdminMiddleware.js";
import {
  importValidator,
  listValidator,
  settingsValidator,
} from "../validations/attendanceValidation.js";

const router = Router();

router.use(auth);
router.use(attendanceAdminOnly);
router.use(societyFilter);

router.get("/users", AttendanceController.getUsers);
router.get("/stats", AttendanceController.getStats);
router.get("/settings", AttendanceController.getSettings);
router.put("/settings", settingsValidator, AttendanceController.updateSettings);
router.get("/summary", listValidator, AttendanceController.getSummary);
router.post("/import", importValidator, AttendanceController.importRecords);
router.get("/", listValidator, AttendanceController.getAll);

export default router;
