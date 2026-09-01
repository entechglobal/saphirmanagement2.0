import prisma from "../../loaders/prisma.js";
import ApiError from "../utils/apiError.js";
import timeRangeUtility from "../utils/timeRangeUtility.js";
import stockManagementService from "./domain/stockManagementService.js";
import { generateDocumentPDF, formatDate } from "../utils/pdfGenerator.js";

/* ============================================================
   BON RETOUR FOURNISSEUR SERVICE
   Mirrors bonRetourClientService for suppliers / BonReception.
   Stock: RETURN_OUT (negative quantityChange — stock decreases).
   No pack lines (schema has none on BonRetourFournisseur).
============================================================ */

const generateDocumentNumber = async (societeId) => {
  const year = new Date().getFullYear();
  const prefix = `BRF-${year}`;

  const lastDoc = await prisma.fournisseurDocument.findFirst({
    where: {
      societeId,
      documentNumber: { startsWith: prefix },
      bonRetourFournisseur: { isNot: null },
    },
    orderBy: { documentNumber: "desc" },
    select: { documentNumber: true },
  });

  let nextNumber = 1;
  if (lastDoc) {
    nextNumber = parseInt(lastDoc.documentNumber.split("-")[2], 10) + 1;
  }

  return `${prefix}-${String(nextNumber).padStart(6, "0")}`;
};

export const getNextDocumentNumber = async (query, user) => {
  const societeId = user.isSuperAdmin
    ? query.societeId
      ? parseInt(query.societeId)
      : null
    : user.societeId;

  if (!societeId) {
    throw new ApiError(
      "societeId is required. Pass ?societeId= for Super Admin.",
      400,
    );
  }

  const year = new Date().getFullYear();
  const documentNumber = await generateDocumentNumber(societeId);
  const sequence = parseInt(documentNumber.split("-")[2], 10);

  return { nextNumber: documentNumber, year, sequence };
};

export const getProductsForBonRetourFournisseur = async (query, user) => {
  const {
    depotId,
    priceField = "prixAchat",
    search,
    categoryId,
    familyId,
    page = 1,
    limit = 50,
  } = query;

  if (!depotId) throw new ApiError("depotId is required", 400);

  const allowedPrices = ["prixAchat", "prixVente1", "prixVente2", "prixVente3"];
  if (!allowedPrices.includes(priceField)) {
    throw new ApiError(
      "priceField must be prixAchat, prixVente1, prixVente2 or prixVente3",
      400,
    );
  }

  const articleWhere = {
    visible: true,
    ...(familyId && { familyId: parseInt(familyId) }),
    ...(categoryId && { family: { categoryId: parseInt(categoryId) } }),
  };

  if (search) {
    articleWhere.OR = [
      { name: { contains: search } },
      { barcode: { contains: search } },
      { variants: { some: { barcode: { contains: search } } } },
      { variants: { some: { name: { contains: search } } } },
    ];
  }

  const take = Math.min(parseInt(limit) || 50, 100);
  const skip = (Math.max(parseInt(page) || 1, 1) - 1) * take;

  const [articles, total] = await Promise.all([
    prisma.article.findMany({
      where: articleWhere,
      include: {
        family: {
          select: {
            id: true,
            name: true,
            TVA: true,
            remise: true,
            category: { select: { id: true, name: true } },
          },
        },
        unitePrincipale: { select: { id: true, name: true, symbol: true } },
        stockByDepot: {
          where: { depotId: parseInt(depotId) },
          select: {
            quantityAvailable: true,
            quantityReserved: true,
            quantityInTransit: true,
          },
        },
        variants: {
          include: {
            variantAttributes: {
              include: {
                attribute: { select: { name: true } },
                attributeValue: { select: { value: true } },
              },
            },
            stockByDepot: {
              where: { depotId: parseInt(depotId) },
              select: {
                quantityAvailable: true,
                quantityReserved: true,
                quantityInTransit: true,
              },
            },
          },
        },
      },
      skip,
      take,
      orderBy: { name: "asc" },
    }),
    prisma.article.count({ where: articleWhere }),
  ]);

  const products = [];
  for (const article of articles) {
    const tvaRate = parseFloat(article.family.TVA || 0);
    const familyRemise = parseFloat(article.family.remise || 0);
    const unitPrice = parseFloat(article[priceField] ?? article.prixAchat ?? 0);

    if (!article.variants?.length) {
      const stock = article.stockByDepot[0] || {
        quantityAvailable: 0,
        quantityReserved: 0,
        quantityInTransit: 0,
      };
      products.push({
        type: "article",
        id: article.id,
        articleId: article.id,
        variantId: null,
        barcode: article.barcode,
        name: article.name,
        family: article.family,
        unit: article.unitePrincipale,
        gereEnStock: article.gereEnStock,
        tvaRate,
        familyRemise,
        prixAchat: parseFloat(article.prixAchat),
        unitPrice,
        selectedPrice: unitPrice,
        stock: {
          quantityAvailable: parseFloat(stock.quantityAvailable),
          quantityReserved: parseFloat(stock.quantityReserved),
          quantityInTransit: parseFloat(stock.quantityInTransit),
        },
      });
    } else {
      for (const variant of article.variants) {
        if (search) {
          const s = search.toLowerCase();
          const attrs = variant.variantAttributes
            .map((va) => va.attributeValue.value)
            .join(", ");
          const matches =
            variant.barcode?.toLowerCase().includes(s) ||
            variant.name?.toLowerCase().includes(s) ||
            article.name.toLowerCase().includes(s) ||
            attrs.toLowerCase().includes(s);
          if (!matches) continue;
        }
        const stock = variant.stockByDepot[0] || {
          quantityAvailable: 0,
          quantityReserved: 0,
          quantityInTransit: 0,
        };
        const attributes = variant.variantAttributes
          .map((va) => va.attributeValue.value)
          .join(", ");
        products.push({
          type: "variant",
          id: variant.id,
          articleId: article.id,
          variantId: variant.id,
          barcode: variant.barcode,
          name: attributes
            ? `${article.name} (${attributes})`
            : variant.name || article.name,
          family: article.family,
          unit: article.unitePrincipale,
          gereEnStock: article.gereEnStock,
          tvaRate,
          familyRemise,
          prixAchat: parseFloat(article.prixAchat),
          unitPrice,
          selectedPrice: unitPrice,
          stock: {
            quantityAvailable: parseFloat(stock.quantityAvailable),
            quantityReserved: parseFloat(stock.quantityReserved),
            quantityInTransit: parseFloat(stock.quantityInTransit),
          },
        });
      }
    }
  }

  return {
    products,
    priceField,
    pagination: {
      total,
      page: Math.max(parseInt(page) || 1, 1),
      limit: take,
      totalPages: Math.ceil(total / take),
    },
  };
};

