import prisma from "../../loaders/prisma.js";
import ApiError from "../utils/apiError.js";
import ApiFeatures from "../utils/apiFeatures.js";

// Import Domain Services
import stockValidation from "./domain/stockValidationService.js";
import stockManagement from "./domain/stockManagementService.js";
import productVisibility from "../utils/productVisibilityUtility.js";
import timeRange from "../utils/timeRangeUtility.js";

/* ============================================================
   INVENTORY SERVICE - INTEGRATED WITH BUSINESS RULES

   Schema field mapping (InventoryLine):
   - quantityTheoretical  = current stock in system before count
   - quantityCounted      = physical count entered by user
   - quantityDifference   = counted - theoretical (the variance)
============================================================ */

/* ============================================================
   HELPER: Generate Inventory Number
============================================================ */
const generateInventoryNumber = async (societeId) => {
  const year = new Date().getFullYear();
  const prefix = `INV-${year}`;

  const lastInventory = await prisma.inventory.findFirst({
    where: {
      societeId,
      inventoryNumber: { startsWith: prefix },
    },
    orderBy: { inventoryNumber: "desc" },
    select: { inventoryNumber: true },
  });

  let nextNumber = 1;
  if (lastInventory) {
    const lastNum = parseInt(lastInventory.inventoryNumber.split("-")[2]);
    nextNumber = lastNum + 1;
  }

  return `${prefix}-${String(nextNumber).padStart(4, "0")}`;
};

/* ============================================================
   HELPER: Validate Depot Access
============================================================ */
const validateDepotAccess = async (depotId, user) => {
  const depot = await prisma.depot.findUnique({
    where: { id: depotId },
    select: {
      id: true,
      code: true,
      name: true,
      societeId: true,
      active: true,
    },
  });

  if (!depot) throw new ApiError("Depot not found", 404);
  if (!depot.active)
    throw new ApiError(`Depot "${depot.name}" is inactive`, 400);

  if (!user.isSuperAdmin && depot.societeId !== user.societeId) {
    throw new ApiError(
      "Access denied. This depot belongs to another société.",
      403,
    );
  }

  return depot;
};

/* ============================================================
   HELPER: Validate Inventory Lines (WITH VISIBILITY CHECK)
============================================================ */
const validateInventoryLines = async (lines) => {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new ApiError("At least one inventory line is required", 400);
  }

  const seenArticles = new Set();
  const seenVariants = new Set();

  lines.forEach((line, index) => {
    if (!line.articleId && !line.variantId) {
      throw new ApiError(
        `Line ${index + 1}: Either articleId or variantId is required`,
        400,
      );
    }
    if (line.articleId && line.variantId) {
      throw new ApiError(
        `Line ${index + 1}: Provide either articleId OR variantId, not both`,
        400,
      );
    }

    if (line.articleId) {
      if (seenArticles.has(line.articleId)) {
        throw new ApiError(
          `Line ${index + 1}: Duplicate articleId ${line.articleId}.`,
          400,
        );
      }
      seenArticles.add(line.articleId);
    }

    if (line.variantId) {
      if (seenVariants.has(line.variantId)) {
        throw new ApiError(
          `Line ${index + 1}: Duplicate variantId ${line.variantId}.`,
          400,
        );
      }
      seenVariants.add(line.variantId);
    }

    if (line.quantityCounted === undefined || line.quantityCounted === null) {
      throw new ApiError(`Line ${index + 1}: quantityCounted is required`, 400);
    }

    const quantity = parseFloat(line.quantityCounted);
    if (isNaN(quantity) || quantity < 0) {
      throw new ApiError(
        `Line ${index + 1}: quantityCounted must be 0 or greater`,
        400,
      );
    }
  });

  // Validate product visibility
  await productVisibility.validateBatchProductVisibility(
    lines.map((line) => ({
      articleId: line.articleId,
      variantId: line.variantId,
    })),
    "inventory",
  );
};

/* ============================================================
   HELPER: Categorize by Stock Management
============================================================ */
const categorizeByStockManagement = async (lines) => {
  const stockManaged = [];
  const nonStockManaged = [];

  for (const line of lines) {
    const isManaged = await stockManagement.isProductStockManaged(
      line.articleId,
      line.variantId,
    );
    if (isManaged) {
      stockManaged.push(line);
    } else {
      nonStockManaged.push(line);
    }
  }

  return { stockManaged, nonStockManaged };
};

