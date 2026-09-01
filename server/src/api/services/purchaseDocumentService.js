import prisma from "../../loaders/prisma.js";
import ApiError from "../utils/apiError.js";
import { generateDocumentPDF, formatDate } from "../utils/pdfGenerator.js";

/**
 * Shared CRUD + PDF for purchase FournisseurDocument extensions.
 * Currently: commandeFournisseur (BCF) — quantity-only, no prices on PDF.
 */

const DOCUMENT_CONFIG = {
  commandeFournisseur: {
    key: "commandeFournisseur",
    prefix: "BCF",
    label: "Bon de commande fournisseur",
    prismaModel: "commandeFournisseur",
    relationKey: "commandeFournisseur",
    hidePrices: true,
    requireFournisseur: true,
    pdf: {
      title: "BON DE COMMANDE FOURNISSEUR",
      clientLabel: "FOURNISSEUR",
      signatureLeft: "Signature",
      signatureRight: "Signature fournisseur",
      getSubLine: (doc) =>
        `N°: ${doc.document.documentNumber}  |  Date: ${formatDate(doc.documentDate)}`,
      getInfoBar: () =>
        "Demande de prix — quantités uniquement (sans montants HT / TVA / TTC)",
    },
  },
};

const LINE_INCLUDE = {
  article: {
    select: {
      id: true,
      barcode: true,
      name: true,
      prixAchat: true,
      unitePrincipale: { select: { id: true, name: true, symbol: true } },
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
          unitePrincipale: { select: { id: true, name: true, symbol: true } },
          family: { select: { id: true, name: true, TVA: true } },
        },
      },
    },
  },
};

const documentInclude = {
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
    include: LINE_INCLUDE,
    orderBy: { lineNumber: "asc" },
  },
  user: { select: { id: true, name: true, email: true } },
};

const resolveSocieteId = (queryOrBody, user) => {
  if (user.isSuperAdmin) {
    const raw = queryOrBody?.societeId;
    return raw ? parseInt(raw) : null;
  }
  return user.societeId;
};

const generateDocumentNumber = async (societeId, prefix, relationKey) => {
  const year = new Date().getFullYear();
  const fullPrefix = `${prefix}-${year}`;

  const lastDoc = await prisma.fournisseurDocument.findFirst({
    where: {
      societeId,
      documentNumber: { startsWith: fullPrefix },
      [relationKey]: { isNot: null },
    },
    orderBy: { documentNumber: "desc" },
    select: { documentNumber: true },
  });

  let nextNumber = 1;
  if (lastDoc) {
    nextNumber = parseInt(lastDoc.documentNumber.split("-")[2], 10) + 1;
  }

  return `${fullPrefix}-${String(nextNumber).padStart(6, "0")}`;
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
  if (!fournisseur.active) throw new ApiError("Fournisseur is inactive", 400);
  return fournisseur;
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

const validateLinesStructure = (lines, { requirePrices }) => {
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
    if (requirePrices) {
      if (line.unitPrice === undefined || parseFloat(line.unitPrice) < 0) {
        throw new ApiError(
          `Line ${index + 1}: Unit price (TTC) is required`,
          400,
        );
      }
    }
  });
};

