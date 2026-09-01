import prisma from "../../loaders/prisma.js";
import ApiError from "../utils/apiError.js";
import { generateDocumentPDF, formatDate } from "../utils/pdfGenerator.js";

/**
 * Shared CRUD + PDF for sales ClientDocument extensions:
 * - commande (BC): quantity-only, no prices on PDF
 * - devis: priced quote
 * - facture: priced invoice
 *
 * No stock impact, no livreur, no dépôt required.
 */

const DOCUMENT_CONFIG = {
  commande: {
    key: "commande",
    prefix: "BC",
    label: "Bon de commande",
    prismaModel: "commande",
    hidePrices: true,
    requireClient: false,
    pdf: {
      title: "BON DE COMMANDE",
      clientLabel: "CLIENT / DESTINATAIRE",
      signatureLeft: "Signature",
      signatureRight: "Signature client",
      getSubLine: (doc) =>
        `N°: ${doc.document.documentNumber}  |  Date: ${formatDate(doc.documentDate)}`,
      getInfoBar: () =>
        "Demande de prix — quantités uniquement (sans montants HT / TVA / TTC)",
    },
  },
  devis: {
    key: "devis",
    prefix: "DV",
    label: "Devis",
    prismaModel: "devis",
    hidePrices: false,
    requireClient: true,
    pdf: {
      title: "DEVIS",
      clientLabel: "CLIENT",
      signatureLeft: "Signature société",
      signatureRight: "Signature client",
      getSubLine: (doc) => {
        let line = `N°: ${doc.document.documentNumber}  |  Date: ${formatDate(doc.documentDate)}`;
        if (doc.validUntil) line += `  |  Validité: ${formatDate(doc.validUntil)}`;
        return line;
      },
      getInfoBar: (doc) =>
        doc.paymentMethod
          ? `Mode de paiement: ${doc.paymentMethod}`
          : "Devis commercial",
    },
  },
  facture: {
    key: "facture",
    prefix: "FA",
    label: "Facture",
    prismaModel: "facture",
    hidePrices: false,
    requireClient: true,
    pdf: {
      title: "FACTURE",
      clientLabel: "CLIENT",
      signatureLeft: "Signature société",
      signatureRight: "Signature client",
      getSubLine: (doc) => {
        let line = `N°: ${doc.document.documentNumber}  |  Date: ${formatDate(doc.documentDate)}`;
        if (doc.dateEcheance)
          line += `  |  Échéance: ${formatDate(doc.dateEcheance)}`;
        return line;
      },
      getInfoBar: (doc) => {
        let text = doc.paymentMethod
          ? `Mode de paiement: ${doc.paymentMethod}`
          : "Facture";
        if (doc.bonLivraison?.document?.documentNumber) {
          text += `  |  BL: ${doc.bonLivraison.document.documentNumber}`;
        }
        return text;
      },
    },
  },
};