const validateFournisseurAccess = async (frsId, user) => {
  const fournisseur = await prisma.fournisseur.findFirst({
    where: {
      id: frsId,
      ...(user.isSuperAdmin ? {} : { societeId: user.societeId }),
    },
    select: { id: true, name: true, societeId: true, active: true },
  });

  if (!fournisseur)
    throw new ApiError("Fournisseur not found or access denied", 404);
  if (!fournisseur.active)
    throw new ApiError("Cannot create return for inactive fournisseur", 400);

  return fournisseur;
};

const validateDepotAccess = async (depotId, user) => {
  if (!depotId)
    throw new ApiError("Depot is required for BonRetourFournisseur", 400);

  const depot = await prisma.depot.findFirst({
    where: {
      id: depotId,
      ...(user.isSuperAdmin ? {} : { societeId: user.societeId }),
    },
    select: { id: true, code: true, name: true, societeId: true, active: true },
  });

  if (!depot) throw new ApiError("Depot not found or access denied", 404);
  if (!depot.active)
    throw new ApiError("Cannot return stock from inactive depot", 400);

  return depot;
};

const resolveLineArticle = async (tx, articleId, variantId) => {
  if (articleId) {
    return tx.article.findUnique({
      where: { id: articleId },
      include: {
        family: { select: { id: true, name: true, TVA: true, remise: true } },
      },
    });
  }
  if (variantId) {
    const variant = await tx.articleVariant.findUnique({
      where: { id: variantId },
      include: {
        article: {
          include: {
            family: {
              select: { id: true, name: true, TVA: true, remise: true },
            },
          },
        },
      },
    });
    return variant?.article ?? null;
  }
  return null;
};

