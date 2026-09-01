import prisma from "../../loaders/prisma.js";
import ApiError from "../utils/apiError.js";
import ApiFeatures from "../utils/apiFeatures.js";

// Import Domain Services
import stockValidation from "./domain/stockValidationService.js";
import stockManagement from "./domain/stockManagementService.js";
import productVisibility from "../utils/productVisibilityUtility.js";
import timeRange from "../utils/timeRangeUtility.js";

/* ============================================================
   STOCK TRANSFER SERVICE - INTEGRATED WITH BUSINESS RULES
============================================================ */

/* ============================================================
   HELPER: Generate Transfer Number
============================================================ */
const generateTransferNumber = async (societeId) => {
  const year = new Date().getFullYear();
  const prefix = `TRF-${year}`;

  const lastTransfer = await prisma.stockTransfer.findFirst({
    where: {
      societeId,
      transferNumber: { startsWith: prefix },
    },
    orderBy: { transferNumber: "desc" },
    select: { transferNumber: true },
  });

  let nextNumber = 1;
  if (lastTransfer) {
    const lastNum = parseInt(lastTransfer.transferNumber.split("-")[2]);
    nextNumber = lastNum + 1;
  }

  return `${prefix}-${String(nextNumber).padStart(4, "0")}`;
};

/* ============================================================
   HELPER: Validate Depot Pair
============================================================ */
const validateDepotPair = async (sourceDepotId, destinationDepotId, user) => {
  if (sourceDepotId === destinationDepotId) {
    throw new ApiError("Source and destination depots cannot be the same", 400);
  }

  const [sourceDepot, destinationDepot] = await Promise.all([
    prisma.depot.findUnique({
      where: { id: sourceDepotId },
      select: {
        id: true,
        societeId: true,
        active: true,
        name: true,
        code: true,
      },
    }),
    prisma.depot.findUnique({
      where: { id: destinationDepotId },
      select: {
        id: true,
        societeId: true,
        active: true,
        name: true,
        code: true,
      },
    }),
  ]);

  if (!sourceDepot) throw new ApiError("Source depot not found", 404);
  if (!destinationDepot) throw new ApiError("Destination depot not found", 404);
  if (!sourceDepot.active)
    throw new ApiError(`Source depot "${sourceDepot.name}" is inactive`, 400);
  if (!destinationDepot.active)
    throw new ApiError(
      `Destination depot "${destinationDepot.name}" is inactive`,
      400,
    );

  if (!user.isSuperAdmin) {
    if (sourceDepot.societeId !== user.societeId) {
      throw new ApiError(
        "Access denied. Source depot belongs to another société.",
        403,
      );
    }
    if (destinationDepot.societeId !== user.societeId) {
      throw new ApiError(
        "Access denied. Destination depot belongs to another société.",
        403,
      );
    }
    if (sourceDepot.societeId !== destinationDepot.societeId) {
      throw new ApiError(
        "Regular users can only transfer between depots of the same société",
        403,
      );
    }
  }

  return { sourceDepot, destinationDepot };
};

/* ============================================================
   HELPER: Validate Transfer Lines
============================================================ */
const validateTransferLines = async (lines) => {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new ApiError("At least one transfer line is required", 400);
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

    if (line.quantityReceived === undefined || line.quantityReceived === null) {
      throw new ApiError(
        `Line ${index + 1}: quantityReceived is required`,
        400,
      );
    }

    const quantity = parseFloat(line.quantityReceived);
    if (isNaN(quantity) || quantity <= 0) {
      throw new ApiError(
        `Line ${index + 1}: quantityReceived must be greater than 0`,
        400,
      );
    }
  });

  await productVisibility.validateBatchProductVisibility(
    lines.map((line) => ({
      articleId: line.articleId,
      variantId: line.variantId,
    })),
    "stock transfer",
  );
};