const buildLinesWithFinancials = async (tx, lines, { hidePrices }) => {
  const result = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const article = await resolveLineArticle(
      tx,
      line.articleId,
      line.variantId,
    );
    if (!article) {
      throw new ApiError(`Line ${i + 1}: Product not found`, 404);
    }

    const quantity = parseFloat(line.quantity);
    const description = line.description || article.name;

    if (hidePrices) {
      result.push({
        articleId: line.articleId || null,
        variantId: line.variantId || null,
        lineNumber: i + 1,
        description,
        quantity,
        unitPrice: 0,
        discount: 0,
        totalHT: 0,
        tvaRate: 0,
        totalTVA: 0,
        totalTTC: 0,
      });
      continue;
    }

    const tvaRate = parseFloat(article.family.TVA || 0);
    const familyRemise = parseFloat(article.family.remise || 0);
    const unitPriceTTC = parseFloat(line.unitPrice);
    const lineRemise = parseFloat(line.remise ?? line.discount ?? 0);

    if (lineRemise > familyRemise) {
      throw new ApiError(`Line ${i + 1}: remise exceeds family maximum`, 400);
    }

    const totalBeforeDiscount = quantity * unitPriceTTC;
    const discountAmount = totalBeforeDiscount * lineRemise;
    const totalTTC = totalBeforeDiscount - discountAmount;
    const totalHT = totalTTC / (1 + tvaRate);
    const totalTVA = totalTTC - totalHT;

    result.push({
      articleId: line.articleId || null,
      variantId: line.variantId || null,
      lineNumber: i + 1,
      description,
      quantity,
      unitPrice: unitPriceTTC,
      discount: lineRemise,
      totalHT: parseFloat(totalHT.toFixed(2)),
      tvaRate,
      totalTVA: parseFloat(totalTVA.toFixed(2)),
      totalTTC: parseFloat(totalTTC.toFixed(2)),
    });
  }
  return result;
};

const createExtensionRecord = async (tx, config, documentId, body) => {
  const documentDate = body.documentDate
    ? new Date(body.documentDate)
    : new Date();

  if (config.key === "commandeFournisseur") {
    return tx.commandeFournisseur.create({
      data: {
        id: documentId,
        documentDate,
        dateLivraisonPrevue: body.dateLivraisonPrevue
          ? new Date(body.dateLivraisonPrevue)
          : null,
        conditionsPaiement: body.conditionsPaiement || null,
      },
    });
  }

  throw new ApiError(`Unknown document type: ${config.key}`, 500);
};

const updateExtensionRecord = async (tx, config, id, body) => {
  const data = {};
  if (body.documentDate !== undefined) {
    data.documentDate = body.documentDate
      ? new Date(body.documentDate)
      : new Date();
  }
  if (config.key === "commandeFournisseur") {
    if (body.dateLivraisonPrevue !== undefined) {
      data.dateLivraisonPrevue = body.dateLivraisonPrevue
        ? new Date(body.dateLivraisonPrevue)
        : null;
    }
    if (body.conditionsPaiement !== undefined)
      data.conditionsPaiement = body.conditionsPaiement || null;
  }
  if (Object.keys(data).length === 0) return null;
  return tx[config.prismaModel].update({ where: { id }, data });
};

const extensionInclude = () => ({
  document: { include: documentInclude },
});