const validateLines = (lines) => {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new ApiError("At least one line is required", 400);
  }
  const seen = new Set();
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
    const key = line.articleId
      ? `article_${line.articleId}`
      : `variant_${line.variantId}`;
    if (seen.has(key)) {
      throw new ApiError(`Line ${index + 1}: Duplicate product`, 400);
    }
    seen.add(key);
    if (!line.quantity || parseFloat(line.quantity) <= 0) {
      throw new ApiError(
        `Line ${index + 1}: Quantity must be greater than 0`,
        400,
      );
    }
    if (line.unitPrice === undefined || parseFloat(line.unitPrice) < 0) {
      throw new ApiError(`Line ${index + 1}: unitPrice (TTC) is required`, 400);
    }
  });
};

const categorizeByStockManagement = async (lines) => {
  const stockManaged = [];
  const nonStockManaged = [];
  for (const line of lines) {
    const isManaged = await stockManagementService.isProductStockManaged(
      line.articleId,
      line.variantId,
    );
    (isManaged ? stockManaged : nonStockManaged).push(line);
  }
  return { stockManaged, nonStockManaged };
};

const buildLineFinancials = async (tx, line, lineNumber) => {
  const article = await resolveLineArticle(tx, line.articleId, line.variantId);
  if (!article) {
    throw new ApiError(`Line ${lineNumber}: Product not found`, 404);
  }

  const tvaRate = parseFloat(article.family.TVA || 0);
  const familyRemise = parseFloat(article.family.remise || 0);
  const lineRemise = parseFloat(line.remise ?? line.discount ?? 0);
  const unitPriceTTC = parseFloat(line.unitPrice);
  const quantity = parseFloat(line.quantity);

  if (lineRemise > familyRemise) {
    throw new ApiError(
      `Line ${lineNumber}: remise exceeds family maximum`,
      400,
    );
  }

  const totalBeforeDiscount = quantity * unitPriceTTC;
  const discountAmount = totalBeforeDiscount * lineRemise;
  const totalTTC = totalBeforeDiscount - discountAmount;
  const totalHT = totalTTC / (1 + tvaRate);
  const totalTVA = totalTTC - totalHT;

  return {
    articleId: line.articleId || null,
    variantId: line.variantId || null,
    lineNumber,
    description: line.description || article.name,
    quantity,
    unitPrice: unitPriceTTC,
    discount: lineRemise,
    totalHT: parseFloat(totalHT.toFixed(2)),
    tvaRate,
    totalTVA: parseFloat(totalTVA.toFixed(2)),
    totalTTC: parseFloat(totalTTC.toFixed(2)),
  };
};

const FULL_BRF_INCLUDE = {
  document: {
    include: {
      fournisseur: {
        select: {
          id: true,
          name: true,
          type: true,
          phone: true,
          email: true,
          address: true,
          ice: true,
        },
      },
      societe: {
        select: {
          id: true,
          raisonSocial: true,
          address: true,
          tel: true,
          email: true,
          ice: true,
          logo: true,
          phone: true,
          documentHeaderConfig: true,
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
              family: { select: { id: true, name: true, TVA: true } },
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
                  gereEnStock: true,
                  family: { select: { id: true, name: true, TVA: true } },
                  unitePrincipale: {
                    select: { id: true, name: true, symbol: true },
                  },
                },
              },
            },
          },
        },
        orderBy: { lineNumber: "asc" },
      },
      user: { select: { id: true, name: true, email: true } },
    },
  },
  depot: { select: { id: true, code: true, name: true, address: true } },
  bonReception: {
    select: {
      id: true,
      document: {
        select: { documentNumber: true, totalTTC: true, amountPaid: true },
      },
    },
  },
  avoirFournisseurs: {
    select: {
      id: true,
      document: { select: { documentNumber: true, totalTTC: true } },
    },
  },
  stockTransactions: true,
};

const applyFinancialReconciliation = async (
  tx,
  frsId,
  societeId,
  bonReceptionId,
  totalToApply,
) => {
  let remaining = parseFloat(totalToApply);

  if (bonReceptionId && remaining > 0) {
    const br = await tx.fournisseurDocument.findUnique({
      where: { id: bonReceptionId },
      select: { id: true, totalTTC: true, amountPaid: true },
    });
    if (br) {
      const outstanding = parseFloat(br.totalTTC) - parseFloat(br.amountPaid);
      const apply = Math.min(remaining, Math.max(outstanding, 0));
      if (apply > 0) {
        await tx.fournisseurDocument.update({
          where: { id: bonReceptionId },
          data: { amountPaid: { increment: apply } },
        });
        remaining -= apply;
      }
    }
  }

  if (remaining > 0) {
    const others = await tx.fournisseurDocument.findMany({
      where: {
        fournisseurId: frsId,
        societeId,
        bonReception: { isNot: null },
        ...(bonReceptionId ? { id: { not: bonReceptionId } } : {}),
      },
      orderBy: { createdAt: "asc" },
      select: { id: true, totalTTC: true, amountPaid: true },
    });

    for (const br of others) {
      if (remaining <= 0) break;
      const outstanding = parseFloat(br.totalTTC) - parseFloat(br.amountPaid);
      if (outstanding <= 0) continue;
      const apply = Math.min(remaining, outstanding);
      await tx.fournisseurDocument.update({
        where: { id: br.id },
        data: { amountPaid: { increment: apply } },
      });
      remaining -= apply;
    }
  }
};