/* ============================================================
   HELPER: Categorize Lines by Stock Management
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
   CREATE STOCK TRANSFER
============================================================ */
export const create = async (data, user) => {
  const {
    sourceDepotId,
    destinationDepotId,
    status = "PENDING",
    transferDate,
    notes,
    lines,
  } = data;

  await timeRange.validateSystemHours(new Date(), "stock transfer");

  if (!["PENDING", "COMPLETED"].includes(status)) {
    throw new ApiError(
      'Invalid status. Must be either "PENDING" or "COMPLETED"',
      400,
    );
  }

  const { sourceDepot, destinationDepot } = await validateDepotPair(
    sourceDepotId,
    destinationDepotId,
    user,
  );

  await validateTransferLines(lines);

  const { stockManaged, nonStockManaged } =
    await categorizeByStockManagement(lines);

  if (stockManaged.length > 0) {
    await stockValidation.validateBatchStockAvailability(
      stockManaged.map((line) => ({
        depotId: sourceDepotId,
        articleId: line.articleId,
        variantId: line.variantId,
        quantity: parseFloat(line.quantityReceived),
      })),
      "stock transfer",
    );
  }

  const transferNumber = await generateTransferNumber(sourceDepot.societeId);

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // Step 1: Create StockTransfer
        const transfer = await tx.stockTransfer.create({
          data: {
            societeId: sourceDepot.societeId,
            transferNumber,
            sourceDepotId,
            destinationDepotId,
            transferDate: transferDate ? new Date(transferDate) : new Date(),
            status,
            notes,
            createdBy: user.id,
            ...(status === "COMPLETED" && {
              validatedBy: user.id,
              validatedAt: new Date(),
            }),
          },
        });

        // Step 2: Create transfer lines
        const linesData = lines.map((line, index) => ({
          transferId: transfer.id,
          articleId: line.articleId || null,
          variantId: line.variantId || null,
          lineNumber: index + 1,
          quantityReceived: parseFloat(line.quantityReceived),
        }));

        await tx.stockTransferLine.createMany({ data: linesData });

        // Step 3: Process stock-managed items
        const transactionsCreated = [];

        if (stockManaged.length > 0) {
          const stockManagedData = linesData.filter((lineData) =>
            stockManaged.some(
              (sm) =>
                (sm.articleId && sm.articleId === lineData.articleId) ||
                (sm.variantId && sm.variantId === lineData.variantId),
            ),
          );

          if (status === "PENDING") {
            // PENDING: Update quantityInTransit only
            for (const lineData of stockManagedData) {
              const where = lineData.articleId
                ? { depotId: sourceDepotId, articleId: lineData.articleId }
                : { depotId: sourceDepotId, variantId: lineData.variantId };

              const sourceStock = await tx.stockByDepot.findFirst({ where });

              if (sourceStock) {
                await tx.stockByDepot.update({
                  where: { id: sourceStock.id },
                  data: {
                    quantityInTransit:
                      parseFloat(sourceStock.quantityInTransit) +
                      lineData.quantityReceived,
                  },
                });
              } else {
                await tx.stockByDepot.create({
                  data: {
                    depotId: sourceDepotId,
                    articleId: lineData.articleId,
                    variantId: lineData.variantId,
                    quantityAvailable: 0,
                    quantityInTransit: lineData.quantityReceived,
                  },
                });
              }
            }
          } else {
            // COMPLETED: Move stock immediately
            // ✅ Use batchStockOperationsWithTx to reuse the existing tx (avoids nesting + timeout)
            for (const lineData of stockManagedData) {
              const quantity = lineData.quantityReceived;

              const transactionResults =
                await stockManagement.batchStockOperationsWithTx(tx, [
                  {
                    depotId: sourceDepotId,
                    articleId: lineData.articleId,
                    variantId: lineData.variantId,
                    quantityChange: -quantity,
                    transactionType: "TRANSFER_OUT",
                    referenceId: transferNumber,
                    reason: `Transfer to ${destinationDepot.name} (${destinationDepot.code})`,
                    userId: user.id,
                    transferId: transfer.id,
                  },
                  {
                    depotId: destinationDepotId,
                    articleId: lineData.articleId,
                    variantId: lineData.variantId,
                    quantityChange: quantity,
                    transactionType: "TRANSFER_IN",
                    referenceId: transferNumber,
                    reason: `Transfer from ${sourceDepot.name} (${sourceDepot.code})`,
                    userId: user.id,
                    transferId: transfer.id,
                  },
                ]);

              transactionsCreated.push(
                ...transactionResults.filter((r) => r.stockUpdated),
              );
            }
          }
        }

        // Step 4: Fetch complete transfer
        const completeTransfer = await tx.stockTransfer.findUnique({
          where: { id: transfer.id },
          include: {
            sourceDepot: {
              select: {
                id: true,
                code: true,
                name: true,
                societe: { select: { id: true, raisonSocial: true } },
              },
            },
            destinationDepot: {
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

        return completeTransfer;
      },
      { timeout: 30000 },
    );

    return {
      ...result,
      summary: {
        totalLines: result.lines.length,
        stockManagedLines: stockManaged.length,
        nonStockManagedLines: nonStockManaged.length,
        totalQuantity: result.lines.reduce(
          (sum, l) => sum + parseFloat(l.quantityReceived),
          0,
        ),
        transactionsCreated: result.transactions.length,
        stockMovementApplied: status === "COMPLETED" && stockManaged.length > 0,
      },
    };
  } catch (error) {
    console.error("Stock transfer creation failed:", error);
    if (error.code === "P2002")
      throw new ApiError("Duplicate transfer number.", 409);
    if (error.code === "P2003")
      throw new ApiError(
        "Invalid reference: Article, Variant, or Depot not found.",
        400,
      );
    if (error instanceof ApiError) throw error;
    throw new ApiError(`Transfer creation failed: ${error.message}`, 500);
  }
};

/* ============================================================
   GET ALL TRANSFERS
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

  if (query.sourceDepotId) {
    where.sourceDepotId = parseInt(query.sourceDepotId);
    delete query.sourceDepotId;
  }
  if (query.destinationDepotId) {
    where.destinationDepotId = parseInt(query.destinationDepotId);
    delete query.destinationDepotId;
  }
  if (query.status) {
    where.status = query.status;
    delete query.status;
  }
  if (query.startDate) {
    where.transferDate = {
      ...where.transferDate,
      gte: new Date(query.startDate),
    };
    delete query.startDate;
  }
  if (query.endDate) {
    where.transferDate = {
      ...where.transferDate,
      lte: new Date(query.endDate),
    };
    delete query.endDate;
  }

  const count = await prisma.stockTransfer.count({ where });
  const apiFeatures = new ApiFeatures(query).sort().paginate(count);
  const { orderBy, skip, take } = apiFeatures.build();

  const transfers = await prisma.stockTransfer.findMany({
    where,
    orderBy: orderBy || { transferDate: "desc" },
    skip,
    take,
    include: {
      sourceDepot: {
        select: {
          id: true,
          code: true,
          name: true,
          societe: { select: { id: true, raisonSocial: true } },
        },
      },
      destinationDepot: {
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
    results: transfers.length,
    pagination: apiFeatures.paginationResult,
    data: transfers,
  };
};

/* ============================================================
   GET TRANSFER BY ID
============================================================ */
export const getById = async (id, user) => {
  const transfer = await prisma.stockTransfer.findUnique({
    where: { id },
    include: {
      sourceDepot: {
        select: {
          id: true,
          code: true,
          name: true,
          societeId: true,
          societe: { select: { id: true, raisonSocial: true } },
        },
      },
      destinationDepot: {
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
              prixAchat: true,
              name: true,
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
                  prixAchat: true,
                  visible: true,
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

  if (!transfer) throw new ApiError("Transfer not found", 404);

  if (!user.isSuperAdmin && transfer.sourceDepot.societeId !== user.societeId) {
    throw new ApiError(
      "Access denied. This transfer belongs to another société.",
      403,
    );
  }

  return {
    ...transfer,
    summary: {
      totalLines: transfer.lines.length,
      totalQuantity: transfer.lines.reduce(
        (sum, l) => sum + parseFloat(l.quantityReceived),
        0,
      ),
      transactionsCreated: transfer.transactions.length,
      stockMovementApplied: transfer.status === "COMPLETED",
    },
  };
};

/* ============================================================
   GET TRANSFERS BY DEPOT
============================================================ */
export const getByDepot = async (depotId, user, query = {}) => {
  const depot = await prisma.depot.findUnique({
    where: { id: depotId },
    select: { id: true, code: true, name: true, societeId: true },
  });

  if (!depot) throw new ApiError("Depot not found", 404);

  if (!user.isSuperAdmin && depot.societeId !== user.societeId) {
    throw new ApiError(
      "Access denied. This depot belongs to another société.",
      403,
    );
  }

  const where = {
    OR: [{ sourceDepotId: depotId }, { destinationDepotId: depotId }],
  };

  if (query.status) where.status = query.status;
  if (query.startDate)
    where.transferDate = {
      ...where.transferDate,
      gte: new Date(query.startDate),
    };
  if (query.endDate)
    where.transferDate = {
      ...where.transferDate,
      lte: new Date(query.endDate),
    };

  const transfers = await prisma.stockTransfer.findMany({
    where,
    orderBy: { transferDate: "desc" },
    include: {
      sourceDepot: {
        select: {
          id: true,
          code: true,
          name: true,
          societe: { select: { id: true, raisonSocial: true } },
        },
      },
      destinationDepot: {
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
    results: transfers.length,
    data: transfers,
  };
};

/* ============================================================
   APPEND TRANSFER LINES
============================================================ */
export const appendLines = async (transferId, data, user) => {
  const { lines } = data;

  await timeRange.validateSystemHours(new Date(), "append transfer lines");
  await validateTransferLines(lines);

  const transfer = await prisma.stockTransfer.findUnique({
    where: { id: transferId },
    include: {
      sourceDepot: {
        select: {
          id: true,
          societeId: true,
          name: true,
          code: true,
          active: true,
        },
      },
      destinationDepot: {
        select: { id: true, name: true, code: true, active: true },
      },
      lines: {
        select: {
          id: true,
          articleId: true,
          variantId: true,
          lineNumber: true,
          quantityReceived: true,
        },
      },
    },
  });

  if (!transfer) throw new ApiError("Transfer not found", 404);

  if (!user.isSuperAdmin && transfer.sourceDepot.societeId !== user.societeId) {
    throw new ApiError(
      "Access denied. This transfer belongs to another société.",
      403,
    );
  }
  if (!transfer.sourceDepot.active) {
    throw new ApiError(
      `Source depot "${transfer.sourceDepot.name}" is inactive.`,
      400,
    );
  }
  if (!transfer.destinationDepot.active) {
    throw new ApiError(
      `Destination depot "${transfer.destinationDepot.name}" is inactive.`,
      400,
    );
  }

  // Check for duplicates with existing lines
  const existingProducts = new Set();
  transfer.lines.forEach((line) => {
    if (line.articleId) existingProducts.add(`article_${line.articleId}`);
    if (line.variantId) existingProducts.add(`variant_${line.variantId}`);
  });

  lines.forEach((line, index) => {
    const key = line.articleId
      ? `article_${line.articleId}`
      : `variant_${line.variantId}`;
    if (existingProducts.has(key)) {
      throw new ApiError(
        `Line ${index + 1}: Product already exists in this transfer.`,
        400,
      );
    }
  });

  const { stockManaged, nonStockManaged } =
    await categorizeByStockManagement(lines);

  if (stockManaged.length > 0) {
    await stockValidation.validateBatchStockAvailability(
      stockManaged.map((line) => ({
        depotId: transfer.sourceDepot.id,
        articleId: line.articleId,
        variantId: line.variantId,
        quantity: parseFloat(line.quantityReceived),
      })),
      "append transfer lines",
    );
  }

  const maxLineNumber =
    transfer.lines.length > 0
      ? Math.max(...transfer.lines.map((l) => l.lineNumber))
      : 0;

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const newLinesData = lines.map((line, index) => ({
          transferId,
          articleId: line.articleId || null,
          variantId: line.variantId || null,
          lineNumber: maxLineNumber + index + 1,
          quantityReceived: parseFloat(line.quantityReceived),
        }));

        await tx.stockTransferLine.createMany({ data: newLinesData });

        const transactionsCreated = [];

        if (stockManaged.length > 0) {
          const stockManagedData = newLinesData.filter((lineData) =>
            stockManaged.some(
              (sm) =>
                (sm.articleId && sm.articleId === lineData.articleId) ||
                (sm.variantId && sm.variantId === lineData.variantId),
            ),
          );

          if (transfer.status === "PENDING") {
            for (const lineData of stockManagedData) {
              const where = lineData.articleId
                ? {
                    depotId: transfer.sourceDepot.id,
                    articleId: lineData.articleId,
                  }
                : {
                    depotId: transfer.sourceDepot.id,
                    variantId: lineData.variantId,
                  };

              const sourceStock = await tx.stockByDepot.findFirst({ where });

              if (sourceStock) {
                await tx.stockByDepot.update({
                  where: { id: sourceStock.id },
                  data: {
                    quantityInTransit:
                      parseFloat(sourceStock.quantityInTransit) +
                      lineData.quantityReceived,
                  },
                });
              } else {
                await tx.stockByDepot.create({
                  data: {
                    depotId: transfer.sourceDepot.id,
                    articleId: lineData.articleId,
                    variantId: lineData.variantId,
                    quantityAvailable: 0,
                    quantityInTransit: lineData.quantityReceived,
                  },
                });
              }
            }
          } else {
            // ✅ Use batchStockOperationsWithTx — reuse existing tx, no nesting
            for (const lineData of stockManagedData) {
              const quantity = lineData.quantityReceived;

              const transactionResults =
                await stockManagement.batchStockOperationsWithTx(tx, [
                  {
                    depotId: transfer.sourceDepot.id,
                    articleId: lineData.articleId,
                    variantId: lineData.variantId,
                    quantityChange: -quantity,
                    transactionType: "TRANSFER_OUT",
                    referenceId: transfer.transferNumber,
                    reason: `Transfer to ${transfer.destinationDepot.name} (${transfer.destinationDepot.code}) - Appended`,
                    userId: user.id,
                    transferId: transferId,
                  },
                  {
                    depotId: transfer.destinationDepotId,
                    articleId: lineData.articleId,
                    variantId: lineData.variantId,
                    quantityChange: quantity,
                    transactionType: "TRANSFER_IN",
                    referenceId: transfer.transferNumber,
                    reason: `Transfer from ${transfer.sourceDepot.name} (${transfer.sourceDepot.code}) - Appended`,
                    userId: user.id,
                    transferId: transferId,
                  },
                ]);

              transactionsCreated.push(
                ...transactionResults.filter((r) => r.stockUpdated),
              );
            }
          }
        }

        await tx.stockTransfer.update({
          where: { id: transferId },
          data: { updatedAt: new Date() },
        });

        const updatedTransfer = await tx.stockTransfer.findUnique({
          where: { id: transferId },
          include: {
            sourceDepot: {
              select: {
                id: true,
                code: true,
                name: true,
                societe: { select: { id: true, raisonSocial: true } },
              },
            },
            destinationDepot: {
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
          transfer: updatedTransfer,
          linesAdded: newLinesData.length,
          transactionsCreated: transactionsCreated.length,
        };
      },
      { timeout: 30000 },
    );

    return {
      ...result.transfer,
      summary: {
        totalLines: result.transfer.lines.length,
        stockManagedLines: stockManaged.length,
        nonStockManagedLines: nonStockManaged.length,
        totalQuantity: result.transfer.lines.reduce(
          (sum, l) => sum + parseFloat(l.quantityReceived),
          0,
        ),
        transactionsCreated: result.transfer.transactions.length,
        stockMovementApplied:
          transfer.status === "COMPLETED" && stockManaged.length > 0,
      },
      appendInfo: {
        linesAdded: result.linesAdded,
        transactionsCreated: result.transactionsCreated,
      },
    };
  } catch (error) {
    console.error("Append transfer lines failed:", error);
    if (error.code === "P2002")
      throw new ApiError("Duplicate constraint violation.", 409);
    if (error.code === "P2003") throw new ApiError("Invalid reference.", 400);
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      `Failed to append transfer lines: ${error.message}`,
      500,
    );
  }
};

/* ============================================================
   VALIDATE/COMPLETE TRANSFER
============================================================ */
export const validateTransfer = async (transferId, user) => {
  await timeRange.validateSystemHours(new Date(), "validate transfer");

  const transfer = await prisma.stockTransfer.findUnique({
    where: { id: transferId },
    include: {
      sourceDepot: {
        select: {
          id: true,
          societeId: true,
          name: true,
          code: true,
          active: true,
        },
      },
      destinationDepot: {
        select: { id: true, name: true, code: true, active: true },
      },
      lines: {
        select: {
          id: true,
          articleId: true,
          variantId: true,
          lineNumber: true,
          quantityReceived: true,
        },
        orderBy: { lineNumber: "asc" },
      },
    },
  });

  if (!transfer) throw new ApiError("Transfer not found", 404);

  if (!user.isSuperAdmin && transfer.sourceDepot.societeId !== user.societeId) {
    throw new ApiError(
      "Access denied. This transfer belongs to another société.",
      403,
    );
  }
  if (transfer.status === "COMPLETED") {
    throw new ApiError(
      "Transfer is already completed and cannot be modified",
      400,
    );
  }
  if (!transfer.lines || transfer.lines.length === 0) {
    throw new ApiError("Cannot complete transfer with no lines.", 400);
  }
  if (!transfer.sourceDepot.active) {
    throw new ApiError(
      `Source depot "${transfer.sourceDepot.name}" is inactive.`,
      400,
    );
  }
  if (!transfer.destinationDepot.active) {
    throw new ApiError(
      `Destination depot "${transfer.destinationDepot.name}" is inactive.`,
      400,
    );
  }

  const { stockManaged, nonStockManaged } = await categorizeByStockManagement(
    transfer.lines,
  );

  if (stockManaged.length > 0) {
    await stockValidation.validateBatchStockAvailability(
      stockManaged.map((line) => ({
        depotId: transfer.sourceDepot.id,
        articleId: line.articleId,
        variantId: line.variantId,
        quantity: parseFloat(line.quantityReceived),
      })),
      "validate transfer",
    );
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const transactionsCreated = [];

        if (stockManaged.length > 0) {
          for (const line of stockManaged) {
            const quantity = parseFloat(line.quantityReceived);

            // ✅ Use batchStockOperationsWithTx — reuse existing tx, no nesting
            const transactionResults =
              await stockManagement.batchStockOperationsWithTx(tx, [
                {
                  depotId: transfer.sourceDepot.id,
                  articleId: line.articleId,
                  variantId: line.variantId,
                  quantityChange: -quantity,
                  transactionType: "TRANSFER_OUT",
                  referenceId: transfer.transferNumber,
                  reason: `Transfer to ${transfer.destinationDepot.name} (${transfer.destinationDepot.code})`,
                  userId: user.id,
                  transferId: transferId,
                },
                {
                  depotId: transfer.destinationDepotId,
                  articleId: line.articleId,
                  variantId: line.variantId,
                  quantityChange: quantity,
                  transactionType: "TRANSFER_IN",
                  referenceId: transfer.transferNumber,
                  reason: `Transfer from ${transfer.sourceDepot.name} (${transfer.sourceDepot.code})`,
                  userId: user.id,
                  transferId: transferId,
                },
              ]);

            transactionsCreated.push(
              ...transactionResults.filter((r) => r.stockUpdated),
            );

            // Reset quantityInTransit on source depot
            const where = line.articleId
              ? { depotId: transfer.sourceDepot.id, articleId: line.articleId }
              : { depotId: transfer.sourceDepot.id, variantId: line.variantId };

            const sourceStock = await tx.stockByDepot.findFirst({ where });
            if (sourceStock) {
              await tx.stockByDepot.update({
                where: { id: sourceStock.id },
                data: { quantityInTransit: 0 },
              });
            }
          }
        }

        await tx.stockTransfer.update({
          where: { id: transferId },
          data: {
            status: "COMPLETED",
            validatedBy: user.id,
            validatedAt: new Date(),
          },
        });

        const completedTransfer = await tx.stockTransfer.findUnique({
          where: { id: transferId },
          include: {
            sourceDepot: {
              select: {
                id: true,
                code: true,
                name: true,
                societe: { select: { id: true, raisonSocial: true } },
              },
            },
            destinationDepot: {
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
              orderBy: { createdAt: "asc" },
            },
            createdByUser: { select: { id: true, name: true, email: true } },
            validatedByUser: { select: { id: true, name: true, email: true } },
          },
        });

        return {
          transfer: completedTransfer,
          transactionsCreated: transactionsCreated.length,
        };
      },
      { timeout: 30000 },
    );

    return {
      ...result.transfer,
      summary: {
        totalLines: result.transfer.lines.length,
        stockManagedLines: stockManaged.length,
        nonStockManagedLines: nonStockManaged.length,
        totalQuantity: result.transfer.lines.reduce(
          (sum, l) => sum + parseFloat(l.quantityReceived),
          0,
        ),
        transactionsCreated: result.transfer.transactions.length,
        stockMovementApplied: true,
      },
    };
  } catch (error) {
    console.error("Transfer validation failed:", error);
    if (error instanceof ApiError) throw error;
    if (error.code === "P2002")
      throw new ApiError("Duplicate constraint violation.", 409);
    if (error.code === "P2003") throw new ApiError("Invalid reference.", 400);
    throw new ApiError(`Failed to validate transfer: ${error.message}`, 500);
  }
};

/* ============================================================
   DELETE TRANSFER
============================================================ */
export const remove = async (id, user) => {
  await timeRange.validateSystemHours(new Date(), "delete transfer");

  const transfer = await prisma.stockTransfer.findUnique({
    where: { id },
    include: {
      sourceDepot: { select: { id: true, societeId: true, name: true } },
      lines: true,
      transactions: true,
    },
  });

  if (!transfer) throw new ApiError("Transfer not found", 404);

  if (!user.isSuperAdmin && transfer.sourceDepot.societeId !== user.societeId) {
    throw new ApiError(
      "Access denied. This transfer belongs to another société.",
      403,
    );
  }

  const { stockManaged } = await categorizeByStockManagement(transfer.lines);

  try {
    await prisma.$transaction(
      async (tx) => {
        if (transfer.status === "COMPLETED" && stockManaged.length > 0) {
          for (const line of stockManaged) {
            const quantity = parseFloat(line.quantityReceived);

            const sourceWhere = line.articleId
              ? { depotId: transfer.sourceDepotId, articleId: line.articleId }
              : { depotId: transfer.sourceDepotId, variantId: line.variantId };

            const sourceStock = await tx.stockByDepot.findFirst({
              where: sourceWhere,
            });
            if (sourceStock) {
              await tx.stockByDepot.update({
                where: { id: sourceStock.id },
                data: {
                  quantityAvailable:
                    parseFloat(sourceStock.quantityAvailable) + quantity,
                },
              });
            }

            const destWhere = line.articleId
              ? {
                  depotId: transfer.destinationDepotId,
                  articleId: line.articleId,
                }
              : {
                  depotId: transfer.destinationDepotId,
                  variantId: line.variantId,
                };

            const destStock = await tx.stockByDepot.findFirst({
              where: destWhere,
            });
            if (destStock) {
              await tx.stockByDepot.update({
                where: { id: destStock.id },
                data: {
                  quantityAvailable:
                    parseFloat(destStock.quantityAvailable) - quantity,
                },
              });
            }
          }
        } else if (transfer.status === "PENDING" && stockManaged.length > 0) {
          for (const line of stockManaged) {
            const quantity = parseFloat(line.quantityReceived);

            const sourceWhere = line.articleId
              ? { depotId: transfer.sourceDepotId, articleId: line.articleId }
              : { depotId: transfer.sourceDepotId, variantId: line.variantId };

            const sourceStock = await tx.stockByDepot.findFirst({
              where: sourceWhere,
            });
            if (sourceStock) {
              await tx.stockByDepot.update({
                where: { id: sourceStock.id },
                data: {
                  quantityInTransit: Math.max(
                    0,
                    parseFloat(sourceStock.quantityInTransit) - quantity,
                  ),
                },
              });
            }
          }
        }

        await tx.stockTransaction.deleteMany({ where: { transferId: id } });
        await tx.stockTransfer.delete({ where: { id } });
      },
      { timeout: 30000 },
    );

    return {
      message:
        transfer.status === "COMPLETED"
          ? `Transfer deleted and stock reverted successfully (${stockManaged.length} stock-managed items)`
          : `Transfer deleted and quantityInTransit released successfully (${stockManaged.length} stock-managed items)`,
    };
  } catch (error) {
    console.error("Transfer deletion failed:", error);
    if (error instanceof ApiError) throw error;
    throw new ApiError(`Failed to delete transfer: ${error.message}`, 500);
  }
};

export default {
  create,
  getAll,
  getById,
  getByDepot,
  appendLines,
  validateTransfer,
  remove,
};