export const createPurchaseDocumentService = (typeKey) => {
  const config = DOCUMENT_CONFIG[typeKey];
  if (!config) throw new Error(`Unknown purchase document type: ${typeKey}`);

  const getNextDocumentNumber = async (query, user) => {
    const societeId = resolveSocieteId(query, user);
    if (!societeId) {
      throw new ApiError(
        "societeId is required. Pass ?societeId= for Super Admin.",
        400,
      );
    }
    const year = new Date().getFullYear();
    const documentNumber = await generateDocumentNumber(
      societeId,
      config.prefix,
      config.relationKey,
    );
    const sequence = parseInt(documentNumber.split("-")[2], 10);
    return { nextNumber: documentNumber, year, sequence };
  };

  const getProducts = async (query) => {
    const {
      search,
      categoryId,
      familyId,
      page = 1,
      limit = 50,
    } = query;

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
          variants: {
            include: {
              variantAttributes: {
                include: {
                  attribute: { select: { name: true } },
                  attributeValue: { select: { value: true } },
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
      if (!article.variants?.length) {
        products.push({
          type: "article",
          id: article.id,
          articleId: article.id,
          variantId: null,
          name: article.name,
          barcode: article.barcode,
          selectedPrice: 0,
          tva: parseFloat(article.family?.TVA || 0),
          remise: parseFloat(article.family?.remise || 0),
          unit: article.unitePrincipale,
          family: article.family,
        });
      } else {
        for (const variant of article.variants) {
          products.push({
            type: "variant",
            id: variant.id,
            articleId: article.id,
            variantId: variant.id,
            name: variant.name || article.name,
            barcode: variant.barcode,
            selectedPrice: 0,
            tva: parseFloat(article.family?.TVA || 0),
            remise: parseFloat(article.family?.remise || 0),
            unit: article.unitePrincipale,
            family: article.family,
            attributes: variant.variantAttributes,
          });
        }
      }
    }

    return {
      products,
      priceField: null,
      pagination: {
        page: Math.max(parseInt(page) || 1, 1),
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    };
  };

  const getAll = async (query, user) => {
    const {
      frsId,
      fournisseurId,
      status,
      startDate,
      endDate,
      keyword,
      page = 1,
      limit = 50,
    } = query;

    const partnerId = frsId || fournisseurId;
    const documentDateFilter = {};
    if (startDate) documentDateFilter.gte = new Date(startDate);
    if (endDate) documentDateFilter.lte = new Date(endDate);

    const documentWhere = {
      ...(user.isSuperAdmin ? {} : { societeId: user.societeId }),
      ...(partnerId && { fournisseurId: parseInt(partnerId) }),
      ...(status && { status }),
      ...(keyword && {
        OR: [
          { documentNumber: { contains: keyword } },
          { fournisseur: { name: { contains: keyword } } },
        ],
      }),
    };

    const where = {
      document: documentWhere,
      ...(Object.keys(documentDateFilter).length > 0 && {
        documentDate: documentDateFilter,
      }),
    };

    const take = Math.min(parseInt(limit) || 50, 100);
    const skip = (Math.max(parseInt(page) || 1, 1) - 1) * take;

    const [rows, total] = await Promise.all([
      prisma[config.prismaModel].findMany({
        where,
        include: extensionInclude(),
        orderBy: { documentDate: "desc" },
        skip,
        take,
      }),
      prisma[config.prismaModel].count({ where }),
    ]);

    return {
      items: rows,
      pagination: {
        page: Math.max(parseInt(page) || 1, 1),
        limit: take,
        total,
        totalPages: Math.ceil(total / take),
      },
    };
  };

  const getById = async (id, user) => {
    const row = await prisma[config.prismaModel].findUnique({
      where: { id },
      include: extensionInclude(),
    });
    if (!row) throw new ApiError(`${config.label} not found`, 404);
    if (!user.isSuperAdmin && row.document.societeId !== user.societeId) {
      throw new ApiError("Access denied", 403);
    }
    return row;
  };

  const create = async (body, user) => {
    const {
      frsId,
      fournisseurId,
      societeId: bodySocieteId,
      lines,
      notes,
      internalNotes,
      status = "DRAFT",
    } = body;

    const partnerId = frsId || fournisseurId;

    if (config.requireFournisseur && !partnerId) {
      throw new ApiError("frsId is required", 400);
    }

    validateLinesStructure(lines, { requirePrices: !config.hidePrices });

    const fournisseur = await validateFournisseurAccess(
      parseInt(partnerId),
      user,
    );
    let societeId = fournisseur.societeId;

    if (!societeId) {
      societeId = resolveSocieteId({ societeId: bodySocieteId }, user);
    }
    if (!societeId) {
      throw new ApiError("societeId is required", 400);
    }

    if (!["DRAFT", "COMPLETED", "CONFIRMED"].includes(status)) {
      throw new ApiError("Invalid status", 400);
    }

    const documentNumber = await generateDocumentNumber(
      societeId,
      config.prefix,
      config.relationKey,
    );

    try {
      return await prisma.$transaction(async (tx) => {
        const linesWithFinancials = await buildLinesWithFinancials(tx, lines, {
          hidePrices: config.hidePrices,
        });

        const totals = linesWithFinancials.reduce(
          (acc, l) => ({
            totalHT: acc.totalHT + Number(l.totalHT),
            totalTVA: acc.totalTVA + Number(l.totalTVA),
            totalTTC: acc.totalTTC + Number(l.totalTTC),
          }),
          { totalHT: 0, totalTVA: 0, totalTTC: 0 },
        );

        const amountDue = parseFloat(totals.totalTTC.toFixed(2));

        const fournisseurDocument = await tx.fournisseurDocument.create({
          data: {
            societeId,
            fournisseurId: fournisseur.id,
            documentNumber,
            status,
            totalHT: parseFloat(totals.totalHT.toFixed(2)),
            totalTVA: parseFloat(totals.totalTVA.toFixed(2)),
            totalTTC: amountDue,
            discount: 0,
            amountPaid: 0,
            amountDue,
            notes: notes || null,
            internalNotes: internalNotes || null,
            createdBy: user.id,
          },
        });

        await createExtensionRecord(tx, config, fournisseurDocument.id, body);

        await tx.fournisseurDocumentLine.createMany({
          data: linesWithFinancials.map((line) => ({
            ...line,
            documentId: fournisseurDocument.id,
          })),
        });

        return tx[config.prismaModel].findUnique({
          where: { id: fournisseurDocument.id },
          include: extensionInclude(),
        });
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        `Failed to create ${config.label}: ${error.message}`,
        500,
      );
    }
  };

  const update = async (id, body, user) => {
    const existing = await getById(id, user);

    if (existing.document.status === "CANCELLED") {
      throw new ApiError(`Cannot update a cancelled ${config.label}`, 400);
    }

    const { frsId, fournisseurId, lines, notes, internalNotes, status } = body;
    const partnerId = frsId ?? fournisseurId;

    if (lines !== undefined) {
      validateLinesStructure(lines, { requirePrices: !config.hidePrices });
    }

    let fournisseur = null;
    if (partnerId !== undefined && partnerId !== null) {
      fournisseur = await validateFournisseurAccess(parseInt(partnerId), user);
      if (fournisseur.societeId !== existing.document.societeId) {
        throw new ApiError("Fournisseur must belong to the same société", 400);
      }
    }

    try {
      return await prisma.$transaction(async (tx) => {
        const documentData = {};
        if (partnerId !== undefined) {
          documentData.fournisseurId = fournisseur
            ? fournisseur.id
            : existing.document.fournisseurId;
        }
        if (notes !== undefined) documentData.notes = notes || null;
        if (internalNotes !== undefined)
          documentData.internalNotes = internalNotes || null;
        if (status !== undefined) {
          if (
            !["DRAFT", "COMPLETED", "CONFIRMED", "CANCELLED"].includes(status)
          ) {
            throw new ApiError("Invalid status", 400);
          }
          documentData.status = status;
        }

        if (lines !== undefined) {
          const linesWithFinancials = await buildLinesWithFinancials(
            tx,
            lines,
            { hidePrices: config.hidePrices },
          );
          const totals = linesWithFinancials.reduce(
            (acc, l) => ({
              totalHT: acc.totalHT + Number(l.totalHT),
              totalTVA: acc.totalTVA + Number(l.totalTVA),
              totalTTC: acc.totalTTC + Number(l.totalTTC),
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

        await updateExtensionRecord(tx, config, id, body);

        return tx[config.prismaModel].findUnique({
          where: { id },
          include: extensionInclude(),
        });
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        `Failed to update ${config.label}: ${error.message}`,
        500,
      );
    }
  };

  const remove = async (id, user) => {
    const existing = await getById(id, user);
    if (existing.document.status === "COMPLETED") {
      throw new ApiError(
        `Cannot delete a completed ${config.label}. Cancel it first.`,
        400,
      );
    }
    try {
      await prisma.fournisseurDocument.delete({ where: { id } });
      return { message: `${config.label} deleted successfully` };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        `Failed to delete ${config.label}: ${error.message}`,
        500,
      );
    }
  };

  const generatePDF = async (id, user) => {
    const row = await getById(id, user);
    return generateDocumentPDF(
      {
        ...row,
        document: {
          ...row.document,
          client: row.document.fournisseur,
        },
      },
      {
        ...config.pdf,
        hidePrices: config.hidePrices,
      },
    );
  };

  return {
    config,
    getNextDocumentNumber,
    getProducts,
    getAll,
    getById,
    create,
    update,
    remove,
    generatePDF,
  };
};

export default createPurchaseDocumentService;