const LINE_INCLUDE = {
  article: {
    select: {
      id: true,
      barcode: true,
      name: true,
      prixVente1: true,
      prixVente2: true,
      prixVente3: true,
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
  client: {
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

  const lastDoc = await prisma.clientDocument.findFirst({
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

const validateClientAccess = async (clientId, user) => {
  const client = await prisma.client.findFirst({
    where: {
      id: clientId,
      ...(user.isSuperAdmin ? {} : { societeId: user.societeId }),
    },
    select: { id: true, name: true, societeId: true, active: true },
  });

  if (!client) throw new ApiError("Client not found or access denied", 404);
  if (!client.active) throw new ApiError("Client is inactive", 400);
  return client;
};

const resolveLineArticle = async (tx, articleId, variantId) => {
  if (articleId) {
    return await tx.article.findUnique({
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
      if (
        line.priceField &&
        !["prixVente1", "prixVente2", "prixVente3"].includes(line.priceField)
      ) {
        throw new ApiError(
          `Line ${index + 1}: priceField must be prixVente1, prixVente2 or prixVente3`,
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
        remise: 0,
        totalHT: 0,
        tvaRate: 0,
        totalTVA: 0,
        totalTTC: 0,
        priceField: null,
      });
      continue;
    }

    const tvaRate = parseFloat(article.family.TVA || 0);
    const familyRemise = parseFloat(article.family.remise || 0);
    const unitPriceTTC = parseFloat(line.unitPrice);
    const lineRemise = parseFloat(line.remise || 0);

    if (lineRemise > familyRemise) {
      throw new ApiError(
        `Line ${i + 1}: remise exceeds family maximum`,
        400,
      );
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
      remise: lineRemise,
      totalHT: parseFloat(totalHT.toFixed(2)),
      tvaRate,
      totalTVA: parseFloat(totalTVA.toFixed(2)),
      totalTTC: parseFloat(totalTTC.toFixed(2)),
      priceField: line.priceField || "prixVente1",
    });
  }

  return result;
};

const createExtensionRecord = async (tx, config, documentId, body) => {
  const documentDate = body.documentDate
    ? new Date(body.documentDate)
    : new Date();

  if (config.key === "commande") {
    return tx.commande.create({
      data: {
        id: documentId,
        documentDate,
        dateConfirmation: body.dateConfirmation
          ? new Date(body.dateConfirmation)
          : null,
        dateLivraisonPrevue: body.dateLivraisonPrevue
          ? new Date(body.dateLivraisonPrevue)
          : null,
        paymentMethod: body.paymentMethod || null,
        conditionsPaiement: body.conditionsPaiement || null,
        devisId: body.devisId ? parseInt(body.devisId) : null,
      },
    });
  }

  if (config.key === "devis") {
    return tx.devis.create({
      data: {
        id: documentId,
        documentDate,
        validUntil: body.validUntil ? new Date(body.validUntil) : null,
        paymentMethod: body.paymentMethod || null,
        remiseGlobale: body.remiseGlobale != null ? body.remiseGlobale : null,
        conditions: body.conditions || null,
      },
    });
  }

  if (config.key === "facture") {
    return tx.facture.create({
      data: {
        id: documentId,
        documentDate,
        dateEcheance: body.dateEcheance ? new Date(body.dateEcheance) : null,
        paymentMethod: body.paymentMethod || null,
        penalitesRetard:
          body.penalitesRetard != null ? body.penalitesRetard : null,
        conditionsPaiement: body.conditionsPaiement || null,
        bonLivraisonId: body.bonLivraisonId
          ? parseInt(body.bonLivraisonId)
          : null,
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

  if (config.key === "commande") {
    if (body.dateConfirmation !== undefined) {
      data.dateConfirmation = body.dateConfirmation
        ? new Date(body.dateConfirmation)
        : null;
    }
    if (body.dateLivraisonPrevue !== undefined) {
      data.dateLivraisonPrevue = body.dateLivraisonPrevue
        ? new Date(body.dateLivraisonPrevue)
        : null;
    }
    if (body.paymentMethod !== undefined)
      data.paymentMethod = body.paymentMethod || null;
    if (body.conditionsPaiement !== undefined)
      data.conditionsPaiement = body.conditionsPaiement || null;
    if (body.devisId !== undefined)
      data.devisId = body.devisId ? parseInt(body.devisId) : null;
  }

  if (config.key === "devis") {
    if (body.validUntil !== undefined) {
      data.validUntil = body.validUntil ? new Date(body.validUntil) : null;
    }
    if (body.paymentMethod !== undefined)
      data.paymentMethod = body.paymentMethod || null;
    if (body.remiseGlobale !== undefined)
      data.remiseGlobale = body.remiseGlobale;
    if (body.conditions !== undefined) data.conditions = body.conditions || null;
  }

  if (config.key === "facture") {
    if (body.dateEcheance !== undefined) {
      data.dateEcheance = body.dateEcheance
        ? new Date(body.dateEcheance)
        : null;
    }
    if (body.paymentMethod !== undefined)
      data.paymentMethod = body.paymentMethod || null;
    if (body.penalitesRetard !== undefined)
      data.penalitesRetard = body.penalitesRetard;
    if (body.conditionsPaiement !== undefined)
      data.conditionsPaiement = body.conditionsPaiement || null;
    if (body.bonLivraisonId !== undefined) {
      data.bonLivraisonId = body.bonLivraisonId
        ? parseInt(body.bonLivraisonId)
        : null;
    }
  }

  if (Object.keys(data).length === 0) return null;
  return tx[config.prismaModel].update({ where: { id }, data });
};

const extensionInclude = (config) => {
  const base = { document: { include: documentInclude } };
  if (config.key === "facture") {
    base.bonLivraison = {
      select: {
        id: true,
        document: { select: { documentNumber: true } },
      },
    };
  }
  if (config.key === "commande") {
    base.devis = {
      select: {
        id: true,
        document: { select: { documentNumber: true } },
      },
    };
  }
  return base;
};

export const createSalesDocumentService = (typeKey) => {
  const config = DOCUMENT_CONFIG[typeKey];
  if (!config) throw new Error(`Unknown sales document type: ${typeKey}`);

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
      config.key,
    );
    const sequence = parseInt(documentNumber.split("-")[2], 10);

    return { nextNumber: documentNumber, year, sequence };
  };

  const getProducts = async (query, user) => {
    const {
      priceField = "prixVente1",
      search,
      categoryId,
      familyId,
      page = 1,
      limit = 50,
    } = query;

    if (
      !config.hidePrices &&
      !["prixVente1", "prixVente2", "prixVente3"].includes(priceField)
    ) {
      throw new ApiError(
        "priceField must be prixVente1, prixVente2 or prixVente3",
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
          selectedPrice: config.hidePrices
            ? 0
            : parseFloat(article[priceField] || 0),
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
            selectedPrice: config.hidePrices
              ? 0
              : parseFloat(article[priceField] || 0),
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
      priceField,
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
      clientId,
      status,
      startDate,
      endDate,
      keyword,
      page = 1,
      limit = 50,
    } = query;

    const documentDateFilter = {};
    if (startDate) documentDateFilter.gte = new Date(startDate);
    if (endDate) documentDateFilter.lte = new Date(endDate);

    const documentWhere = {
      ...(user.isSuperAdmin ? {} : { societeId: user.societeId }),
      ...(clientId && { clientId: parseInt(clientId) }),
      ...(status && { status }),
      ...(keyword && {
        OR: [
          { documentNumber: { contains: keyword } },
          { clientName: { contains: keyword } },
          { client: { name: { contains: keyword } } },
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
        include: extensionInclude(config),
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
      include: extensionInclude(config),
    });

    if (!row) throw new ApiError(`${config.label} not found`, 404);

    if (!user.isSuperAdmin && row.document.societeId !== user.societeId) {
      throw new ApiError("Access denied", 403);
    }

    return row;
  };

  const create = async (body, user) => {
    const {
      clientId,
      clientName,
      societeId: bodySocieteId,
      lines,
      notes,
      internalNotes,
      status = "DRAFT",
    } = body;

    if (config.requireClient && !clientId) {
      throw new ApiError("clientId is required", 400);
    }

    validateLinesStructure(lines, { requirePrices: !config.hidePrices });

    let client = null;
    let societeId = resolveSocieteId({ societeId: bodySocieteId }, user);

    if (clientId) {
      client = await validateClientAccess(parseInt(clientId), user);
      societeId = client.societeId;
    }

    if (!societeId) {
      throw new ApiError(
        "societeId is required when no client is selected (Super Admin)",
        400,
      );
    }

    if (!["DRAFT", "COMPLETED", "CONFIRMED"].includes(status)) {
      throw new ApiError("Invalid status", 400);
    }

    // Facture ↔ Bon livraison liaison
    if (config.key === "facture" && body.bonLivraisonId) {
      const bl = await prisma.bonLivraison.findUnique({
        where: { id: parseInt(body.bonLivraisonId) },
        include: {
          document: {
            select: {
              societeId: true,
              clientId: true,
              documentNumber: true,
              status: true,
            },
          },
        },
      });
      if (!bl) throw new ApiError("Bon de livraison not found", 404);
      if (!user.isSuperAdmin && bl.document.societeId !== user.societeId) {
        throw new ApiError("Access denied to this bon de livraison", 403);
      }
      if (bl.document.societeId !== societeId) {
        throw new ApiError(
          "Bon de livraison must belong to the same société",
          400,
        );
      }
      if (clientId && bl.document.clientId && bl.document.clientId !== parseInt(clientId)) {
        throw new ApiError(
          "Facture client must match the bon de livraison client",
          400,
        );
      }
      // Prefer BL client when not explicitly provided
      if (!clientId && bl.document.clientId) {
        client = await validateClientAccess(bl.document.clientId, user);
        societeId = client.societeId;
      }
    }

    const documentNumber = await generateDocumentNumber(
      societeId,
      config.prefix,
      config.key,
    );

    try {
      const created = await prisma.$transaction(async (tx) => {
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

        const clientDocument = await tx.clientDocument.create({
          data: {
            societeId,
            clientId: client?.id || null,
            clientName: client ? null : clientName || null,
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

        await createExtensionRecord(tx, config, clientDocument.id, body);

        await tx.clientDocumentLine.createMany({
          data: linesWithFinancials.map((line) => ({
            ...line,
            documentId: clientDocument.id,
          })),
        });

        return tx[config.prismaModel].findUnique({
          where: { id: clientDocument.id },
          include: extensionInclude(config),
        });
      });

      return created;
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

    // Factures are locked after creation — only status toggle is allowed
    if (config.key === "facture") {
      const keys = Object.keys(body || {}).filter(
        (k) => body[k] !== undefined && body[k] !== null,
      );
      const disallowed = keys.filter((k) => k !== "status");
      if (disallowed.length > 0) {
        throw new ApiError(
          "Facture is not editable. Only status can be changed.",
          400,
        );
      }
      if (body.status === undefined) {
        throw new ApiError("Nothing to update", 400);
      }
    }

    const {
      clientId,
      clientName,
      lines,
      notes,
      internalNotes,
      status,
    } = body;

    if (lines !== undefined) {
      validateLinesStructure(lines, { requirePrices: !config.hidePrices });
    }

    let client = null;
    if (clientId !== undefined && clientId !== null) {
      client = await validateClientAccess(parseInt(clientId), user);
      if (client.societeId !== existing.document.societeId) {
        throw new ApiError("Client must belong to the same société", 400);
      }
    }

    try {
      return await prisma.$transaction(async (tx) => {
        const documentData = {};

        if (clientId !== undefined) {
          documentData.clientId = client ? client.id : null;
        }
        if (clientName !== undefined) {
          documentData.clientName = client ? null : clientName || null;
        }
        if (notes !== undefined) documentData.notes = notes || null;
        if (internalNotes !== undefined)
          documentData.internalNotes = internalNotes || null;
        if (status !== undefined) {
          if (!["DRAFT", "COMPLETED", "CONFIRMED", "CANCELLED"].includes(status)) {
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

          await tx.clientDocumentLine.deleteMany({
            where: { documentId: id },
          });
          await tx.clientDocumentLine.createMany({
            data: linesWithFinancials.map((line) => ({
              ...line,
              documentId: id,
            })),
          });
        }

        if (Object.keys(documentData).length > 0) {
          await tx.clientDocument.update({
            where: { id },
            data: documentData,
          });
        }

        await updateExtensionRecord(tx, config, id, body);

        return tx[config.prismaModel].findUnique({
          where: { id },
          include: extensionInclude(config),
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
      await prisma.clientDocument.delete({ where: { id } });
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
    return generateDocumentPDF(row, {
      ...config.pdf,
      hidePrices: config.hidePrices,
    });
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

export default createSalesDocumentService;
