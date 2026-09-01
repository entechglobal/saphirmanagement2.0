import asyncHandler from "express-async-handler";
import sharp from "sharp";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";

import {
  exportCSV,
  exportExcel,
  importCSV,
  importExcel,
} from "../utils/importExportUtils.js";

import prisma from "../../loaders/prisma.js";
import ApiError from "../utils/apiError.js";
import ApiFeatures from "../utils/apiFeatures.js";

import { uploadSingleImage } from "../middlewares/uploadImageMiddleware.js";
import { buildImageUrl } from "../utils/buildImageUrl.js";
import { formatDate, parseCSVDate } from "../utils/formatDates.js";

export const uploadCategoryImage = uploadSingleImage("image");

// Resize image middleware
export const resizeImage = asyncHandler(async (req, res, next) => {
  if (req.file) {
    const filename = `category-${uuidv4()}-${Date.now()}.jpeg`;
    console.log(req.file.buffer);

    await sharp(req.file.buffer)
      .resize(200, 200)
      .toFormat("jpeg")
      .jpeg({ quality: 90 })
      .toFile(`uploads/categories/${filename}`);
    req.body.image = filename;
  }
  next();
});

// Create a new category
export const create = async (data) => {
  const exists = await prisma.category.findUnique({
    where: { name: data.name },
  });

  if (exists) {
    throw new ApiError("Category name already exists", 409);
  }

  // Convert visible from string to boolean
  if (typeof data.visible === "string") {
    data.visible = data.visible.toLowerCase() === "true";
  }
  return prisma.category.create({
    data,
  });
};

// Get all categories with filtering, search, pagination
export const getAll = async (query) => {
  const count = await prisma.category.count();

  const apiFeatures = new ApiFeatures(query)
    .filter()
    .search(["name"])
    .sort()
    .limitFields({
      id: true,
      name: true,
      visible: true,
      image: true,
      afficher: true,
      createdAt: true,
      updatedAt: true,
    })
    .paginate(count);

  const categories = await prisma.category.findMany(apiFeatures.build());

  const categoriesUrl = categories.map((category) => ({
    ...category,
    image: buildImageUrl("categories", category.image),
  }));

  return {
    results: categories.length,
    pagination: apiFeatures.paginationResult,
    data: categoriesUrl,
  };
};

// Get category by ID
export const getById = async (id) => {
  const category = await prisma.category.findUnique({
    where: { id },
  });

  if (!category) {
    throw new ApiError("Category not found", 404);
  }

  return {
    ...category,
    image: buildImageUrl("categories", category.image),
  };
};

export const update = async (id, data) => {
  const category = await prisma.category.findUnique({ where: { id } });

  if (!category) {
    throw new ApiError("Category not found", 404);
  }

  // Convert visible from string to boolean
  if (typeof data.visible === "string") {
    data.visible = data.visible.toLowerCase() === "true";
  }

  const hasImageField = Object.prototype.hasOwnProperty.call(data, "image");
  if (hasImageField && category.image) {
    const isRemoved = data.image === null || data.image === "";
    const isChanged = data.image && data.image !== category.image;

    if (isRemoved || isChanged) {
      const oldImagePath = path.join(
        process.cwd(),
        "uploads/categories",
        category.image,
      );

      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
      }
    }
  }

  return prisma.category.update({
    where: { id },
    data,
  });
};

// Remove category
export const remove = async (id) => {
  const category = await prisma.category.findUnique({ where: { id } });
  if (!category) {
    throw new ApiError("Category not found", 404);
  }
  // Check if category has families
  const familiesCount = await prisma.family.count({
    where: { categoryId: id },
  });

  if (familiesCount > 0) {
    throw new ApiError("This category has families and cannot be deleted", 400);
  }

  // Delete image from uploads/categories if it exists
  if (category.image) {
    const imagePath = path.join(
      process.cwd(),
      "uploads/categories",
      category.image,
    );
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath); // or use async version fs.promises.unlink(imagePath)
    }
  }

  return prisma.category.delete({ where: { id } });
};

/* =========================
   CSV & EXCEL EXPORT
========================= */

const CATEGORY_CSV_FIELDS = ["id", "name", "visible", "createdAt", "updatedAt"];

const CATEGORY_EXCEL_COLUMNS = [
  { header: "ID", key: "id", width: 10 },
  { header: "Name", key: "name", width: 20 },
  { header: "Visible", key: "visible", width: 10 },
  { header: "Created At", key: "createdAt", width: 25 },
  { header: "Updated At", key: "updatedAt", width: 25 },
];

const mapCategoryRow = (c) => ({
  ...c,
  visible: c.visible ? "vrai" : "faux",
  createdAt: formatDate(c.createdAt),
  updatedAt: formatDate(c.updatedAt),
});

export const exportCategoriesCSV = async () => {
  const categories = await prisma.category.findMany();
  return exportCSV(categories.map(mapCategoryRow), CATEGORY_CSV_FIELDS);
};

export const exportCategoriesExcel = async () => {
  const categories = await prisma.category.findMany();
  return exportExcel(
    categories.map((c) => ({ ...c, visible: c.visible ? "vrai" : "faux" })),
    { worksheetName: "Categories", columns: CATEGORY_EXCEL_COLUMNS },
  );
};

export const importCategoriesCSV = (buffer) =>
  importCSV(
    buffer,
    (row) => ({
      name: row.name,
      visible: row.visible?.toLowerCase() !== "faux",
      createdAt: parseCSVDate(row.createdAt),
      updatedAt: parseCSVDate(row.updatedAt),
    }),
    (record) =>
      prisma.category.upsert({
        where: { name: record.name },
        update: { visible: record.visible, updatedAt: record.updatedAt },
        create: record,
      }),
  );

export const importCategoriesExcel = (buffer) =>
  importExcel(
    buffer,
    "Categories",
    (row, rowNumber) => {
      const name = row.getCell(2).value;
      if (!name) throw new ApiError(`Missing name at row ${rowNumber}`, 400);
      if (!row.getCell(2).value) return null; // skip empty
      return {
        name: String(name),
        visible: Boolean(row.getCell(3).value),
        createdAt: row.getCell(4).value,
        updatedAt: row.getCell(5).value,
      };
    },
    (record) =>
      prisma.category.upsert({
        where: { name: record.name },
        update: { visible: record.visible, updatedAt: record.updatedAt },
        create: record,
      }),
  );
