import prisma from "../../loaders/prisma.js";
import PDFDocument from "pdfkit";
import {
  formatDate,
  formatDateTime,
  formatNumber,
} from "../utils/pdfGenerator.js";
import ApiError from "../utils/apiError.js";
import timeRange from "../utils/timeRangeUtility.js";
import productVisibility from "../utils/productVisibilityUtility.js";

/* ============================================================
   STOCK TRANSACTION SERVICE
   v6.0 — aligned with full return document architecture

   documentType filter values → schema mapping:
   ─────────────────────────────────────────────────────────
   BON_LIVRAISON          → transactionType OUTBOUND
                            source: bonLivraisonId → BonLivraison → ClientDocument → Client
   BON_RETOUR_CLIENT      → transactionType RETURN_IN
                            source: bonRetourClientId → BonRetourClient → ClientDocument → Client
   BON_RECEPTION          → transactionType INBOUND
                            source: bonReceptionId → BonReception → FournisseurDocument → Fournisseur
   BON_RETOUR_FOURNISSEUR → transactionType RETURN_OUT
                            source: bonRetourFournisseurId → BonRetourFournisseur → FournisseurDocument → Fournisseur
   INVENTORY              → transactionType ADJUSTMENT  (inventoryId is set)
   TRANSFER               → transactionType TRANSFER_IN or TRANSFER_OUT
   ADJUSTMENT             → transactionType ADJUSTMENT or DAMAGED  (inventoryId is null — manual)
============================================================ */

/* ============================================================
   CONSTANTS
============================================================ */

// Maps documentType filter values → Prisma WHERE fragments
const DOCUMENT_TYPE_FILTER = {
  BON_LIVRAISON: {
    transactionType: "OUTBOUND",
    bonLivraisonId: { not: null },
  },
  BON_RETOUR_CLIENT: {
    transactionType: "RETURN_IN",
    bonRetourClientId: { not: null },
  },
  BON_RECEPTION: {
    transactionType: "INBOUND",
    bonReceptionId: { not: null },
  },
  BON_RETOUR_FOURNISSEUR: {
    transactionType: "RETURN_OUT",
    bonRetourFournisseurId: { not: null },
  },
  INVENTORY: {
    transactionType: "ADJUSTMENT",
    inventoryId: { not: null },
  },
  TRANSFER: {
    transactionType: { in: ["TRANSFER_IN", "TRANSFER_OUT"] },
  },
  // Manual adjustment / damaged — no source doc
  ADJUSTMENT: {
    transactionType: { in: ["ADJUSTMENT", "DAMAGED"] },
    inventoryId: null,
  },
};

// Human-readable labels per transaction type
const TRANSACTION_LABELS = {
  OUTBOUND: {
    label: "Bon Livraison",
    labelAr: "وصل التسليم",
    direction: "SORTIE",
    color: "#EF4444",
  },
  RETURN_IN: {
    label: "Retour Client",
    labelAr: "إرجاع العميل",
    direction: "ENTREE",
    color: "#3B82F6",
  },
  INBOUND: {
    label: "Bon Réception",
    labelAr: "وصل الاستلام",
    direction: "ENTREE",
    color: "#10B981",
  },
  RETURN_OUT: {
    label: "Retour Fournisseur",
    labelAr: "إرجاع المورد",
    direction: "SORTIE",
    color: "#F59E0B",
  },
  ADJUSTMENT: {
    label: "Ajustement Inventaire",
    labelAr: "تعديل المخزون",
    direction: "BOTH",
    color: "#8B5CF6",
  },
  TRANSFER_OUT: {
    label: "Transfert Sortie",
    labelAr: "تحويل خروج",
    direction: "SORTIE",
    color: "#F97316",
  },
  TRANSFER_IN: {
    label: "Transfert Entrée",
    labelAr: "تحويل دخول",
    direction: "ENTREE",
    color: "#06B6D4",
  },
  DAMAGED: {
    label: "Perte / Détérioré",
    labelAr: "تلف أو خسارة",
    direction: "SORTIE",
    color: "#DC2626",
  },
};

