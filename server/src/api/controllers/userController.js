import * as UserService from "../services/userService.js";
import asyncHandler from "express-async-handler";

/* ============================================================
   CREATE USER
============================================================ */
export const createUser = asyncHandler(async (req, res) => {
  const user = await UserService.create(req.body, req.user);

  res.status(201).json({
    success: true,
    message: "User created successfully",
    data: user,
  });
});

/* ============================================================
   GET ALL USERS
============================================================ */
export const getAllUsers = asyncHandler(async (req, res) => {
  const result = await UserService.getAll(req.query, req.user);

  res.status(200).json({
    success: true,
    results: result.results,
    pagination: result.pagination,
    data: result.data,
  });
});

/* ============================================================
   GET USER BY ID
============================================================ */
export const getUserById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await UserService.getById(Number(id), req.user);

  res.status(200).json({
    success: true,
    message: "User retrieved successfully",
    data: user,
  });
});

/* ============================================================
   GET CURRENT USER (ME)
============================================================ */
export const getCurrentUser = asyncHandler(async (req, res) => {
  const user = await UserService.getCurrentUser(req.user.id);

  res.status(200).json({
    success: true,
    message: "Current user retrieved successfully",
    data: user,
  });
});

/* ============================================================
   UPDATE USER
============================================================ */
export const updateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const user = await UserService.update(Number(id), req.body, req.user);

  res.status(200).json({
    success: true,
    message: "User updated successfully",
    data: user,
  });
});

/* ============================================================
   UPDATE PASSWORD
============================================================ */
export const updatePassword = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await UserService.updatePassword(
    Number(id),
    req.body,
    req.user,
  );

  res.status(200).json({
    success: true,
    message: result.message,
  });
});

/* ============================================================
   DEACTIVATE USER (Soft Delete)
============================================================ */
export const deactivateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await UserService.deactivate(Number(id), req.user);

  res.status(200).json({
    success: true,
    message: result.message,
  });
});

/* ============================================================
   REACTIVATE USER
============================================================ */
export const reactivateUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await UserService.reactivate(Number(id), req.user);

  res.status(200).json({
    success: true,
    message: result.message,
  });
});

/* ============================================================
   DELETE USER (Hard Delete)
============================================================ */
export const deleteUser = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const result = await UserService.remove(Number(id), req.user);

  res.status(200).json({
    success: true,
    message: result.message,
  });
});

/* ============================================================
   GET USER STATISTICS
============================================================ */
export const getUserStatistics = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const stats = await UserService.getStatistics(Number(id), req.user);

  res.status(200).json({
    success: true,
    message: "User statistics retrieved successfully",
    data: stats,
  });
});

/* ============================================================
   GET USERS BY SOCIÉTÉ
============================================================ */
export const getUsersBySociete = asyncHandler(async (req, res) => {
  const { societeId } = req.params;
  const result = await UserService.getBySociete(
    Number(societeId),
    req.user,
    req.query,
  );

  res.status(200).json({
    success: true,
    societeId: result.societeId,
    results: result.results,
    data: result.data,
  });
});