const reverseFinancialReconciliation = async (
  tx,
  frsId,
  societeId,
  bonReceptionId,
  totalToReverse,
) => {
  let remaining = parseFloat(totalToReverse);

  if (bonReceptionId && remaining > 0) {
    const br = await tx.fournisseurDocument.findUnique({
      where: { id: bonReceptionId },
      select: { id: true, amountPaid: true },
    });
    if (br) {
      const removable = Math.min(remaining, parseFloat(br.amountPaid));
      if (removable > 0) {
        await tx.fournisseurDocument.update({
          where: { id: bonReceptionId },
          data: { amountPaid: { decrement: removable } },
        });
        remaining -= removable;
      }
    }
  }

  if (remaining > 0) {
    const others = await tx.fournisseurDocument.findMany({
      where: {
        fournisseurId: frsId,
        societeId,
        bonReception: { isNot: null },
        ...(bonReceptionId ? { id: { not: bonReceptionId } } : {}),
      },
      orderBy: { createdAt: "asc" },
      select: { id: true, amountPaid: true },
    });

    for (const br of others) {
      if (remaining <= 0) break;
      const removable = Math.min(remaining, parseFloat(br.amountPaid));
      if (removable <= 0) continue;
      await tx.fournisseurDocument.update({
        where: { id: br.id },
        data: { amountPaid: { decrement: removable } },
      });
      remaining -= removable;
    }
  }
};

const applyReturnOutStock = async (
  tx,
  { depotId, lines, documentNumber, fournisseurName, userId, brfId },
) => {
  const { stockManaged } = await categorizeByStockManagement(lines);
  if (stockManaged.length === 0) return stockManaged;

  await stockManagementService.batchStockOperationsWithTx(
    tx,
    stockManaged.map((line) => ({
      depotId,
      articleId: line.articleId || null,
      variantId: line.variantId || null,
      quantityChange: -parseFloat(line.quantity),
      transactionType: "RETURN_OUT",
      referenceId: documentNumber,
      reason: `Return to ${fournisseurName}: ${documentNumber}`,
      userId,
      bonRetourFournisseurId: brfId,
    })),
  );
  return stockManaged;
};

const reverseReturnOutStock = async (tx, transactions) => {
  for (const t of transactions) {
    const isManaged = await stockManagementService.isProductStockManaged(
      t.articleId || null,
      t.variantId || null,
    );
    if (!isManaged) continue;

    const stock = await tx.stockByDepot.findFirst({
      where: {
        depotId: t.depotId,
        articleId: t.articleId || null,
        variantId: t.variantId || null,
      },
      select: { id: true },
    });
    if (!stock) continue;

    await tx.stockByDepot.update({
      where: { id: stock.id },
      data: {
        quantityAvailable: {
          increment: Math.abs(parseFloat(t.quantityChange)),
        },
      },
    });
  }
};

