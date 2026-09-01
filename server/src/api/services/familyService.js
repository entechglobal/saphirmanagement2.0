import asyncHandler from "express-async-handler";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";
import multer from "multer";
import { exportCSV, exportExcel, importCSV, importExcel } from "../utils/importExportUtils.js";

import prisma from "../../loaders/prisma.js";
import ApiError from "../utils/apiError.js";
import ApiFeatures from "../utils/apiFeatures.js";
import { uploadSingleImage } from "../middlewares/uploadImageMiddleware.js";
import { buildImageUrl } from "../utils/buildImageUrl.js";
import { formatDate, parseCSVDate } from "../utils/formatDates.js";

// Upload middleware
export const uploadFamilyImage = uploadSingleImage("image");

// Resize image middleware
export const resizeFamilyImage = asyncHandler(async (req, res, next) => {
  if (req.file) {
    const filename = `family-${uuidv4()}-${Date.now()}.jpeg`;
    await sharp(req.file.buffer)
      .resize(200, 200)
      .toFormat("jpeg")
      .jpeg({ quality: 90 })
      .toFile(`uploads/families/${filename}`);

    req.body.image = filename;
  }
  next();
});

// Create a new family
export const create = async (data) => {
  const exists = await prisma.family.findUnique({
    where: { name: data.name },
  });

  if (exists) {
    throw new ApiError("family name already exists", 409);
  }
  if (typeof data.visible === "string") {
    data.visible = data.visible.toLowerCase() === "true";
  }

  if (typeof data.manageInStock === "string") {
    data.manageInStock = data.manageInStock.toLowerCase() === "true";
  }

  data.categoryId = await parseInt(data.categoryId);

  return prisma.family.create({
    data,
    include: {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });
};

// Get all families with filtering, search, pagination

export const getAll = async (query) => {
  // Count only families whose category is visible
  const count = await prisma.family.count();

  const apiFeatures = new ApiFeatures(query)
    .filter()
    .search(["name"])
    .sort()
    .limitFields({
      id: true,
      name: true,
      categoryId: true,
      manageInStock: true,
      TVA: true,
      visible: true,
      image: true,
      afficher: true,
      remise: true,
      createdAt: true,
      updatedAt: true,
    })
    .paginate(count);

  // Get the base query
  const baseQuery = apiFeatures.build();

  // Add the category visibility filter to the where clause
  const families = await prisma.family.findMany({
    ...baseQuery,
    where: {
      ...baseQuery.where,
      category: {
        visible: true,
      },
    },
  });

  const familiesUrl = families.map((family) => ({
    ...family,
    image: buildImageUrl("families", family.image),
  }));

  return {
    results: families.length,
    pagination: apiFeatures.paginationResult,
    data: familiesUrl,
  };
};

// Get families by category ID
export const getByCategory = async (categoryId) => {
  const families = await prisma.family.findMany({
    where: {
      categoryId,
    },
    include: {
      category: {
        select: {
          name: true,
        },
      },
    },
  });

  return families.map((family) => ({
    ...family,
    image: buildImageUrl("families", family.image),
  }));
};

// Get family by ID
export const getById = async (id) => {
  const family = await prisma.family.findUnique({
    where: { id },
    include: {
      category: {
        select: {
          name: true,
        },
      },
    },
  });

  if (!family) {
    throw new ApiError("Family not found", 404);
  }

  return {
    ...family,
    image: buildImageUrl("families", family.image),
  };
};

// Update family
export const update = async (id, data) => {
  const family = await prisma.family.findUnique({ where: { id } });
  if (!family) {
    throw new ApiError("Family not found", 404);
  }

  // Convert string values to appropriate types
  if (typeof data.visible === "string") {
    data.visible = data.visible.toLowerCase() === "true";
  }

  if (typeof data.manageInStock === "string") {
    data.manageInStock = data.manageInStock.toLowerCase() === "true";
  }
  if (typeof data.categoryId === "string") {
    data.categoryId = parseInt(data.categoryId);
  }

  if (data.TVA && typeof data.TVA === "string") {
    data.TVA = parseFloat(data.TVA);
  }

  if (data.remise && typeof data.remise === "string") {
    data.remise = parseFloat(data.remise);
  }

  // If new image is provided, delete old image
  const hasImageField = Object.prototype.hasOwnProperty.call(data, "image");
  if (hasImageField && family.image) {
    const isRemoved = data.image === null || data.image === "";
    const isChanged = data.image && data.image !== family.image;

    if (isRemoved || isChanged) {
      const oldImagePath = path.join(
        process.cwd(),
        "uploads/families",
        family.image,
      );

      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }
  }

  const updatedFamily = await prisma.family.update({
    where: { id },
    data,
    include: {
      category: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  });

  return {
    ...updatedFamily,
    image: buildImageUrl("families", updatedFamily.image),
  };
};

// Remove family
export const remove = async (id) => {
  const family = await prisma.family.findUnique({ where: { id } });
  if (!family) {
    throw new ApiError("Family not found", 404);
  }
  // Check if family has articles

  const articlesCount = await prisma.article.count({
    where: { familyId: id },
  });

  if (articlesCount > 0) {
    throw new ApiError("This family has articles and cannot be deleted", 400);
  }

  // Delete image from uploads/families if it exists
  if (family.image) {
    const imagePath = path.join(
      process.cwd(),
      "uploads/families",
      family.image,
    );
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  }

  return prisma.family.delete({ where: { id } });
};

/* =========================
   CSV & EXCEL EXPORT
========================= */

const FAMILY_CSV_FIELDS = ["id", "name", "categoryId", "manageInStock", "TVA", "visible", "remise", "createdAt", "updatedAt"];

const FAMILY_EXCEL_COLUMNS = [
  { header: "ID", key: "id", width: 10 },
  { header: "Name", key: "name", width: 20 },
  { header: "Category ID", key: "categoryId", width: 20 },
  { header: "Manage Stock", key: "manageInStock", width: 20 },
  { header: "TVA (%)", key: "TVA", width: 10 },
  { header: "Visible", key: "visible", width: 10 },
  { header: "Remise (%)", key: "remise", width: 20 },
  { header: "Created At", key: "createdAt", width: 25 },
  { header: "Updated At", key: "updatedAt", width: 25 },
];

const mapFamilyToExport = (f) => ({
  ...f,
  manageInStock: f.manageInStock ? "vrai" : "faux",
  visible: f.visible ? "vrai" : "faux",
  TVA: f.TVA ? Number(f.TVA) * 100 : null,
  remise: f.remise ? Number(f.remise) * 100 : null,
  createdAt: formatDate(f.createdAt),
  updatedAt: formatDate(f.updatedAt),
});

const FAMILY_INCLUDE = { include: { category: { select: { name: true } } } };

export const exportFamiliesCSV = async () => {
  const families = await prisma.family.findMany(FAMILY_INCLUDE);
  return exportCSV(families.map(mapFamilyToExport), FAMILY_CSV_FIELDS);
};

export const exportFamiliesExcel = async () => {
  const families = await prisma.family.findMany(FAMILY_INCLUDE);
  return exportExcel(
    families.map(mapFamilyToExport),
    { worksheetName: "Families", columns: FAMILY_EXCEL_COLUMNS }
  );
};

const parseFamilyCSVRow = async (row) => {
  if (!row.categoryId) throw new ApiError("Category ID is required", 400);

  const category = await prisma.category.findUnique({ where: { id: parseInt(row.categoryId) } });
  if (!category) throw new ApiError(`Category with ID ${row.categoryId} not found`, 404);

  const tvaPercent = row.TVA !== "" && row.TVA != null ? Number(row.TVA) : 0;
  if (isNaN(tvaPercent) || tvaPercent < 0 || tvaPercent > 100)
    throw new ApiError(`TVA must be between 0 and 100 for family "${row.name}"`, 400);

  let remise = null;
  if (row.remise !== "" && row.remise != null) {
    const remisePercent = Number(row.remise);
    if (isNaN(remisePercent) || remisePercent < 0 || remisePercent > 100)
      throw new ApiError(`Remise must be between 0 and 100 for family "${row.name}"`, 400);
    remise = remisePercent / 100;
  }

  return {
    name: row.name,
    categoryId: parseInt(row.categoryId),
    manageInStock: row.manageInStock?.toLowerCase() !== "faux",
    TVA: tvaPercent / 100,
    visible: row.visible?.toLowerCase() !== "faux",
    remise,
    createdAt: parseCSVDate(row.createdAt),
    updatedAt: parseCSVDate(row.updatedAt),
  };
};

const parseFamilyExcelRow = async (row, rowNumber) => {
  if (!row.getCell(2).value) return null;

  const name = row.getCell(2).value;
  const categoryId = parseInt(row.getCell(3).value);
  if (!name) throw new ApiError(`Missing name at row ${rowNumber}`, 400);
  if (!categoryId || isNaN(categoryId)) throw new ApiError(`Invalid category ID at row ${rowNumber}`, 400);

  const category = await prisma.category.findUnique({ where: { id: categoryId } });
  if (!category) throw new ApiError(`Category with ID ${categoryId} not found at row ${rowNumber}`, 404);

  const parseBool = (val) => typeof val === "boolean" ? val : ["vrai", "true"].includes(String(val).toLowerCase());
  const parsePercent = (val, label) => {
    if (val == null || val === "") return null;
    const n = parseFloat(val);
    if (isNaN(n) || n < 0 || n > 100) throw new ApiError(`${label} must be 0-100 at row ${rowNumber}`, 400);
    return n / 100;
  };

  return {
    name: String(name).trim(),
    categoryId,
    manageInStock: parseBool(row.getCell(4).value),
    TVA: parsePercent(row.getCell(5).value, "TVA") ?? 0,
    visible: parseBool(row.getCell(6).value),
    remise: parsePercent(row.getCell(7).value, "Remise"),
  };
};

const saveFamilyUpsert = (family) =>
  prisma.family.upsert({
    where: { name: family.name },
    update: { categoryId: family.categoryId, manageInStock: family.manageInStock, TVA: family.TVA, visible: family.visible, remise: family.remise, updatedAt: family.updatedAt },
    create: family,
  });

export const importFamiliesCSV = (buffer) => importCSV(buffer, parseFamilyCSVRow, saveFamilyUpsert);

export const importFamiliesExcel = (buffer) => importExcel(buffer, "Families", parseFamilyExcelRow, saveFamilyUpsert);
