import * as DeliveryService from "../services/deliveryService.js";
import asyncHandler from "express-async-handler";

export const getAllDeliveries = asyncHandler(async (req, res) => {
  const data = await DeliveryService.getAll(req.query, req.societeId);
  res.status(200).json({
    success: true,
    results: data.results,
    pagination: data.pagination,
    data: data.data,
  });
});

export const getDeliveryById = asyncHandler(async (req, res) => {
  const delivery = await DeliveryService.getById(Number(req.params.id), req.user);
  res.status(200).json({ success: true, data: delivery });
});

export const createDelivery = asyncHandler(async (req, res) => {
  const delivery = await DeliveryService.create(req.body, req.societeId);
  res.status(201).json({ success: true, data: delivery });
});

export const updateDelivery = asyncHandler(async (req, res) => {
  const delivery = await DeliveryService.update(Number(req.params.id), req.body, req.user);
  res.status(200).json({ success: true, data: delivery });
});

export const deleteDelivery = asyncHandler(async (req, res) => {
  await DeliveryService.remove(Number(req.params.id), req.user);
  res.status(200).json({ success: true, message: "Delivery deleted successfully" });
});

export const toggleDeliveryActive = asyncHandler(async (req, res) => {
  const delivery = await DeliveryService.toggleActive(Number(req.params.id), req.user);
  res.status(200).json({ success: true, data: delivery });
});