/* ============================================================
   HELPER: Build Prisma WHERE clause from filters
============================================================ */

const buildWhereClause = (filters, user) => {
  const {
    societeId,
    depotId,
    familyId,
    articleId,
    variantId,
    documentType,
    movement,
    startDate,
    endDate,
    clientId,
    fournisseurId,
  } = filters;

  // ── Société / auth scope ────────────────────────────────
  let societeScope;

  if (user.isSuperAdmin && societeId) {
    societeScope = {
      depot: {
        societeId: parseInt(societeId),
      },
    };
  } else if (!user.isSuperAdmin) {
    societeScope = {
      depot: {
        societeId: user.societeId,
      },
    };
  } else {
    societeScope = {};
  }

  const where = { ...societeScope };

  // ── Depot ───────────────────────────────────────────────
  if (depotId) {
    where.depotId = parseInt(depotId);
  }

  // ── Product filters ─────────────────────────────────────
  if (articleId) {
    where.articleId = parseInt(articleId);
  }

  if (variantId) {
    where.variantId = parseInt(variantId);
  }

  // ── Family filter ───────────────────────────────────────
  if (familyId) {
    const fid = parseInt(familyId);

    where.OR = [
      ...(where.OR || []),
      { article: { familyId: fid } },
      { variant: { article: { familyId: fid } } },
    ];
  }

  // ── Visible products only ───────────────────────────────
  where.AND = [
    ...(where.AND || []),
    {
      OR: [{ articleId: null }, { article: { visible: true } }],
    },
    {
      OR: [{ variantId: null }, { variant: { article: { visible: true } } }],
    },
  ];

  // ── Document type ───────────────────────────────────────
  if (documentType && DOCUMENT_TYPE_FILTER[documentType]) {
    Object.assign(where, DOCUMENT_TYPE_FILTER[documentType]);
  }

  // ── Movement ────────────────────────────────────────────
  if (movement === "ENTREE") {
    where.quantityChange = { gt: 0 };
  } else if (movement === "SORTIE") {
    where.quantityChange = { lt: 0 };
  }

  // ── Date range ──────────────────────────────────────────
  if (startDate || endDate) {
    where.createdAt = {};

    if (startDate) {
      const start = new Date(startDate);

      // If only a date was supplied, start at beginning of day
      if (!/[T ]\d{2}:\d{2}/.test(startDate)) {
        start.setHours(0, 0, 0, 0);
      }

      where.createdAt.gte = start;
    }

    if (endDate) {
      const end = new Date(endDate);

      // If only a date was supplied, include the whole day
      if (!/[T ]\d{2}:\d{2}/.test(endDate)) {
        end.setHours(23, 59, 59, 999);
      }

      where.createdAt.lte = end;
    }
  }

  // ── Client filter ───────────────────────────────────────
  if (clientId) {
    const cid = parseInt(clientId);

    where.OR = [
      ...(where.OR || []),
      {
        bonLivraison: {
          document: {
            clientId: cid,
          },
        },
      },
      {
        bonRetourClient: {
          document: {
            clientId: cid,
          },
        },
      },
    ];
  }

  // ── Fournisseur filter ──────────────────────────────────
  if (fournisseurId) {
    const fid = parseInt(fournisseurId);

    where.OR = [
      ...(where.OR || []),
      {
        bonReception: {
          document: {
            fournisseurId: fid,
          },
        },
      },
      {
        bonRetourFournisseur: {
          document: {
            fournisseurId: fid,
          },
        },
      },
    ];
  }

  return where;
};

/* ============================================================
   HELPER: Prisma include block — all source documents
============================================================ */