/* ============================================================
   HELPER: Fetch Current Stock
============================================================ */
const fetchCurrentStock = async (depotId, lines) => {
  const stockMap = new Map();

  for (const line of lines) {
    const where = line.articleId
      ? { depotId, articleId: line.articleId }
      : { depotId, variantId: line.variantId };

    const stock = await prisma.stockByDepot.findFirst({ where });

    const key = line.articleId
      ? `article_${line.articleId}`
      : `variant_${line.variantId}`;

    stockMap.set(key, stock || null);
  }

  return stockMap;
};

/* ============================================================
   HELPER: Resolve prixAchat for a line (article or variant's article)
============================================================ */
const resolveLinePrixAchat = async (tx, articleId, variantId) => {
  if (articleId) {
    const article = await tx.article.findUnique({
      where: { id: articleId },
      select: { prixAchat: true },
    });
    return article ? parseFloat(article.prixAchat) : 0;
  }
  if (variantId) {
    const variant = await tx.articleVariant.findUnique({
      where: { id: variantId },
      include: { article: { select: { prixAchat: true } } },
    });
    return variant?.article ? parseFloat(variant.article.prixAchat) : 0;
  }
  return 0;
};

/* ============================================================
   CREATE INVENTORY (ATOMIC WITH ALL BUSINESS RULES)
============================================================ */
export const create = async (data, user) => {
  const { depotId, inventoryDate, notes, lines } = data;

  // 1. Validate operating hours
  await timeRange.validateSystemHours(new Date(), "inventory");

  // 2. Validate depot access
  const depot = await validateDepotAccess(depotId, user);

  // 3. Validate lines (includes visibility check)
  await validateInventoryLines(lines);

  // 4. Categorize by stock management
  const { stockManaged, nonStockManaged } =
    await categorizeByStockManagement(lines);

  // 5. Fetch current stock (for variance calculation)
  const stockMap = await fetchCurrentStock(depotId, lines);

  const inventoryNumber = await generateInventoryNumber(depot.societeId);

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // Step 1: Create Inventory header
        const inventory = await tx.inventory.create({
          data: {
            societeId: depot.societeId,
            depotId,
            inventoryNumber,
            inventoryDate: inventoryDate ? new Date(inventoryDate) : new Date(),
            notes,
            createdBy: user.id,
            validatedBy: user.id,
            validatedAt: new Date(),
          },
        });

        // Step 2: Prepare lines using SCHEMA field names
        const linesData = [];
        const adjustments = [];
        let totalGap = 0;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const key = line.articleId
            ? `article_${line.articleId}`
            : `variant_${line.variantId}`;

          const currentStock = stockMap.get(key);

          // ✅ Use schema field names: quantityTheoretical, quantityCounted, quantityDifference
          const quantityTheoretical = currentStock
            ? parseFloat(currentStock.quantityAvailable)
            : 0;
          const quantityCounted = parseFloat(line.quantityCounted);
          const quantityDifference = quantityCounted - quantityTheoretical;

          // Accumulate gap: quantityDifference × prixAchat
          const prixAchat = await resolveLinePrixAchat(
            tx,
            line.articleId,
            line.variantId,
          );
          totalGap += quantityDifference * prixAchat;

          linesData.push({
            inventoryId: inventory.id,
            articleId: line.articleId || null,
            variantId: line.variantId || null,
            lineNumber: i + 1,
            quantityTheoretical, // ✅ schema field
            quantityCounted, // ✅ schema field
            quantityDifference, // ✅ schema field
          });

          // Only adjust stock-managed items with a difference
          const isStockManaged = stockManaged.some(
            (sm) =>
              (sm.articleId && sm.articleId === line.articleId) ||
              (sm.variantId && sm.variantId === line.variantId),
          );

          if (isStockManaged && quantityDifference !== 0) {
            adjustments.push({
              articleId: line.articleId,
              variantId: line.variantId,
              quantityDifference,
              inventoryId: inventory.id,
              unitCost: prixAchat,
            });
          }
        }

        // Step 3: Create all inventory lines then persist the computed gap
        await tx.inventoryLine.createMany({ data: linesData });
        await tx.inventory.update({
          where: { id: inventory.id },
          data: { gap: parseFloat(totalGap.toFixed(2)) },
        });

        // Step 4: Process stock adjustments (stock-managed with difference only)
        const transactionsCreated = [];

        for (const adjustment of adjustments) {
          const results = await stockManagement.batchStockOperationsWithTx(tx, [
            {
              depotId,
              articleId: adjustment.articleId,
              variantId: adjustment.variantId,
              quantityChange: adjustment.quantityDifference,
              transactionType: "ADJUSTMENT",
              referenceId: inventoryNumber,
              reason:
                adjustment.quantityDifference > 0
                  ? `Inventory surplus: ${Math.abs(adjustment.quantityDifference)} units found`
                  : `Inventory shortage: ${Math.abs(adjustment.quantityDifference)} units missing`,
              userId: user.id,
              inventoryId: adjustment.inventoryId,
              unitCost:
                adjustment.quantityDifference > 0 ? adjustment.unitCost : null,
            },
          ]);

          if (results[0].stockUpdated) {
            transactionsCreated.push(results[0].transaction);
          }
        }

        // Step 5: Fetch complete inventory
        const completeInventory = await tx.inventory.findUnique({
          where: { id: inventory.id },
          include: {
            depot: {
              select: {
                id: true,
                code: true,
                name: true,
                societe: { select: { id: true, raisonSocial: true } },
              },
            },
            lines: {
              include: {
                article: {
                  select: {
                    id: true,
                    barcode: true,
                    name: true,
                    gereEnStock: true,
                    unitePrincipale: {
                      select: { id: true, name: true, symbol: true },
                    },
                  },
                },
                variant: {
                  select: {
                    id: true,
                    barcode: true,
                    name: true,
                    article: {
                      select: { id: true, name: true, gereEnStock: true },
                    },
                  },
                },
              },
              orderBy: { lineNumber: "asc" },
            },
            transactions: {
              include: {
                article: { select: { id: true, name: true } },
                variant: { select: { id: true, name: true } },
              },
              orderBy: { createdAt: "asc" },
            },
            createdByUser: { select: { id: true, name: true, email: true } },
            validatedByUser: { select: { id: true, name: true, email: true } },
          },
        });

        return {
          inventory: completeInventory,
          adjustmentsCount: adjustments.length,
          transactionsCreated: transactionsCreated.length,
        };
      },
      { timeout: 30000 },
    );

    const linesWithDifference = result.inventory.lines.filter(
      (l) => parseFloat(l.quantityDifference) !== 0,
    );
    const surplus = linesWithDifference.filter(
      (l) => parseFloat(l.quantityDifference) > 0,
    ).length;
    const shortage = linesWithDifference.filter(
      (l) => parseFloat(l.quantityDifference) < 0,
    ).length;
    const exact = result.inventory.lines.filter(
      (l) => parseFloat(l.quantityDifference) === 0,
    ).length;

    return {
      ...result.inventory,
      summary: {
        totalLines: result.inventory.lines.length,
        stockManagedLines: stockManaged.length,
        nonStockManagedLines: nonStockManaged.length,
        linesWithVariance: linesWithDifference.length,
        totalAdjustments: result.adjustmentsCount,
        transactionsCreated: result.transactionsCreated,
        variance: { surplus, shortage, exact },
      },
    };
  } catch (error) {
    if (error.code === "P2002")
      throw new ApiError("Duplicate inventory number.", 409);
    if (error.code === "P2003")
      throw new ApiError(
        "Invalid reference: Article, Variant, or Depot not found.",
        400,
      );
    if (error instanceof ApiError) throw error;
    throw new ApiError(`Inventory creation failed: ${error.message}`, 500);
  }
};