export const getAll = async (query, user) => {
  const {
    frsId,
    fournisseurId,
    depotId,
    status,
    startDate,
    endDate,
    page = 1,
    limit = 50,
  } = query;

  const partnerId = frsId || fournisseurId;
  const documentDateFilter = {};
  if (startDate) documentDateFilter.gte = new Date(startDate);
  if (endDate) documentDateFilter.lte = new Date(endDate);

  const where = {
    document: {
      ...(user.isSuperAdmin ? {} : { societeId: user.societeId }),
      ...(partnerId && { fournisseurId: parseInt(partnerId) }),
      ...(status && { status }),
    },
    ...(depotId && { depotId: parseInt(depotId) }),
    ...(Object.keys(documentDateFilter).length > 0 && {
      documentDate: documentDateFilter,
    }),
  };

  const all = await prisma.bonRetourFournisseur.findMany({
    where,
    include: {
      document: {
        include: {
          fournisseur: { select: { id: true, name: true } },
          user: { select: { id: true, name: true } },
        },
      },
      depot: { select: { id: true, code: true, name: true } },
      bonReception: {
        select: {
          id: true,
          document: { select: { documentNumber: true } },
        },
      },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  const filtered = await timeRangeUtility.filterBySystemHours(
    all,
    "documentDate",
  );

  const parsedPage = parseInt(page);
  const parsedLimit = parseInt(limit);
  const total = filtered.length;
  const rows = filtered.slice(
    (parsedPage - 1) * parsedLimit,
    parsedPage * parsedLimit,
  );

  const fmtDateTime = (d) =>
    d
      ? new Date(d).toLocaleString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })
      : null;

  const data = rows.map((brf) => ({
    id: brf.id,
    documentNumber: brf.document.documentNumber,
    status: brf.document.status,
    documentDate: fmtDateTime(brf.documentDate),
    depotId: brf.depotId,
    depot: brf.depot,
    fournisseurName: brf.document.fournisseur.name,
    fournisseurId: brf.document.fournisseur.id,
    clientName: brf.document.fournisseur.name,
    clientId: brf.document.fournisseur.id,
    createdBy: brf.document.user
      ? { id: brf.document.user.id, name: brf.document.user.name }
      : null,
    totalHT: parseFloat(brf.document.totalHT),
    totalTVA: parseFloat(brf.document.totalTVA),
    totalTTC: parseFloat(brf.document.totalTTC),
    motifRetour: brf.motifRetour,
    bonReceptionId: brf.bonReceptionId,
    bonReception: brf.bonReception,
    createdAt: fmtDateTime(brf.createdAt),
  }));

  return {
    bonRetourFournisseurs: data,
    pagination: {
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit),
    },
  };
};

export const getById = async (id, user) => {
  const brf = await prisma.bonRetourFournisseur.findUnique({
    where: { id },
    include: FULL_BRF_INCLUDE,
  });

  if (!brf) throw new ApiError("Bon retour fournisseur not found", 404);

  if (!user.isSuperAdmin && brf.document.societe.id !== user.societeId) {
    throw new ApiError("Access denied", 403);
  }

  return brf;
};

