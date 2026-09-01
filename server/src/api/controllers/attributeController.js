import * as AttributeService from "../services/attributeService.js";
import asyncHandler from "express-async-handler";

export const createAttributeWithValues = asyncHandler(async (req, res) => {
  const attribute = await AttributeService.createAttributeWithValues(req.body);
  res.status(201).json({
    message: "Attribute created successfully with values",
    data: attribute,
  });
});

export const getAttributeById = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const attribute = await AttributeService.getAttributeById(Number(id));
  res.status(200).json({
    message: "Attribute retrieved successfully",
    data: attribute,
  });
});

export const getAttributesWithValues = asyncHandler(async (req, res) => {
  const attributes = await AttributeService.getAttributesWithValues();
  res.status(200).json({
    message: "All attributes with values retrieved",
    data: attributes,
    count: attributes.length,
  });
});

export const deleteAttribute = asyncHandler(async (req, res) => {
  const { id } = req.params;
  await AttributeService.deleteAttribute(Number(id));
  res.status(204).json({
    message: "Attribute deleted successfully",
  });
});

export const updateAttributeWithValues = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const attribute = await AttributeService.updateAttributeWithValues(
    Number(id),
    req.body
  );
  res.status(200).json({
    message: "Attribute and values updated successfully",
    data: attribute,
  });
});