/* ============================================================
   GET ALL INVENTORIES
============================================================ */
export const getAll = async (query, user) => {
  const where = {};

  if (user.isSuperAdmin) {
    if (query.societeId) {
      where.societeId = parseInt(query.societeId);
      delete query.societeId;
    }
  } else {
    where.societeId = user.societeId;
    delete query.societeId;
  }

  if (query.depotId) {
    where.depotId = parseInt(query.depotId);
    delete query.depotId;
  }

  if (query.startDate) {
    where.inventoryDate = {
      ...where.inventoryDate,
      gte: new Date(query.startDate),
    };
    delete query.startDate;
  }
  if (query.endDate) {
    where.inventoryDate = {
      ...where.inventoryDate,
      lte: new Date(query.endDate),
    };
    delete query.endDate;
  }

  const apiFeatures = new ApiFeatures(query).sort();
  const { orderBy } = apiFeatures.build();

  // Fetch all matching records with the requested orderBy so the relative
  // ordering within each group (init / regular) is already correct.
  const all = await prisma.inventory.findMany({
    where,
    orderBy: orderBy || { inventoryDate: "desc" },
    include: {
      depot: {
        select: {
          id: true,
          code: true,
          name: true,
          societe: { select: { id: true, raisonSocial: true } },
        },
      },
      createdByUser: { select: { id: true, name: true } },
      validatedByUser: { select: { id: true, name: true } },
      _count: { select: { lines: true, transactions: true } },
    },
  });

  // INIT-INV-* inventories always come first; the rest keep their orderBy order.
  const sorted = [
    ...all.filter((inv) => inv.inventoryNumber.startsWith("INIT-INV-")),
    ...all.filter((inv) => !inv.inventoryNumber.startsWith("INIT-INV-")),
  ];

  // JS pagination over the re-sorted list
  const total = sorted.length;
  apiFeatures.paginate(total);
  const { skip, take } = apiFeatures.build();
  const page = sorted.slice(skip, skip + take);

  const fmt = (d) =>
    d
      ? new Date(d).toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : null;

  const data = page.map((inv) => ({
    ...inv,
    inventoryDate: fmt(inv.inventoryDate),
    validatedAt: fmt(inv.validatedAt),
    createdAt: fmt(inv.createdAt),
    updatedAt: fmt(inv.updatedAt),
  }));

  return {
    results: data.length,
    pagination: apiFeatures.paginationResult,
    data,
  };
};