export const create = async (data, user) => {
  const {
    frsId,
    depotId,
    bonReceptionId,
    documentDate,
    motifRetour,
    notes,
    lines = [],
    status = "DRAFT",
  } = data;

  await timeRangeUtility.validateSystemHours(
    new Date(),
    "bon retour fournisseur creation",
  );

  const fournisseur = await validateFournisseurAccess(frsId, user);
  const depot = await validateDepotAccess(depotId, user);

  if (fournisseur.societeId !== depot.societeId) {
    throw new ApiError(
      "Fournisseur and depot must belong to the same société",
      400,
    );
  }

  if (bonReceptionId) {
    const br = await prisma.bonReception.findFirst({
      where: {
        id: bonReceptionId,
        document: {
          fournisseurId: frsId,
          status: "COMPLETED",
          ...(user.isSuperAdmin ? {} : { societeId: user.societeId }),
        },
      },
      select: { id: true },
    });
    if (!br) {
      throw new ApiError(
        "BonReception not found, not completed, or does not belong to this fournisseur",
        404,
      );
    }
  }

  validateLines(lines);
  const { stockManaged, nonStockManaged } =
    await categorizeByStockManagement(lines);

  if (!["DRAFT", "COMPLETED"].includes(status)) {
    throw new ApiError("status must be DRAFT or COMPLETED", 400);
  }

  const documentNumber = await generateDocumentNumber(fournisseur.societeId);

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const linesWithFinancials = [];
        for (let i = 0; i < lines.length; i++) {
          linesWithFinancials.push(
            await buildLineFinancials(tx, lines[i], i + 1),
          );
        }

        const totals = linesWithFinancials.reduce(
          (acc, l) => ({
            totalHT: acc.totalHT + l.totalHT,
            totalTVA: acc.totalTVA + l.totalTVA,
            totalTTC: acc.totalTTC + l.totalTTC,
          }),
          { totalHT: 0, totalTVA: 0, totalTTC: 0 },
        );

        const totalHT = parseFloat(totals.totalHT.toFixed(2));
        const totalTVA = parseFloat(totals.totalTVA.toFixed(2));
        const totalTTC = parseFloat(totals.totalTTC.toFixed(2));

        const fournisseurDocument = await tx.fournisseurDocument.create({
          data: {
            societeId: fournisseur.societeId,
            fournisseurId: frsId,
            documentNumber,
            status,
            totalHT,
            totalTVA,
            totalTTC,
            discount: 0,
            amountPaid: 0,
            amountDue: totalTTC,
            notes: notes || null,
            createdBy: user.id,
          },
        });

        const bonRetourFournisseur = await tx.bonRetourFournisseur.create({
          data: {
            id: fournisseurDocument.id,
            documentDate: documentDate ? new Date(documentDate) : new Date(),
            depotId,
            bonReceptionId: bonReceptionId || null,
            motifRetour: motifRetour || null,
          },
        });

        await tx.fournisseurDocumentLine.createMany({
          data: linesWithFinancials.map((line) => ({
            ...line,
            documentId: fournisseurDocument.id,
          })),
        });

        if (status === "COMPLETED") {
          await applyReturnOutStock(tx, {
            depotId,
            lines,
            documentNumber,
            fournisseurName: fournisseur.name,
            userId: user.id,
            brfId: bonRetourFournisseur.id,
          });
          await applyFinancialReconciliation(
            tx,
            frsId,
            fournisseur.societeId,
            bonReceptionId || null,
            totalTTC,
          );
        }

        return tx.bonRetourFournisseur.findUnique({
          where: { id: bonRetourFournisseur.id },
          include: FULL_BRF_INCLUDE,
        });
      },
      { timeout: 30000 },
    );

    return {
      ...result,
      summary: {
        totalLines: result.document.lines.length,
        stockManagedLines: stockManaged.length,
        nonStockManagedLines: nonStockManaged.length,
        totalTTC: parseFloat(result.document.totalTTC),
        stockMovementApplied:
          status === "COMPLETED" && stockManaged.length > 0,
        financialReconciliationApplied: status === "COMPLETED",
      },
    };
  } catch (error) {
    if (error.code === "P2002")
      throw new ApiError("Duplicate document number", 409);
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      `Failed to create bon retour fournisseur: ${error.message}`,
      500,
    );
  }
};

export const validate = async (id, targetStatus, user) => {
  await timeRangeUtility.validateSystemHours(
    new Date(),
    "bon retour fournisseur validation",
  );

  const brf = await prisma.bonRetourFournisseur.findUnique({
    where: { id },
    include: {
      document: {
        include: {
          lines: true,
          fournisseur: { select: { id: true, name: true, societeId: true } },
        },
      },
      stockTransactions: { where: { transactionType: "RETURN_OUT" } },
    },
  });

  if (!brf) throw new ApiError("Bon retour fournisseur not found", 404);

  if (!user.isSuperAdmin && brf.document.fournisseur.societeId !== user.societeId) {
    throw new ApiError("Access denied", 403);
  }

  const currentStatus = brf.document.status;
  const documentNumber = brf.document.documentNumber;
  const frsId = brf.document.fournisseur.id;
  const societeId = brf.document.fournisseur.societeId;
  const fournisseurName = brf.document.fournisseur.name;
  const depotId = brf.depotId;
  const totalTTC = parseFloat(brf.document.totalTTC);

  if (currentStatus === targetStatus) {
    throw new ApiError(
      `Bon retour fournisseur is already ${targetStatus}`,
      400,
    );
  }

  const ALLOWED = { DRAFT: "COMPLETED", COMPLETED: "DRAFT" };
  if (ALLOWED[currentStatus] !== targetStatus) {
    throw new ApiError(
      `Cannot transition from ${currentStatus} to ${targetStatus}`,
      400,
    );
  }

  if (targetStatus === "COMPLETED") {
    const lines = brf.document.lines;
    if (!lines?.length) {
      throw new ApiError(
        "Cannot complete a bon retour fournisseur with no lines",
        400,
      );
    }

    const { stockManaged, nonStockManaged } =
      await categorizeByStockManagement(lines);

    try {
      const result = await prisma.$transaction(
        async (tx) => {
          await applyReturnOutStock(tx, {
            depotId,
            lines,
            documentNumber,
            fournisseurName,
            userId: user.id,
            brfId: id,
          });
          await applyFinancialReconciliation(
            tx,
            frsId,
            societeId,
            brf.bonReceptionId,
            totalTTC,
          );
          await tx.fournisseurDocument.update({
            where: { id },
            data: { status: "COMPLETED" },
          });
          return tx.bonRetourFournisseur.findUnique({
            where: { id },
            include: FULL_BRF_INCLUDE,
          });
        },
        { timeout: 30000 },
      );

      return {
        ...result,
        transition: {
          from: "DRAFT",
          to: "COMPLETED",
          stockManagedLines: stockManaged.length,
          nonStockManagedLines: nonStockManaged.length,
          returnOutApplied: stockManaged.length > 0,
          financialReconciliationApplied: true,
          documentNumber,
        },
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        `Failed to validate bon retour fournisseur: ${error.message}`,
        500,
      );
    }
  }

  // COMPLETED → DRAFT
  try {
    const result = await prisma.$transaction(
      async (tx) => {
        await reverseReturnOutStock(tx, brf.stockTransactions);
        await tx.stockTransaction.deleteMany({
          where: { bonRetourFournisseurId: id, transactionType: "RETURN_OUT" },
        });
        await reverseFinancialReconciliation(
          tx,
          frsId,
          societeId,
          brf.bonReceptionId,
          totalTTC,
        );
        await tx.fournisseurDocument.update({
          where: { id },
          data: { status: "DRAFT" },
        });
        return tx.bonRetourFournisseur.findUnique({
          where: { id },
          include: FULL_BRF_INCLUDE,
        });
      },
      { timeout: 30000 },
    );

    return {
      ...result,
      transition: {
        from: "COMPLETED",
        to: "DRAFT",
        transactionsReversed: brf.stockTransactions.length,
        stockReverted: brf.stockTransactions.length > 0,
        financialReconciliationReverted: true,
        documentNumber,
      },
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      `Failed to revert bon retour fournisseur: ${error.message}`,
      500,
    );
  }
};