const TRANSACTION_INCLUDE = {
  depot: {
    select: { id: true, code: true, name: true },
  },
  article: {
    select: {
      id: true,
      barcode: true,
      name: true,
      prixAchat: true,
      prixVente1: true,
      unitePrincipale: { select: { symbol: true } },
      family: {
        select: {
          id: true,
          name: true,
          category: { select: { id: true, name: true } },
        },
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
          prixVente1: true,
          unitePrincipale: { select: { symbol: true } },
          family: {
            select: {
              id: true,
              name: true,
              category: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  },
  user: { select: { id: true, name: true } },

  // ── Transfer ─────────────────────────────────────────────
  transfer: {
    select: {
      id: true,
      transferNumber: true,
      sourceDepot: { select: { id: true, code: true, name: true } },
      destinationDepot: { select: { id: true, code: true, name: true } },
    },
  },

  // ── Inventory ────────────────────────────────────────────
  inventory: {
    select: { id: true, inventoryNumber: true, inventoryDate: true },
  },

  // ── BonLivraison → ClientDocument → Client ───────────────
  bonLivraison: {
    select: {
      id: true,
      documentDate: true,
      document: {
        select: {
          id: true,
          documentNumber: true,
          client: { select: { id: true, name: true } },
        },
      },
    },
  },

  // ── BonRetourClient → ClientDocument → Client ────────────
  bonRetourClient: {
    select: {
      id: true,
      documentDate: true,
      document: {
        select: {
          id: true,
          documentNumber: true,
          client: { select: { id: true, name: true } },
        },
      },
    },
  },

  // ── BonReception → FournisseurDocument → Fournisseur ─────
  bonReception: {
    select: {
      id: true,
      documentDate: true,
      document: {
        select: {
          id: true,
          documentNumber: true,
          fournisseur: { select: { id: true, name: true } },
        },
      },
    },
  },

  // ── BonRetourFournisseur → FournisseurDocument → Fournisseur ──
  bonRetourFournisseur: {
    select: {
      id: true,
      documentDate: true,
      document: {
        select: {
          id: true,
          documentNumber: true,
          fournisseur: { select: { id: true, name: true } },
        },
      },
    },
  },
};

/* ============================================================
   HELPER: Enrich a raw transaction row into display shape
============================================================ */

const enrichTransaction = (txn) => {
  const typeInfo = TRANSACTION_LABELS[txn.transactionType] || {
    label: txn.transactionType,
    direction: "BOTH",
    color: "#6B7280",
  };

  const quantityChange = parseFloat(txn.quantityChange);
  const nature = quantityChange > 0 ? "ENTREE" : "SORTIE";

  // ── Resolve source document ────────────────────────────
  let referenceDocument = null;
  let clientOrFournisseur = null;

  if (txn.bonLivraison) {
    referenceDocument = {
      type: "BON_LIVRAISON",
      number: txn.bonLivraison.document?.documentNumber,
      date: txn.bonLivraison.documentDate,
    };
    clientOrFournisseur = txn.bonLivraison.document?.client
      ? { type: "client", ...txn.bonLivraison.document.client }
      : null;
  } else if (txn.bonRetourClient) {
    referenceDocument = {
      type: "BON_RETOUR_CLIENT",
      number: txn.bonRetourClient.document?.documentNumber,
      date: txn.bonRetourClient.documentDate,
    };
    clientOrFournisseur = txn.bonRetourClient.document?.client
      ? { type: "client", ...txn.bonRetourClient.document.client }
      : null;
  } else if (txn.bonReception) {
    referenceDocument = {
      type: "BON_RECEPTION",
      number: txn.bonReception.document?.documentNumber,
      date: txn.bonReception.documentDate,
    };
    clientOrFournisseur = txn.bonReception.document?.fournisseur
      ? { type: "fournisseur", ...txn.bonReception.document.fournisseur }
      : null;
  } else if (txn.bonRetourFournisseur) {
    referenceDocument = {
      type: "BON_RETOUR_FOURNISSEUR",
      number: txn.bonRetourFournisseur.document?.documentNumber,
      date: txn.bonRetourFournisseur.documentDate,
    };
    clientOrFournisseur = txn.bonRetourFournisseur.document?.fournisseur
      ? {
          type: "fournisseur",
          ...txn.bonRetourFournisseur.document.fournisseur,
        }
      : null;
  } else if (txn.transfer) {
    const isOut = txn.transactionType === "TRANSFER_OUT";
    referenceDocument = {
      type: "TRANSFER",
      number: txn.transfer.transferNumber,
      fromDepot: txn.transfer.sourceDepot,
      toDepot: txn.transfer.destinationDepot,
    };
    clientOrFournisseur = null;
  } else if (txn.inventory) {
    referenceDocument = {
      type: "INVENTORY",
      number: txn.inventory.inventoryNumber,
      date: txn.inventory.inventoryDate,
    };
    clientOrFournisseur = null;
  } else {
    referenceDocument = {
      type: "ADJUSTMENT",
      number: txn.referenceId || null,
    };
    clientOrFournisseur = null;
  }

  // ── Resolve product info ───────────────────────────────
  let productName, barcode, unitSymbol, prixAchat, prixVente1, family;

  if (txn.article) {
    productName = txn.article.name;
    barcode = txn.article.barcode;
    unitSymbol = txn.article.unitePrincipale?.symbol;
    prixAchat = parseFloat(txn.article.prixAchat);
    prixVente1 = parseFloat(txn.article.prixVente1);
    family = txn.article.family;
  } else if (txn.variant) {
    productName = txn.variant.name;
    barcode = txn.variant.barcode;
    unitSymbol = txn.variant.article?.unitePrincipale?.symbol;
    prixAchat = parseFloat(txn.variant.article?.prixAchat ?? 0);
    prixVente1 = parseFloat(txn.variant.article?.prixVente1 ?? 0);
    family = txn.variant.article?.family;
  }

  // Unit price depends on direction:
  // ENTREE (INBOUND / RETURN_IN / TRANSFER_IN) → prixAchat
  // SORTIE (OUTBOUND / RETURN_OUT / TRANSFER_OUT) → prixVente1
  const unitPrice = nature === "ENTREE" ? prixAchat : prixVente1;
  const totalValue = unitPrice ? Math.abs(quantityChange) * unitPrice : null;

  return {
    id: txn.id,
    date: txn.createdAt,
    transactionType: txn.transactionType,
    typeLabel: typeInfo.label,
    nature, // ENTREE | SORTIE
    color: typeInfo.color,
    depot: txn.depot,
    productName,
    barcode,
    unitSymbol,
    prixAchat,
    prixVente1,
    unitPrice,
    totalValue,
    family,
    quantity: quantityChange, // signed (negative = SORTIE)
    quantityAbs: Math.abs(quantityChange),
    cumul: parseFloat(txn.quantityAfter), // running total stored in DB
    referenceDocument,
    clientOrFournisseur,
    reason: txn.reason,
    createdBy: txn.user,
    createdAt: txn.createdAt,
  };
};

/* ============================================================
   GET STOCK MOVEMENTS
============================================================ */

export const getStockMovements = async (filters, user) => {
  const where = buildWhereClause(filters, user);
  const transactions = await prisma.stockTransaction.findMany({
    where,
    include: TRANSACTION_INCLUDE,
    orderBy: { createdAt: "asc" }, // chronological for running total
  });
  const allEnriched = transactions.map(enrichTransaction);

  // Apply system hour boundaries (consistent with BonLivraison and other services)
  const enriched = await timeRange.filterBySystemHours(allEnriched);

  // ── Summary ────────────────────────────────────────────
  let totalEntree = 0;
  let totalSortie = 0;
  let totalValueEntree = 0;
  let totalValueSortie = 0;

  for (const t of enriched) {
    if (t.nature === "ENTREE") {
      totalEntree += t.quantityAbs;
      totalValueEntree += t.totalValue ?? 0;
    } else {
      totalSortie += t.quantityAbs;
      totalValueSortie += t.totalValue ?? 0;
    }
  }

  const finalCumul =
    enriched.length > 0 ? enriched[enriched.length - 1].cumul : 0;

  // Format date only (dd/MM/yyyy)
  const fmtDate = (d) =>
    d
      ? new Date(d).toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : null;

  // Format date + time (dd/MM/yyyy HH:mm)
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

  // Transform data
  const data = enriched.map((t) => ({
    ...t,
    date: fmtDate(t.date), // only date
    createdAt: fmtDateTime(t.createdAt), // date + hour + minute
  }));

  return {
    results: data.length,
    data,
    summary: {
      totalTransactions: enriched.length,
      totalEntree,
      totalSortie,
      finalCumul,
      totalValueEntree: parseFloat(totalValueEntree.toFixed(2)),
      totalValueSortie: parseFloat(totalValueSortie.toFixed(2)),
      netValue: parseFloat((totalValueEntree - totalValueSortie).toFixed(2)),
    },
  };
};

/* ============================================================
   PDF HELPERS
============================================================ */

/* ── Draw Header ─────────────────────────────────────────── */
const _drawHeader = (doc, reportInfo) => {
  const pageWidth = doc.page.width;
  const margin = 50;

  doc
    .fontSize(18)
    .font("Helvetica-Bold")
    .text("RAPPORT DE MOUVEMENTS DE STOCK", margin, 50, {
      align: "center",
      width: pageWidth - 2 * margin,
    });
  doc.moveDown(1);

  doc.fontSize(9).font("Helvetica");

  if (reportInfo.product)
    doc.text(`Produit: ${reportInfo.product}`, margin, doc.y);
  if (reportInfo.depot) doc.text(`Dépôt: ${reportInfo.depot}`, margin, doc.y);
  if (reportInfo.family)
    doc.text(`Famille: ${reportInfo.family}`, margin, doc.y);
  if (reportInfo.documentType)
    doc.text(`Type de document: ${reportInfo.documentType}`, margin, doc.y);
  if (reportInfo.movement)
    doc.text(`Type de mouvement: ${reportInfo.movement}`, margin, doc.y);
  if (reportInfo.startDate || reportInfo.endDate)
    doc.text(
      `Période: ${reportInfo.startDate || "..."} - ${reportInfo.endDate || "..."}`,
      margin,
      doc.y,
    );
  if (reportInfo.hourRange)
    doc.text(`Plage horaire: ${reportInfo.hourRange}`, margin, doc.y);

  doc.text(`Date d'impression: ${formatDateTime(new Date())}`, margin, doc.y);

  doc
    .moveDown(1)
    .strokeColor("#cccccc")
    .lineWidth(1)
    .moveTo(margin, doc.y)
    .lineTo(pageWidth - margin, doc.y)
    .stroke();

  doc.moveDown(1);
};

/* ── Draw Table Header ───────────────────────────────────── */
const _drawTableHeader = (doc) => {
  const margin = 50;
  const startY = doc.y;

  const columns = {
    date: { x: margin, width: 60 },
    reference: { x: margin + 65, width: 70 },
    type: { x: margin + 140, width: 55 },
    depot: { x: margin + 200, width: 60 },
    client: { x: margin + 265, width: 70 },
    product: { x: margin + 340, width: 80 },
    quantity: { x: margin + 425, width: 45 },
    nature: { x: margin + 475, width: 40 },
    cumul: { x: margin + 520, width: 45 },
  };

  doc
    .rect(margin - 5, startY - 5, doc.page.width - 2 * margin + 10, 20)
    .fill("#f0f0f0");

  doc.fillColor("#000000").fontSize(8).font("Helvetica-Bold");

  doc.text("Date", columns.date.x, startY, { width: columns.date.width });
  doc.text("Référence", columns.reference.x, startY, {
    width: columns.reference.width,
  });
  doc.text("Type", columns.type.x, startY, { width: columns.type.width });
  doc.text("Dépôt", columns.depot.x, startY, { width: columns.depot.width });
  doc.text("Client/Fourn.", columns.client.x, startY, {
    width: columns.client.width,
  });
  doc.text("Produit", columns.product.x, startY, {
    width: columns.product.width,
  });
  doc.text("Qté", columns.quantity.x, startY, {
    width: columns.quantity.width,
    align: "right",
  });
  doc.text("Nature", columns.nature.x, startY, { width: columns.nature.width });
  doc.text("Cumul", columns.cumul.x, startY, {
    width: columns.cumul.width,
    align: "right",
  });

  doc.moveDown(1.5);

  return columns;
};

/* ── Document type abbreviations ─────────────────────────── */
// Keyed by BOTH documentType filter values AND transactionType enum values
// so the lookup works regardless of which field is present on the row object.
const _TYPE_ABBR = {
  // documentType filter values (BON_RETOUR_CLIENT etc.)
  BON_LIVRAISON: "BL",
  BON_RECEPTION: "BR",
  BON_RETOUR_CLIENT: "BRC",
  BON_RETOUR_FOURNISSEUR: "BRF",
  INVENTORY: "INV",
  TRANSFER: "TRF",
  ADJUSTMENT: "ADJ",
  // transactionType enum values (what enrichTransaction actually stores)
  OUTBOUND: "BL",
  INBOUND: "BR",
  RETURN_IN: "BRC",
  RETURN_OUT: "BRF",
  TRANSFER_OUT: "TRF",
  TRANSFER_IN: "TRF",
  DAMAGED: "ADJ",
};

/* ── Draw Table Row ──────────────────────────────────────── */
const _drawTableRow = (
  doc,
  transaction,
  columns,
  isAlternate,
  skipPageCheck = false,
) => {
  const margin = 50;
  const startY = doc.y;
  const rowHeight = 25;

  if (!skipPageCheck && startY + rowHeight > doc.page.height - 140) {
    doc.addPage();
    const newColumns = _drawTableHeader(doc);
    return _drawTableRow(doc, transaction, newColumns, isAlternate, true);
  }

  if (isAlternate) {
    doc
      .rect(margin - 5, startY - 2, doc.page.width - 2 * margin + 10, rowHeight)
      .fill("#fafafa");
  }

  doc.fillColor("#000000").fontSize(7).font("Helvetica");

  doc.text(transaction.date, columns.date.x, startY, {
    width: columns.date.width,
  });

  doc.text(
    String(
      transaction.referenceDocument?.number ||
        transaction.referenceDocument ||
        "-",
    ).substring(0, 12),
    columns.reference.x,
    startY,
    { width: columns.reference.width },
  );

  doc.text(
    _TYPE_ABBR[transaction.type] ||
      _TYPE_ABBR[transaction.transactionType] ||
      transaction.transactionType ||
      "-",
    columns.type.x,
    startY,
    { width: columns.type.width },
  );

  doc.text(
    transaction.depot?.code ||
      String(transaction.depot?.name || "-").substring(0, 10),
    columns.depot.x,
    startY,
    { width: columns.depot.width },
  );

  doc.text(
    String(
      transaction.clientOrFournisseur?.name ||
        transaction.clientOrFournisseur ||
        "-",
    ).substring(0, 20),
    columns.client.x,
    startY,
    { width: columns.client.width },
  );

  doc.text(
    String(transaction.productName || "-").substring(0, 40),
    columns.product.x,
    startY,
    { width: columns.product.width },
  );

  // Quantity — green for ENTREE, dark red for SORTIE
  doc.fillColor(
    transaction.nature === "ENTREE" || transaction.nature === "Augmenter"
      ? "#006400"
      : "#8B0000",
  );
  doc.text(formatNumber(transaction.quantity, 2), columns.quantity.x, startY, {
    width: columns.quantity.width,
    align: "right",
  });

  doc.fillColor("#000000");
  doc.text(
    transaction.nature === "ENTREE" || transaction.nature === "Augmenter"
      ? "Augmenter"
      : "Diminuer",
    columns.nature.x,
    startY,
    { width: columns.nature.width },
  );

  doc.text(formatNumber(transaction.cumul, 2), columns.cumul.x, startY, {
    width: columns.cumul.width,
    align: "right",
  });

  doc.moveDown(1.8);
};

/* ── Draw Summary ────────────────────────────────────────── */
const _drawSummary = (doc, summary) => {
  const margin = 50;
  const pageWidth = doc.page.width;

  if (doc.y > doc.page.height - 150) doc.addPage();

  doc.moveDown(2);

  doc
    .strokeColor("#cccccc")
    .lineWidth(1)
    .moveTo(margin, doc.y)
    .lineTo(pageWidth - margin, doc.y)
    .stroke();

  doc.moveDown(1);
  doc.fontSize(12).font("Helvetica-Bold").text("RÉSUMÉ", margin, doc.y);
  doc.moveDown(0.5);

  const summaryX = pageWidth - 250;
  let y = doc.y;

  const row = (label, value, color = "#000000", isLast = false) => {
    doc
      .fillColor("#000000")
      .font("Helvetica")
      .text(label, summaryX, y, { lineBreak: false });
    doc
      .fillColor(color)
      .font("Helvetica-Bold")
      .text(String(value), summaryX + 120, y, {
        align: "right",
        width: 80,
        lineBreak: isLast ? false : true,
      });
    y += 15;
  };

  row("Total de transactions:", summary.totalTransactions);
  row("Total Augmenter:", summary.totalEntree, "#006400");
  row("Total Diminuer:", summary.totalSortie, "#8B0000");
  row("Cumul final:", formatNumber(summary.finalCumul, 2), "#000000", true);
};

/* ── Draw Footer ─────────────────────────────────────────── */
const _drawFooter = (doc, pageNumber, totalPages) => {
  const margin = 50;
  const pageWidth = doc.page.width;
  doc.save();
  doc
    .fontSize(8)
    .font("Helvetica")
    .text(`Page ${pageNumber} / ${totalPages}`, margin, doc.page.height - 40, {
      align: "center",
      width: pageWidth - 2 * margin,
      lineBreak: false,
    });
  doc.restore();
};

/* ============================================================
   GENERATE STOCK MOVEMENTS PDF
============================================================ */
export const generateStockMovementsPDF = async (filters, user) => {
  const result = await getStockMovements(filters, user);

  if (!result.data || result.data.length === 0) {
    throw new ApiError("No stock movements found for the given filters", 404);
  }

  // ── Resolve report header info ────────────────────────────
  const reportInfo = {};

  if (filters.articleId) {
    const article = await prisma.article.findUnique({
      where: { id: parseInt(filters.articleId) },
      select: { name: true },
    });
    reportInfo.product = article?.name;
  }

  if (filters.variantId) {
    const variant = await prisma.articleVariant.findUnique({
      where: { id: parseInt(filters.variantId) },
      include: {
        article: { select: { name: true } },
        variantAttributes: {
          include: { attributeValue: { select: { value: true } } },
        },
      },
    });
    if (variant) {
      const attributesStr = variant.variantAttributes
        .map((va) => va.attributeValue.value)
        .join(" - ");
      reportInfo.product = attributesStr
        ? `${variant.article.name} (${attributesStr})`
        : variant.article.name;
    }
  }

  if (filters.depotId) {
    const depot = await prisma.depot.findUnique({
      where: { id: parseInt(filters.depotId) },
      select: { name: true, code: true },
    });
    reportInfo.depot = `${depot?.name} (${depot?.code})`;
  }

  if (filters.familyId) {
    const family = await prisma.family.findUnique({
      where: { id: parseInt(filters.familyId) },
      select: { name: true },
    });
    reportInfo.family = family?.name;
  }

  if (filters.documentType) reportInfo.documentType = filters.documentType;
  if (filters.movement) reportInfo.movement = filters.movement;
  if (filters.startDate) reportInfo.startDate = formatDate(filters.startDate);
  if (filters.endDate) reportInfo.endDate = formatDate(filters.endDate);

  // Hour range from timeRangeUtility — "24/7 (No restrictions)" when unrestricted
  reportInfo.hourRange = await timeRange.formatSystemHourRange();

  // ── Build document ────────────────────────────────────────
  const doc = new PDFDocument({
    size: "A4",
    layout: "landscape",
    margin: 50,
    bufferPages: true,
  });

  _drawHeader(doc, reportInfo);
  const columns = _drawTableHeader(doc);

  result.data.forEach((transaction, index) => {
    _drawTableRow(doc, transaction, columns, index % 2 === 1);
  });

  _drawSummary(doc, result.summary);

  // Stamp page numbers on all buffered pages
  doc.flushPages();

  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    _drawFooter(doc, i + 1, range.count);
  }

  return doc;
};

/* ============================================================
   GET UNIFIED PRODUCTS
   Returns paginated articles (without variants) + article variants
   in a single flat list — visible items only, filtered by family/search.
============================================================ */

export const getUnifiedProducts = async ({
  user,
  familyId,
  search,
  page = 1,
  limit = 50,
}) => {
  // ── Scoping: only articles that belong to the user's societe ──
  // Articles are global but we filter stock presence by societe's depots.
  // For simplicity, return all visible articles/variants (global catalog)
  // The caller can add stockByDepot context if needed.

  const articleWhere = {
    visible: true,
    ...(familyId && { familyId }),
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { barcode: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  const variantWhere = {
    article: { visible: true, ...(familyId && { familyId }) },
    ...(search && {
      OR: [
        { name: { contains: search, mode: "insensitive" } },
        { barcode: { contains: search, mode: "insensitive" } },
      ],
    }),
  };

  // Fetch articles that have NO variants (pure articles)
  const [rawArticles, rawVariants, totalArticles, totalVariants] =
    await Promise.all([
      prisma.article.findMany({
        where: { ...articleWhere, variants: { none: {} } },
        select: {
          id: true,
          barcode: true,
          name: true,
          prixAchat: true,
          prixVente1: true,
          gereEnStock: true,
          unitePrincipale: { select: { id: true, name: true, symbol: true } },
          family: { select: { id: true, name: true } },
        },
        orderBy: { name: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.articleVariant.findMany({
        where: variantWhere,
        select: {
          id: true,
          barcode: true,
          name: true,
          article: {
            select: {
              id: true,
              name: true,
              prixAchat: true,
              prixVente1: true,
              gereEnStock: true,
              unitePrincipale: {
                select: { id: true, name: true, symbol: true },
              },
              family: { select: { id: true, name: true } },
            },
          },
          variantAttributes: {
            include: {
              attribute: { select: { id: true, name: true } },
              attributeValue: { select: { id: true, value: true } },
            },
          },
        },
        orderBy: { name: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.article.count({
        where: { ...articleWhere, variants: { none: {} } },
      }),
      prisma.articleVariant.count({ where: variantWhere }),
    ]);

  const articles = rawArticles.map((a) => ({
    type: "article",
    id: a.id,
    barcode: a.barcode,
    name: a.name,
    prixAchat: parseFloat(a.prixAchat),
    prixVente1: parseFloat(a.prixVente1),
    gereEnStock: a.gereEnStock,
    unite: a.unitePrincipale,
    family: a.family,
    articleId: a.id,
    variantId: null,
    attributes: [],
  }));

  const variants = rawVariants.map((v) => ({
    type: "variant",
    id: v.id,
    barcode: v.barcode,
    name: v.name,
    prixAchat: parseFloat(v.article.prixAchat),
    prixVente1: parseFloat(v.article.prixVente1),
    gereEnStock: v.article.gereEnStock,
    unite: v.article.unitePrincipale,
    family: v.article.family,
    articleId: v.article.id,
    variantId: v.id,
    parentArticleName: v.article.name,
    attributes: v.variantAttributes.map((va) => ({
      attributeId: va.attributeId,
      attributeName: va.attribute.name,
      attributeValueId: va.attributeValueId,
      attributeValue: va.attributeValue.value,
    })),
  }));

  // Merge and sort alphabetically
  const products = [...articles, ...variants].sort((a, b) =>
    a.name.localeCompare(b.name),
  );

  const total = totalArticles + totalVariants;

  return {
    products,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
};

export default {
  getStockMovements,
  generateStockMovementsPDF,
  getUnifiedProducts,
};