/* ============================================================
   GET INVENTORY BY ID
============================================================ */
export const getById = async (id, user) => {
  const inventory = await prisma.inventory.findUnique({
    where: { id },
    include: {
      depot: {
        select: {
          id: true,
          code: true,
          name: true,
          societeId: true,
          societe: { select: { id: true, raisonSocial: true } },
        },
      },
      lines: {
        include: {
          article: {
            select: {
              id: true,
              barcode: true,
              name: true,
              prixAchat: true,
              visible: true,
              gereEnStock: true,
              unitePrincipale: {
                select: { id: true, name: true, symbol: true },
              },
            },
          },
          variant: {
            select: {
              id: true,
              barcode: true,
              name: true,
              article: {
                select: {
                  id: true,
                  name: true,
                  visible: true,
                  prixAchat: true,
                  gereEnStock: true,
                },
              },
            },
          },
        },
        orderBy: { lineNumber: "asc" },
      },
      transactions: {
        include: {
          depot: { select: { id: true, code: true, name: true } },
          article: { select: { id: true, name: true } },
          variant: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      createdByUser: { select: { id: true, name: true, email: true } },
      validatedByUser: { select: { id: true, name: true, email: true } },
    },
  });

  if (!inventory) throw new ApiError("Inventory not found", 404);

  if (!user.isSuperAdmin && inventory.depot.societeId !== user.societeId) {
    throw new ApiError(
      "Access denied. This inventory belongs to another société.",
      403,
    );
  }

  const linesWithDifference = inventory.lines.filter(
    (l) => parseFloat(l.quantityDifference) !== 0,
  );

  const summary = {
    totalLines: inventory.lines.length,
    linesWithVariance: linesWithDifference.length,
    totalAdjustments: inventory.transactions.length,
    variance: {
      surplus: linesWithDifference.filter(
        (l) => parseFloat(l.quantityDifference) > 0,
      ).length,
      shortage: linesWithDifference.filter(
        (l) => parseFloat(l.quantityDifference) < 0,
      ).length,
      exact: inventory.lines.filter(
        (l) => parseFloat(l.quantityDifference) === 0,
      ).length,
    },
  };

  return { ...inventory, summary };
};

/* ============================================================
   GET INVENTORIES BY DEPOT
============================================================ */
export const getByDepot = async (depotId, user, query = {}) => {
  const depot = await validateDepotAccess(depotId, user);

  const where = { depotId };

  if (query.startDate) {
    where.inventoryDate = {
      ...where.inventoryDate,
      gte: new Date(query.startDate),
    };
  }
  if (query.endDate) {
    where.inventoryDate = {
      ...where.inventoryDate,
      lte: new Date(query.endDate),
    };
  }

  const inventories = await prisma.inventory.findMany({
    where,
    orderBy: { inventoryDate: "desc" },
    include: {
      depot: {
        select: {
          id: true,
          code: true,
          name: true,
          societe: { select: { id: true, raisonSocial: true } },
        },
      },
      createdByUser: { select: { id: true, name: true } },
      validatedByUser: { select: { id: true, name: true } },
      _count: { select: { lines: true, transactions: true } },
    },
  });

  return {
    depot: { id: depot.id, code: depot.code, name: depot.name },
    results: inventories.length,
    data: inventories,
  };
};

/* ============================================================
   APPEND INVENTORY LINES (ATOMIC WITH ALL BUSINESS RULES)
============================================================ */
export const appendLines = async (inventoryId, data, user) => {
  const { lines } = data;

  // 1. Validate operating hours
  await timeRange.validateSystemHours(new Date(), "append inventory lines");

  // 2. Validate lines (includes visibility check)
  await validateInventoryLines(lines);

  // 3. Fetch existing inventory
  const inventory = await prisma.inventory.findUnique({
    where: { id: inventoryId },
    include: {
      depot: {
        select: {
          id: true,
          societeId: true,
          name: true,
          code: true,
          active: true,
        },
      },
      lines: {
        select: {
          id: true,
          articleId: true,
          variantId: true,
          lineNumber: true,
        },
      },
    },
  });

  if (!inventory) throw new ApiError("Inventory not found", 404);

  if (!user.isSuperAdmin && inventory.depot.societeId !== user.societeId) {
    throw new ApiError(
      "Access denied. This inventory belongs to another société.",
      403,
    );
  }

  if (!inventory.depot.active) {
    throw new ApiError(`Depot "${inventory.depot.name}" is inactive.`, 400);
  }

  // Check for duplicates with existing lines
  const existingProducts = new Set();
  inventory.lines.forEach((line) => {
    if (line.articleId) existingProducts.add(`article_${line.articleId}`);
    if (line.variantId) existingProducts.add(`variant_${line.variantId}`);
  });

  lines.forEach((line, index) => {
    const key = line.articleId
      ? `article_${line.articleId}`
      : `variant_${line.variantId}`;
    if (existingProducts.has(key)) {
      throw new ApiError(
        `Line ${index + 1}: Product already exists in this inventory.`,
        400,
      );
    }
  });

  // 4. Categorize by stock management
  const { stockManaged, nonStockManaged } =
    await categorizeByStockManagement(lines);

  // 5. Fetch current stock
  const stockMap = await fetchCurrentStock(inventory.depot.id, lines);

  const maxLineNumber =
    inventory.lines.length > 0
      ? Math.max(...inventory.lines.map((l) => l.lineNumber))
      : 0;

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const linesData = [];
        const adjustments = [];
        let newLinesGap = 0;

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const key = line.articleId
            ? `article_${line.articleId}`
            : `variant_${line.variantId}`;

          const currentStock = stockMap.get(key);

          // ✅ Use schema field names
          const quantityTheoretical = currentStock
            ? parseFloat(currentStock.quantityAvailable)
            : 0;
          const quantityCounted = parseFloat(line.quantityCounted);
          const quantityDifference = quantityCounted - quantityTheoretical;

          // Accumulate gap contribution from each new line
          const prixAchat = await resolveLinePrixAchat(
            tx,
            line.articleId,
            line.variantId,
          );
          newLinesGap += quantityDifference * prixAchat;

          linesData.push({
            inventoryId: inventory.id,
            articleId: line.articleId || null,
            variantId: line.variantId || null,
            lineNumber: maxLineNumber + i + 1,
            quantityTheoretical, // ✅ schema field
            quantityCounted, // ✅ schema field
            quantityDifference, // ✅ schema field
          });

          const isStockManaged = stockManaged.some(
            (sm) =>
              (sm.articleId && sm.articleId === line.articleId) ||
              (sm.variantId && sm.variantId === line.variantId),
          );

          if (isStockManaged && quantityDifference !== 0) {
            adjustments.push({
              articleId: line.articleId,
              variantId: line.variantId,
              quantityDifference,
              unitCost: prixAchat,
            });
          }
        }

        // Create inventory lines
        await tx.inventoryLine.createMany({ data: linesData });

        // Process adjustments
        const transactionsCreated = [];

        for (const adjustment of adjustments) {
          const results = await stockManagement.batchStockOperationsWithTx(tx, [
            {
              depotId: inventory.depot.id,
              articleId: adjustment.articleId,
              variantId: adjustment.variantId,
              quantityChange: adjustment.quantityDifference,
              transactionType: "ADJUSTMENT",
              referenceId: inventory.inventoryNumber,
              reason:
                adjustment.quantityDifference > 0
                  ? `Inventory surplus: ${Math.abs(adjustment.quantityDifference)} units found (appended)`
                  : `Inventory shortage: ${Math.abs(adjustment.quantityDifference)} units missing (appended)`,
              userId: user.id,
              inventoryId: inventory.id,
              unitCost:
                adjustment.quantityDifference > 0 ? adjustment.unitCost : null,
            },
          ]);

          if (results[0].stockUpdated) {
            transactionsCreated.push(results[0].transaction);
          }
        }

        // Increment gap with the new lines' contribution
        await tx.inventory.update({
          where: { id: inventoryId },
          data: { gap: { increment: parseFloat(newLinesGap.toFixed(2)) } },
        });

        const updatedInventory = await tx.inventory.findUnique({
          where: { id: inventoryId },
          include: {
            depot: {
              select: {
                id: true,
                code: true,
                name: true,
                societe: { select: { id: true, raisonSocial: true } },
              },
            },
            lines: {
              include: {
                article: {
                  select: {
                    id: true,
                    barcode: true,
                    name: true,
                    gereEnStock: true,
                    unitePrincipale: {
                      select: { id: true, name: true, symbol: true },
                    },
                  },
                },
                variant: {
                  select: {
                    id: true,
                    barcode: true,
                    name: true,
                    article: {
                      select: { id: true, name: true, gereEnStock: true },
                    },
                  },
                },
              },
              orderBy: { lineNumber: "asc" },
            },
            transactions: {
              include: {
                depot: { select: { id: true, code: true, name: true } },
                article: { select: { id: true, name: true } },
                variant: { select: { id: true, name: true } },
              },
              orderBy: { createdAt: "desc" },
            },
            createdByUser: { select: { id: true, name: true, email: true } },
            validatedByUser: { select: { id: true, name: true, email: true } },
          },
        });

        return {
          inventory: updatedInventory,
          linesAdded: linesData.length,
          adjustmentsCreated: adjustments.length,
          transactionsCreated: transactionsCreated.length,
        };
      },
      { timeout: 30000 },
    );

    const linesWithDifference = result.inventory.lines.filter(
      (l) => parseFloat(l.quantityDifference) !== 0,
    );

    return {
      ...result.inventory,
      summary: {
        totalLines: result.inventory.lines.length,
        stockManagedLines: stockManaged.length,
        nonStockManagedLines: nonStockManaged.length,
        linesWithVariance: linesWithDifference.length,
        transactionsCreated: result.inventory.transactions.length,
        variance: {
          surplus: linesWithDifference.filter(
            (l) => parseFloat(l.quantityDifference) > 0,
          ).length,
          shortage: linesWithDifference.filter(
            (l) => parseFloat(l.quantityDifference) < 0,
          ).length,
          exact: result.inventory.lines.filter(
            (l) => parseFloat(l.quantityDifference) === 0,
          ).length,
        },
      },
      appendInfo: {
        linesAdded: result.linesAdded,
        adjustmentsCreated: result.adjustmentsCreated,
        transactionsCreated: result.transactionsCreated,
      },
    };
  } catch (error) {
    if (error.code === "P2002")
      throw new ApiError("Duplicate constraint violation.", 409);
    if (error.code === "P2003") throw new ApiError("Invalid reference.", 400);
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      `Failed to append inventory lines: ${error.message}`,
      500,
    );
  }
};