export const update = async (id, data, user) => {
  const {
    frsId,
    depotId,
    bonReceptionId,
    documentDate,
    motifRetour,
    notes,
    lines,
  } = data;

  await timeRangeUtility.validateSystemHours(
    new Date(),
    "bon retour fournisseur update",
  );

  const existing = await prisma.bonRetourFournisseur.findUnique({
    where: { id },
    include: {
      document: {
        include: {
          lines: true,
          fournisseur: { select: { id: true, societeId: true } },
        },
      },
    },
  });

  if (!existing) throw new ApiError("Bon retour fournisseur not found", 404);

  if (
    !user.isSuperAdmin &&
    existing.document.fournisseur.societeId !== user.societeId
  ) {
    throw new ApiError("Access denied", 403);
  }

  if (existing.document.status !== "DRAFT") {
    throw new ApiError(
      "Only DRAFT bon retour fournisseur can be updated",
      400,
    );
  }

  let partenaireId = existing.document.fournisseurId;
  let societeId = existing.document.fournisseur.societeId;

  if (frsId && frsId !== existing.document.fournisseurId) {
    const frs = await validateFournisseurAccess(frsId, user);
    partenaireId = frs.id;
    societeId = frs.societeId;
  }

  if (depotId) await validateDepotAccess(depotId, user);

  if (bonReceptionId !== undefined && bonReceptionId !== null) {
    const br = await prisma.bonReception.findFirst({
      where: {
        id: bonReceptionId,
        document: {
          fournisseurId: partenaireId,
          status: "COMPLETED",
          ...(user.isSuperAdmin ? {} : { societeId: user.societeId }),
        },
      },
      select: { id: true },
    });
    if (!br) {
      throw new ApiError(
        "BonReception not found or does not belong to this fournisseur",
        404,
      );
    }
  }

  try {
    return await prisma.$transaction(
      async (tx) => {
        const extensionData = {};
        if (documentDate !== undefined)
          extensionData.documentDate = documentDate
            ? new Date(documentDate)
            : new Date();
        if (depotId !== undefined) extensionData.depotId = depotId;
        if (bonReceptionId !== undefined)
          extensionData.bonReceptionId = bonReceptionId || null;
        if (motifRetour !== undefined)
          extensionData.motifRetour = motifRetour || null;

        if (Object.keys(extensionData).length > 0) {
          await tx.bonRetourFournisseur.update({
            where: { id },
            data: extensionData,
          });
        }

        const documentData = {};
        if (frsId) documentData.fournisseurId = partenaireId;
        if (notes !== undefined) documentData.notes = notes || null;

        if (lines !== undefined) {
          validateLines(lines);
          const linesWithFinancials = [];
          for (let i = 0; i < lines.length; i++) {
            linesWithFinancials.push(
              await buildLineFinancials(tx, lines[i], i + 1),
            );
          }
          const totals = linesWithFinancials.reduce(
            (acc, l) => ({
              totalHT: acc.totalHT + l.totalHT,
              totalTVA: acc.totalTVA + l.totalTVA,
              totalTTC: acc.totalTTC + l.totalTTC,
            }),
            { totalHT: 0, totalTVA: 0, totalTTC: 0 },
          );

          documentData.totalHT = parseFloat(totals.totalHT.toFixed(2));
          documentData.totalTVA = parseFloat(totals.totalTVA.toFixed(2));
          documentData.totalTTC = parseFloat(totals.totalTTC.toFixed(2));
          documentData.amountDue = parseFloat(totals.totalTTC.toFixed(2));

          await tx.fournisseurDocumentLine.deleteMany({
            where: { documentId: id },
          });
          await tx.fournisseurDocumentLine.createMany({
            data: linesWithFinancials.map((line) => ({
              ...line,
              documentId: id,
            })),
          });
        }

        if (Object.keys(documentData).length > 0) {
          await tx.fournisseurDocument.update({
            where: { id },
            data: documentData,
          });
        }

        return tx.bonRetourFournisseur.findUnique({
          where: { id },
          include: FULL_BRF_INCLUDE,
        });
      },
      { timeout: 30000 },
    );
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      `Failed to update bon retour fournisseur: ${error.message}`,
      500,
    );
  }
};

