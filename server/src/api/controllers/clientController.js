import * as ClientService from "../services/clientService.js";
import asyncHandler from "express-async-handler";

// ============================================
// GET ALL CLIENTS (UPDATED with société filter)
// ============================================
export const getAllClients = asyncHandler(async (req, res) => {
  // ⭐ Pass societeId from middleware
  const clientsData = await ClientService.getAll(req.query, req.societeId);

  res.status(200).json({
    success: true,
    results: clientsData.results,
    pagination: clientsData.pagination,
    data: clientsData.data,
  });
});

// ============================================
// GET CLIENT BY ID (UPDATED with société check)
// ============================================
export const getClientById = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // ⭐ Pass requesting user for authorization
  const client = await ClientService.getById(Number(id), req.user);

  res.status(200).json({
    success: true,
    message: "Client information retrieved successfully",
    data: client,
  });
});

// ============================================
// CREATE CLIENT (UPDATED with société)
// ============================================
export const createClient = asyncHandler(async (req, res) => {
  // ⭐ Pass societeId from middleware
  const client = await ClientService.create(req.body, req.societeId);

  res.status(201).json({
    success: true,
    message: "Client created successfully",
    data: client,
  });
});

// ============================================
// UPDATE CLIENT (UPDATED with société check)
// ============================================
export const updateClient = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // ⭐ Pass requesting user for authorization
  const client = await ClientService.update(Number(id), req.body, req.user);

  res.status(200).json({
    success: true,
    message: "Client updated successfully",
    data: client,
  });
});

// ============================================
// DELETE CLIENT (UPDATED with société check)
// ============================================
export const deleteClient = asyncHandler(async (req, res) => {
  const { id } = req.params;

  // ⭐ Pass requesting user for authorization
  await ClientService.remove(Number(id), req.user);

  res.status(200).json({
    success: true,
    message: "Client deleted successfully",
  });
});

// ============================================
// CHECK CREDIT LIMIT (UPDATED with société check)
// ============================================
export const checkCreditLimit = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    return res.status(400).json({
      success: false,
      message: "Valid amount is required",
    });
  }

  // ⭐ Pass requesting user for authorization
  const result = await ClientService.checkCreditLimit(
    Number(id),
    amount,
    req.user,
  );

  res.status(200).json({
    success: true,
    message: result.message,
    data: result,
  });
});

// ============================================
// GET CLIENT STATISTICS (UPDATED with société filter)
// ============================================
export const getClientStatistics = asyncHandler(async (req, res) => {
  // ⭐ Pass societeId from middleware (null for super admin)
  const stats = await ClientService.getStatistics(req.societeId);

  res.status(200).json({
    success: true,
    message: "Client statistics retrieved successfully",
    data: stats,
  });
});

// ============================================
// EXPORT CLIENTS TO CSV (UPDATED with société filter)
// ============================================
export const exportClientsCSV = asyncHandler(async (req, res) => {
  // ⭐ Pass societeId from middleware
  const csv = await ClientService.exportClientsCSV(req.societeId);

  res.header("Content-Type", "text/csv");
  res.attachment("clients.csv");
  res.send(csv);
});

// ============================================
// EXPORT CLIENTS TO EXCEL (UPDATED with société filter)
// ============================================
export const exportClientsExcel = asyncHandler(async (req, res) => {
  // ⭐ Pass societeId from middleware
  const workbook = await ClientService.exportClientsExcel(req.societeId);

  res.setHeader(
    "Content-Type",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  );
  res.setHeader("Content-Disposition", "attachment; filename=clients.xlsx");
  await workbook.xlsx.write(res);
  res.end();
});

// ============================================
// IMPORT CLIENTS FROM CSV (UPDATED with société)
// ============================================
export const importClientsCSV = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No file uploaded",
    });
  }

  // ⭐ Pass societeId from middleware
  const importedCount = await ClientService.importClientsCSV(
    req.file.buffer,
    req.societeId,
  );

  res.status(201).json({
    success: true,
    message: "CSV imported successfully",
    imported: importedCount,
  });
});

// ============================================
// IMPORT CLIENTS FROM EXCEL (UPDATED with société)
// ============================================
export const importClientsExcel = asyncHandler(async (req, res) => {
  if (!req.file) {
    return res.status(400).json({
      success: false,
      message: "No file uploaded",
    });
  }

  // ⭐ Pass societeId from middleware
  const importedCount = await ClientService.importClientsExcel(
    req.file.buffer,
    req.societeId,
  );

  res.status(201).json({
    success: true,
    message: "Excel imported successfully",
    imported: importedCount,
  });
});

// ============================================
// EXPORT FUNCTIONS
// ============================================
export default {
  getAllClients,
  getClientById,
  createClient,
  updateClient,
  deleteClient,
  checkCreditLimit,
  getClientStatistics,
  exportClientsCSV,
  exportClientsExcel,
  importClientsCSV,
  importClientsExcel,
};