/* ============================================================
   DELETE INVENTORY (ATOMIC ROLLBACK)
============================================================ */
export const remove = async (id, user) => {
  await timeRange.validateSystemHours(new Date(), "delete inventory");

  const inventory = await prisma.inventory.findUnique({
    where: { id },
    include: {
      depot: { select: { id: true, societeId: true, name: true } },
      lines: {
        include: {
          article: { select: { id: true, gereEnStock: true } },
          variant: {
            select: { id: true, article: { select: { gereEnStock: true } } },
          },
        },
      },
      transactions: true,
    },
  });

  if (!inventory) throw new ApiError("Inventory not found", 404);

  if (!user.isSuperAdmin && inventory.depot.societeId !== user.societeId) {
    throw new ApiError(
      "Access denied. This inventory belongs to another société.",
      403,
    );
  }

  // Only revert stock-managed lines that had a difference
  const stockManagedLines = inventory.lines.filter((line) => {
    if (line.articleId && line.article)
      return line.article.gereEnStock === true;
    if (line.variantId && line.variant)
      return line.variant.article.gereEnStock === true;
    return false;
  });

  const adjustmentsToRevert = stockManagedLines.filter(
    (line) => parseFloat(line.quantityDifference) !== 0,
  );

  try {
    await prisma.$transaction(
      async (tx) => {
        // Revert stock: set quantityAvailable back to quantityTheoretical
        for (const line of adjustmentsToRevert) {
          const where = line.articleId
            ? { depotId: inventory.depotId, articleId: line.articleId }
            : { depotId: inventory.depotId, variantId: line.variantId };

          const stock = await tx.stockByDepot.findFirst({ where });

          if (stock) {
            await tx.stockByDepot.update({
              where: { id: stock.id },
              data: {
                // Reverse the adjustment: subtract the difference that was applied
                quantityAvailable:
                  parseFloat(stock.quantityAvailable) -
                  parseFloat(line.quantityDifference),
              },
            });
          }
        }

        // Delete linked transactions
        await tx.stockTransaction.deleteMany({ where: { inventoryId: id } });

        // Delete inventory (cascades to lines)
        await tx.inventory.delete({ where: { id } });
      },
      { timeout: 30000 },
    );

    return {
      message:
        `Inventory deleted successfully. ` +
        `${adjustmentsToRevert.length} stock adjustment(s) reverted.`,
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(`Failed to delete inventory: ${error.message}`, 500);
  }
};

/* ============================================================
   GET VARIANCE REPORT
============================================================ */
export const getVarianceReport = async (id, user) => {
  const inventory = await getById(id, user);

  const surplusLines = inventory.lines.filter(
    (l) => parseFloat(l.quantityDifference) > 0,
  );
  const shortageLines = inventory.lines.filter(
    (l) => parseFloat(l.quantityDifference) < 0,
  );
  const exactLines = inventory.lines.filter(
    (l) => parseFloat(l.quantityDifference) === 0,
  );

  const totalSurplus = surplusLines.reduce(
    (sum, l) => sum + parseFloat(l.quantityDifference),
    0,
  );
  const totalShortage = Math.abs(
    shortageLines.reduce((sum, l) => sum + parseFloat(l.quantityDifference), 0),
  );

  return {
    inventory: {
      id: inventory.id,
      inventoryNumber: inventory.inventoryNumber,
      inventoryDate: inventory.inventoryDate,
      depot: inventory.depot,
    },
    summary: {
      totalLines: inventory.lines.length,
      totalSurplus: surplusLines.length,
      totalShortage: shortageLines.length,
      totalExact: exactLines.length,
      surplusQuantity: totalSurplus,
      shortageQuantity: totalShortage,
    },
    variances: {
      surplus: surplusLines,
      shortage: shortageLines,
      exact: exactLines,
    },
  };
};

export default {
  create,
  getAll,
  getById,
  getByDepot,
  appendLines,
  remove,
  getVarianceReport,
};