export const remove = async (id, user) => {
  await timeRangeUtility.validateSystemHours(
    new Date(),
    "delete bon retour fournisseur",
  );

  const brf = await prisma.bonRetourFournisseur.findUnique({
    where: { id },
    include: {
      document: {
        select: {
          societeId: true,
          fournisseurId: true,
          status: true,
          totalTTC: true,
        },
      },
      stockTransactions: true,
    },
  });

  if (!brf) throw new ApiError("Bon retour fournisseur not found", 404);

  if (!user.isSuperAdmin && brf.document.societeId !== user.societeId) {
    throw new ApiError("Access denied", 403);
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        if (brf.document.status === "COMPLETED") {
          const returnOut = brf.stockTransactions.filter(
            (t) => t.transactionType === "RETURN_OUT",
          );
          await reverseReturnOutStock(tx, returnOut);
          await reverseFinancialReconciliation(
            tx,
            brf.document.fournisseurId,
            brf.document.societeId,
            brf.bonReceptionId,
            parseFloat(brf.document.totalTTC),
          );
        }

        await tx.stockTransaction.deleteMany({
          where: { bonRetourFournisseurId: id },
        });
        await tx.fournisseurDocumentLine.deleteMany({
          where: { documentId: id },
        });
        await tx.bonRetourFournisseur.delete({ where: { id } });
        await tx.fournisseurDocument.delete({ where: { id } });
      },
      { timeout: 30000 },
    );

    return { message: "Bon retour fournisseur deleted successfully" };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      `Failed to delete bon retour fournisseur: ${error.message}`,
      500,
    );
  }
};

const BRF_PDF_CONFIG = {
  title: "BON DE RETOUR FOURNISSEUR",
  clientLabel: "FOURNISSEUR",
  getSubLine: (brf) =>
    `N°: ${brf.document.documentNumber}  |  Date: ${formatDate(brf.documentDate)}`,
  getInfoBar: (brf) => {
    let text = brf.depot
      ? `Dépôt: ${brf.depot.name} (${brf.depot.code})`
      : "";
    if (brf.bonReception?.document?.documentNumber) {
      text += `${text ? "  |  " : ""}BR d'origine: ${brf.bonReception.document.documentNumber}`;
    }
    if (brf.motifRetour) text += `${text ? "  |  " : ""}Motif: ${brf.motifRetour}`;
    return text || "Retour fournisseur";
  },
  signatureLeft: "Responsable retour",
  signatureRight: "Signature fournisseur",
};

export const generateBonRetourFournisseurPDF = async (id, user) => {
  const brf = await getById(id, user);
  return generateDocumentPDF(
    {
      ...brf,
      document: {
        ...brf.document,
        client: brf.document.fournisseur,
      },
    },
    BRF_PDF_CONFIG,
  );
};
