import asyncHandler from "express-async-handler";
import * as AttendanceService from "../services/attendanceService.js";

export const getUsers = asyncHandler(async (req, res) => {
  const data = await AttendanceService.getEnrollableUsers(
    req.societeId || req.user.societeId,
  );
  res.status(200).json({ success: true, results: data.length, data });
});

export const importRecords = asyncHandler(async (req, res) => {
  const data = await AttendanceService.importRecords(
    req.body,
    req.user,
    req.societeId || req.body.societeId,
  );
  res.status(200).json({
    success: true,
    message: "Attendance import completed",
    data,
  });
});

export const getAll = asyncHandler(async (req, res) => {
  const result = await AttendanceService.getAll(
    req.query,
    req.societeId || req.query.societeId,
  );
  res.status(200).json({
    success: true,
    results: result.data.length,
    pagination: result.pagination,
    data: result.data,
  });
});

export const getStats = asyncHandler(async (req, res) => {
  const data = await AttendanceService.getStats(
    req.societeId || req.query.societeId,
    req.query,
  );
  res.status(200).json({ success: true, data });
});

export const getSettings = asyncHandler(async (req, res) => {
  const data = await AttendanceService.getSettings(
    req.societeId || req.user?.societeId,
  );
  res.status(200).json({ success: true, data });
});

export const updateSettings = asyncHandler(async (req, res) => {
  const data = await AttendanceService.updateSettings(
    req.societeId || req.user?.societeId,
    req.body,
  );
  res.status(200).json({
    success: true,
    message: "Attendance settings updated",
    data,
  });
});

export const getSummary = asyncHandler(async (req, res) => {
  const result = await AttendanceService.getSummary(
    req.query,
    req.societeId || req.query.societeId,
  );
  res.status(200).json({
    success: true,
    results: result.data.length,
    pagination: result.pagination,
    settings: result.settings,
    totals: result.totals,
    data: result.data,
  });
});
