import prisma from "../../loaders/prisma.js";
import ApiError from "../utils/apiError.js";
import ApiFeatures from "../utils/apiFeatures.js";
import timeRangeUtility from "../utils/timeRangeUtility.js";
import productVisibilityUtility from "../utils/productVisibilityUtility.js";
import stockManagementService from "./domain/stockManagementService.js";
import stockValidationService from "./domain/stockValidationService.js";
import { generateDocumentPDF, formatDate } from "../utils/pdfGenerator.js";
/* ============================================================
   HELPER: Generate Document Number (private)
   Format: BL-{YEAR}-{6-digit-sequence}
   Sequence is per-société per-year, resets every January.
============================================================ */
const generateDocumentNumber = async (societeId) => {
  const year = new Date().getFullYear();
  const prefix = `BL-${year}`;

  const lastDoc = await prisma.clientDocument.findFirst({
    where: {
      societeId,
      documentNumber: { startsWith: prefix },
      bonLivraison: { isNot: null },
    },
    orderBy: { documentNumber: "desc" },
    select: { documentNumber: true },
  });

  let nextNumber = 1;
  if (lastDoc) {
    // "BL-2026-000003" → split on "-" → [BL, 2026, 000003] → parseInt → 3
    nextNumber = parseInt(lastDoc.documentNumber.split("-")[2]) + 1;
  }

  // ✅ FIX: 6-digit padding (was 4)
  return `${prefix}-${String(nextNumber).padStart(6, "0")}`;
};

/* ============================================================
   GET NEXT DOCUMENT NUMBER (exported — used by controller)
   Resolves societeId from user context, then delegates to helper.
============================================================ */
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
  const prefix = `BL-${year}`;

  const lastDoc = await prisma.clientDocument.findFirst({
    where: {
      societeId,
      documentNumber: { startsWith: prefix },
      bonLivraison: { isNot: null },
    },
    orderBy: { documentNumber: "desc" },
    select: { documentNumber: true },
  });

  let nextSequence = 1;
  if (lastDoc) {
    nextSequence = parseInt(lastDoc.documentNumber.split("-")[2]) + 1;
  }

  return {
    nextNumber: `${prefix}-${String(nextSequence).padStart(6, "0")}`,
    year,
    sequence: nextSequence,
  };
};

/* ============================================================
   HELPER: Validate Client Access
============================================================ */
const validateClientAccess = async (clientId, user) => {
  const client = await prisma.client.findFirst({
    where: {
      id: clientId,
      ...(user.isSuperAdmin ? {} : { societeId: user.societeId }),
    },
    select: { id: true, name: true, societeId: true, active: true },
  });

  if (!client) throw new ApiError("Client not found or access denied", 404);
  if (!client.active)
    throw new ApiError("Cannot create delivery for inactive client", 400);

  return client;
};

/* ============================================================
   HELPER: Validate Depot Access
============================================================ */
const validateDepotAccess = async (depotId, user) => {
  if (!depotId) throw new ApiError("Depot is required for BonLivraison", 400);

  const depot = await prisma.depot.findFirst({
    where: {
      id: depotId,
      ...(user.isSuperAdmin ? {} : { societeId: user.societeId }),
    },
    select: { id: true, code: true, name: true, societeId: true, active: true },
  });

  if (!depot) throw new ApiError("Depot not found or access denied", 404);
  if (!depot.active)
    throw new ApiError("Cannot create delivery from inactive depot", 400);

  return depot;
};

/* ============================================================
   HELPER: Validate Lines (structure + visibility)
============================================================ */
const validateLines = async (lines) => {
  if (!Array.isArray(lines) || lines.length === 0) {
    throw new ApiError("At least one line is required", 400);
  }

  const seenProducts = new Set();

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

    if (seenProducts.has(key)) {
      throw new ApiError(`Line ${index + 1}: Duplicate product`, 400);
    }
    seenProducts.add(key);

    if (!line.quantity || parseFloat(line.quantity) <= 0) {
      throw new ApiError(
        `Line ${index + 1}: Quantity must be greater than 0`,
        400,
      );
    }

    if (!line.unitPrice || parseFloat(line.unitPrice) <= 0) {
      throw new ApiError(
        `Line ${index + 1}: Unit price (TTC) must be greater than 0`,
        400,
      );
    }

    if (
      line.priceField !== undefined &&
      !["prixVente1", "prixVente2", "prixVente3"].includes(line.priceField)
    ) {
      throw new ApiError(
        `Line ${index + 1}: priceField must be prixVente1, prixVente2, or prixVente3`,
        400,
      );
    }
  });

  await productVisibilityUtility.validateBatchProductVisibility(
    lines.map((line) => ({
      articleId: line.articleId,
      variantId: line.variantId,
    })),
    "bon livraison",
  );
};

/* ============================================================
   HELPER: Resolve article for a line (returns full article with family)
   Used in create() for price validation and TVA lookup.
============================================================ */
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

/* ============================================================
   HELPER: Calculate Line Financials from TTC Input
   
   unitPrice input = TTC (already includes TVA)
   
   Formula:
     totalTTC             = unitPriceTTC × quantity × (1 − discount/100)
     totalHT              = totalTTC / (1 + TVA/100)
     totalTVA             = totalTTC − totalHT
   
   What is stored:
     unitPrice  = unitPriceTTC   (TTC as entered — mirrors prixVente in DB)  ✅ FIX
     totalHT    = back-calculated HT
     tvaRate    = TVA decimal from family (e.g. 0.20)
     totalTVA   = calculated TVA amount
     totalTTC   = after discount
============================================================ */
const calculateLineFinancialsFromTTC = (line, tvaRate) => {
  const quantity = parseFloat(line.quantity);
  const unitPriceTTC = parseFloat(line.unitPrice); // ✅ TTC as entered
  const remise = parseFloat(line.remise || 0);
  const tva = parseFloat(tvaRate); // e.g. 0.20

  const totalTTC = quantity * unitPriceTTC;
  const discountAmount = (totalTTC * remise) / 100;
  const totalTTCAfterDiscount = totalTTC - discountAmount;

  const totalHT = totalTTCAfterDiscount / (1 + tva); // tva is already decimal
  const totalTVA = totalTTCAfterDiscount - totalHT;

  return {
    unitPriceTTC: parseFloat(unitPriceTTC.toFixed(2)), // ✅ returned for storage
    totalHT: parseFloat(totalHT.toFixed(2)),
    totalTVA: parseFloat(totalTVA.toFixed(2)),
    totalTTC: parseFloat(totalTTCAfterDiscount.toFixed(2)),
  };
};

/* ============================================================
   HELPER: Categorize Lines by Stock Management
============================================================ */
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

/* ============================================================
   HELPER: Validate Pack Lines Input Structure
============================================================ */
const validatePackLinesInput = (packLines) => {
  const seen = new Set();
  packLines.forEach((line, i) => {
    if (!line.packId)
      throw new ApiError(`Pack line ${i + 1}: packId is required`, 400);
    if (seen.has(line.packId))
      throw new ApiError(
        `Pack line ${i + 1}: Duplicate packId ${line.packId}`,
        400,
      );
    seen.add(line.packId);
    if (!line.quantity || parseFloat(line.quantity) <= 0)
      throw new ApiError(`Pack line ${i + 1}: quantity must be > 0`, 400);
    if (line.prixVente === undefined || parseFloat(line.prixVente) < 0)
      throw new ApiError(`Pack line ${i + 1}: prixVente must be >= 0`, 400);
  });
};

/* ============================================================
   HELPER: Fetch Packs with Components + Validate Component Stock

   Returns enriched packLines array with resolved pack data.
   Aggregates component stock needs across all packs and validates
   availability. Pass excludeBonLivraisonId when updating so the
   BL's own prior reservations don't count against it.
============================================================ */
const fetchAndValidatePackLines = async (
  packLines,
  depotId,
  user,
  excludeBonLivraisonId = null,
) => {
  if (!packLines || packLines.length === 0) return [];

  const result = [];
  const componentStockMap = new Map();

  for (const packLine of packLines) {
    const pack = await prisma.pack.findFirst({
      where: {
        id: parseInt(packLine.packId),
        active: true,
        ...(user.isSuperAdmin ? {} : { societeId: user.societeId }),
      },
      include: {
        components: {
          include: {
            article: { select: { id: true, name: true, gereEnStock: true } },
            variant: {
              select: {
                id: true,
                name: true,
                article: { select: { gereEnStock: true } },
              },
            },
          },
        },
      },
    });

    if (!pack)
      throw new ApiError(`Pack ${packLine.packId} not found or inactive`, 404);

    const purchasePrice = parseFloat(pack.purchasePrice || 0);
    if (parseFloat(packLine.prixVente) < purchasePrice) {
      throw new ApiError(
        `Pack "${pack.name}": prixVente ${parseFloat(packLine.prixVente).toFixed(2)} cannot be below purchase price ${purchasePrice.toFixed(2)}`,
        400,
      );
    }

    result.push({
      packId: parseInt(packLine.packId),
      quantity: parseFloat(packLine.quantity),
      prixVente: parseFloat(packLine.prixVente),
      pack,
    });

    // Aggregate component stock needs (same component may appear across packs)
    for (const comp of pack.components) {
      const gereEnStock = comp.articleId
        ? comp.article?.gereEnStock
        : comp.variant?.article?.gereEnStock;
      if (!gereEnStock) continue;

      const key = comp.articleId
        ? `a_${comp.articleId}`
        : `v_${comp.variantId}`;
      const neededQty =
        parseFloat(packLine.quantity) * parseFloat(comp.quantity);
      if (componentStockMap.has(key)) {
        componentStockMap.get(key).quantity += neededQty;
      } else {
        componentStockMap.set(key, {
          depotId: parseInt(depotId),
          articleId: comp.articleId || null,
          variantId: comp.variantId || null,
          quantity: neededQty,
        });
      }
    }
  }

  const needs = [...componentStockMap.values()];
  if (needs.length > 0) {
    await stockValidationService.validateBatchStockAvailabilityForBonLivraison(
      needs,
      "bon livraison (pack components)",
      excludeBonLivraisonId,
    );
  }

  return result;
};

/* ============================================================
   HELPER: Full Prisma include block (reused across read operations)
============================================================ */
const FULL_BL_INCLUDE = {
  document: {
    include: {
      client: {
        select: { id: true, name: true, type: true, phone: true, email: true },
      },
      lines: {
        include: {
          article: {
            select: {
              id: true,
              barcode: true,
              name: true,
              gereEnStock: true,
              prixVente1: true,
              prixVente2: true,
              prixVente3: true,
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
  depot: { select: { id: true, code: true, name: true } },
  delivery: { select: { id: true, name: true, tel: true } },
  commande: {
    select: {
      id: true,
      document: { select: { documentNumber: true } },
    },
  },
  stockTransactions: {
    include: {
      article: { select: { id: true, name: true } },
      variant: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  },
  packLines: {
    include: {
      pack: {
        select: {
          id: true,
          name: true,
          barcode: true,
          prixVentePack: true,
          purchasePrice: true,
          components: {
            include: {
              article: {
                select: {
                  id: true,
                  name: true,
                  barcode: true,
                  gereEnStock: true,
                },
              },
              variant: { select: { id: true, name: true, barcode: true } },
            },
          },
        },
      },
    },
    orderBy: { id: "asc" },
  },
};

/* ============================================================
   CORRECTED CREATE BON LIVRAISON FUNCTION
   
   KEY FIXES:
   ✅ TVA is ALWAYS decimal (0.20 not 20) - stored and used as-is
   ✅ Remise is ALWAYS decimal (0.10 not 10) - stored and used as-is
   ✅ Line field is `remise` not `discount`
   ✅ unitPrice is the selected prixVente (TTC) that can be modified
   
   SCHEMA FIELDS:
   - Family.TVA          → Decimal (e.g., 0.20 for 20%)
   - Family.remise       → Decimal (e.g., 0.10 for 10%)
   - Article.remise      → Decimal (e.g., 0.05 for 5%)
   - ClientDocumentLine.remise → Decimal (e.g., 0.15 for 15%)
   
   ALL PRICES ARE TTC (Tax Included)
============================================================ */

/* ============================================================
   COMPLETE CORRECTED CREATE BON LIVRAISON
   
   ✅ All relation names match schema exactly
   ✅ TVA and remise as decimals (0.20 not 20)
   ✅ Proper field names (remise not discount)
============================================================ */

export const create = async (data, user) => {
  const {
    clientId,
    depotId,
    deliveryId,
    commandeId,
    documentDate,
    dateLivraison,
    notes,
    internalNotes,
    lines = [],
    packLines: rawPackLines = [],
    status = "DRAFT",
    advanceIds,
  } = data;

  // 1. Validate operating hours
  await timeRangeUtility.validateSystemHours(
    new Date(),
    "bon livraison creation",
  );

  // 2. Validate client
  const client = await validateClientAccess(clientId, user);

  // 3. Validate depot
  const depot = await validateDepotAccess(depotId, user);

  // 4. Client and depot must belong to the same société
  if (client.societeId !== depot.societeId) {
    throw new ApiError("Client and depot must belong to the same société", 400);
  }
  // 5. At least one article line or pack line is required
  if (lines.length === 0 && rawPackLines.length === 0) {
    throw new ApiError(
      "At least one article line or pack line is required",
      400,
    );
  }

  // 5a. Validate article line structure and product visibility
  if (lines.length > 0) {
    await validateLines(lines);

    // Every new line must declare its priceField
    lines.forEach((line, index) => {
      if (!line.priceField) {
        throw new ApiError(
          `Line ${index + 1}: priceField is required (prixVente1, prixVente2, or prixVente3)`,
          400,
        );
      }
    });
  }

  // 5b. Validate pack lines structure
  if (rawPackLines.length > 0) {
    validatePackLinesInput(rawPackLines);
  }

  // 6. Categorize article lines by stock management
  const { stockManaged, nonStockManaged } =
    await categorizeByStockManagement(lines);

  // 7. Validate article stock availability
  //    No excludeBonLivraisonId needed — this document does not exist yet.
  if (stockManaged.length > 0) {
    await stockValidationService.validateBatchStockAvailabilityForBonLivraison(
      stockManaged.map((line) => ({
        depotId,
        articleId: line.articleId,
        variantId: line.variantId,
        quantity: parseFloat(line.quantity),
      })),
      "bon livraison",
    );
  }

  // 7b. Fetch packs with components + validate component stock availability
  let packsData = [];
  if (rawPackLines.length > 0) {
    packsData = await fetchAndValidatePackLines(rawPackLines, depotId, user);
  }

  const documentNumber = await generateDocumentNumber(client.societeId);

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        const linesWithFinancials = [];

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

          // ✅ All decimals (0.20 not 20)
          const tvaRate = parseFloat(article.family.TVA || 0);
          const familyRemise = parseFloat(article.family.remise || 0);
          const prixAchatTTC = parseFloat(article.prixAchat);
          const referencePriceTTC = parseFloat(article[line.priceField]);
          const unitPriceTTC = parseFloat(line.unitPrice);
          const lineRemise = parseFloat(line.remise || 0);

          // Validations
          if (lineRemise > familyRemise) {
            throw new ApiError(
              `Line ${i + 1}: remise ${(lineRemise * 100).toFixed(2)}% exceeds family maximum ${(familyRemise * 100).toFixed(2)}%`,
              400,
            );
          }

          if (unitPriceTTC < prixAchatTTC) {
            throw new ApiError(
              `Line ${i + 1}: Unit price ${unitPriceTTC.toFixed(2)} (TTC) cannot be below purchase price ${prixAchatTTC.toFixed(2)} (TTC)`,
              400,
            );
          }

          const minPriceTTC = referencePriceTTC * (1 - familyRemise);
          if (unitPriceTTC < minPriceTTC) {
            throw new ApiError(
              `Line ${i + 1}: Unit price ${unitPriceTTC.toFixed(2)} (TTC) is below minimum ${minPriceTTC.toFixed(2)} (TTC)`,
              400,
            );
          }

          // Calculate financials
          const quantity = parseFloat(line.quantity);
          const totalBeforeDiscount = quantity * unitPriceTTC;
          const discountAmount = totalBeforeDiscount * lineRemise;
          const totalTTC = totalBeforeDiscount - discountAmount;
          const totalHT = totalTTC / (1 + tvaRate);
          const totalTVA = totalTTC - totalHT;

          linesWithFinancials.push({
            documentId: null,
            articleId: line.articleId || null,
            variantId: line.variantId || null,
            lineNumber: i + 1,
            description: line.description || article.name,
            quantity: quantity,
            unitPrice: unitPriceTTC,
            remise: lineRemise,
            totalHT: parseFloat(totalHT.toFixed(2)),
            tvaRate: tvaRate,
            totalTVA: parseFloat(totalTVA.toFixed(2)),
            totalTTC: parseFloat(totalTTC.toFixed(2)),
            priceField: line.priceField,
          });
        }

        // Article line totals
        const articleTotals = linesWithFinancials.reduce(
          (acc, l) => ({
            totalHT: acc.totalHT + l.totalHT,
            totalTVA: acc.totalTVA + l.totalTVA,
            totalTTC: acc.totalTTC + l.totalTTC,
          }),
          { totalHT: 0, totalTVA: 0, totalTTC: 0 },
        );

        // Pack lines are priced as TTC bundles (0% TVA at pack level).
        // Their total is added to both totalHT and totalTTC so the
        // invariant totalHT + totalTVA = totalTTC is preserved.
        const packTotalTTC = packsData.reduce(
          (sum, pd) => sum + pd.quantity * pd.prixVente,
          0,
        );

        const documentTotals = {
          totalHT: articleTotals.totalHT + packTotalTTC,
          totalTVA: articleTotals.totalTVA,
          totalTTC: articleTotals.totalTTC + packTotalTTC,
        };

        // ── Advance handling (optional) ─────────────────────────────────
        // advanceIds is an optional array of advance IDs. Each advance is
        // validated and applied sequentially until amountDue is covered.
        // Partial use: if an advance's balance exceeds the remaining due,
        // only the needed portion is consumed; the leftover stays on the
        // advance (montantRegle decremented) and remains reusable.
        const amountDue = parseFloat(documentTotals.totalTTC.toFixed(2));
        const advancesToApply = [];
        let totalAdvanceApplied = 0;

        if (Array.isArray(advanceIds) && advanceIds.length > 0) {
          let remaining = amountDue;

          for (const aId of advanceIds) {
            if (remaining <= 0.001) break;

            const advance = await tx.reglementClient.findUnique({
              where: { id: Number(aId) },
              select: {
                id: true,
                societeId: true,
                clientId: true,
                montantRegle: true,
                montantBL: true,
                modeReglement: true,
                date: true,
                banqueId: true,
                refDocument: true,
              },
            });

            if (!advance) throw new ApiError(`Advance ${aId} not found`, 404);
            if (advance.societeId !== client.societeId)
              throw new ApiError(
                `Advance ${aId} does not belong to this société`,
                403,
              );
            if (advance.clientId !== clientId)
              throw new ApiError(
                `Advance ${aId} does not belong to this client`,
                400,
              );

            const balance = Number(advance.montantRegle);
            if (balance <= 0.001)
              throw new ApiError(
                `Advance ${aId} has no remaining balance`,
                400,
              );

            const applied = parseFloat(Math.min(balance, remaining).toFixed(2));

            advancesToApply.push({
              id: advance.id,
              amountApplied: applied,
              newBalance: parseFloat((balance - applied).toFixed(2)),
              modeReglement: advance.modeReglement,
              date: advance.date,
              banqueId: advance.banqueId,
              refDocument: advance.refDocument,
              societeId: advance.societeId,
              clientId: advance.clientId,
            });

            remaining = parseFloat((remaining - applied).toFixed(2));
          }

          totalAdvanceApplied = parseFloat(
            advancesToApply
              .reduce((sum, a) => sum + a.amountApplied, 0)
              .toFixed(2),
          );
        }

        // Create ClientDocument
        const clientDocument = await tx.clientDocument.create({
          data: {
            societeId: client.societeId,
            clientId,
            documentNumber,
            status,
            totalHT: parseFloat(documentTotals.totalHT.toFixed(2)),
            totalTVA: parseFloat(documentTotals.totalTVA.toFixed(2)),
            totalTTC: parseFloat(documentTotals.totalTTC.toFixed(2)),
            discount: 0,
            amountPaid: totalAdvanceApplied,
            amountDue,
            notes,
            internalNotes,
            createdBy: user.id,
          },
        });

        // Create BonLivraison
        // dateLivraison is NOT NULL in the schema — default to the document date
        const bonLivraison = await tx.bonLivraison.create({
          data: {
            id: clientDocument.id,
            documentDate: documentDate ? new Date(documentDate) : new Date(),
            dateLivraison: dateLivraison
              ? new Date(dateLivraison)
              : documentDate
                ? new Date(documentDate)
                : new Date(),
            depotId,
            deliveryId: deliveryId || null,
            commandeId: commandeId || null,
          },
        });

        // Create article lines
        if (linesWithFinancials.length > 0) {
          await tx.clientDocumentLine.createMany({
            data: linesWithFinancials.map((line) => ({
              ...line,
              documentId: clientDocument.id,
            })),
          });
        }

        // Create pack lines
        if (packsData.length > 0) {
          await tx.bonLivraisonPackLine.createMany({
            data: packsData.map((pd) => ({
              bonLivraisonId: bonLivraison.id,
              packId: pd.packId,
              quantity: pd.quantity,
              prixVente: pd.prixVente,
            })),
          });
        }

        // ── Apply advances to the newly-created BL ─────────────────────
        for (const adv of advancesToApply) {
          // Always update the source advance to reflect the consumed balance.
          // Never delete — preserves FK integrity and audit trail.
          await tx.reglementClient.update({
            where: { id: adv.id },
            data: {
              // montantRegle: adv.newBalance,
              montantBL: amountDue,
              solde: 0,
              documentNumbers: [documentNumber],
              avanceId: adv.id,
              avanceConsumed: adv.amountApplied,
            },
          });

          let reglementToLink;

          if (adv.newBalance > 0) {
            // Partial use — create a derived règlement representing only
            // the consumed portion, linked back to the source advance.
            reglementToLink = await tx.reglementClient.create({
              data: {
                societeId: adv.societeId,
                clientId: adv.clientId,
                date: new Date(),
                modeReglement: adv.modeReglement,
                montantRegle: adv.newBalance,
                solde: 0,
              },
            });
          } else {
            // Fully consumed — the source advance itself IS the record.
            // No new règlement needed; link the BL directly to it.
            reglementToLink = { id: adv.id };
          }

          // Link the BL to the correct règlement.
          await tx.bonLivraisonAdvance.create({
            data: {
              bonLivraisonId: bonLivraison.id,
              advanceId: adv.id,
              amountApplied: adv.amountApplied,
            },
          });
        }

        // ── Stock movements (OUTBOUND) ─────────────────────────────────
        if (status === "COMPLETED") {
          // Article/variant lines
          if (stockManaged.length > 0) {
            await stockManagementService.batchStockOperationsWithTx(
              tx,
              stockManaged.map((line) => ({
                depotId,
                articleId: line.articleId || null,
                variantId: line.variantId || null,
                quantityChange: -parseFloat(line.quantity),
                transactionType: "OUTBOUND",
                referenceId: documentNumber,
                reason: `Delivery to ${client.name}: ${documentNumber}`,
                userId: user.id,
                bonLivraisonId: bonLivraison.id,
              })),
            );
          }

          // Pack component lines — explode each pack into its components
          if (packsData.length > 0) {
            const packOps = [];
            for (const pd of packsData) {
              for (const comp of pd.pack.components) {
                const gereEnStock = comp.articleId
                  ? comp.article?.gereEnStock
                  : comp.variant?.article?.gereEnStock;
                if (!gereEnStock) continue;

                packOps.push({
                  depotId,
                  articleId: comp.articleId || null,
                  variantId: comp.variantId || null,
                  quantityChange: -(pd.quantity * parseFloat(comp.quantity)),
                  transactionType: "OUTBOUND",
                  referenceId: documentNumber,
                  reason: `Pack delivery to ${client.name}: ${documentNumber}`,
                  userId: user.id,
                  bonLivraisonId: bonLivraison.id,
                });
              }
            }
            if (packOps.length > 0) {
              await stockManagementService.batchStockOperationsWithTx(
                tx,
                packOps,
              );
            }
          }
        }

        // ✅ Return with correct relation names
        return await tx.bonLivraison.findUnique({
          where: { id: bonLivraison.id },
          include: {
            document: {
              include: {
                client: {
                  select: {
                    id: true,
                    name: true,
                    type: true,
                    phone: true,
                    email: true,
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
                        prixVente1: true,
                        prixVente2: true,
                        prixVente3: true,
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
                            family: {
                              select: { id: true, name: true, TVA: true },
                            },
                          },
                        },
                      },
                    },
                  },
                  orderBy: { lineNumber: "asc" },
                },
                user: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
            depot: {
              select: { id: true, code: true, name: true },
            },
            delivery: {
              select: { id: true, name: true, tel: true },
            },
            commande: {
              select: {
                id: true,
                document: { select: { documentNumber: true } },
              },
            },
            stockTransactions: {
              include: {
                article: { select: { id: true, name: true } },
                variant: { select: { id: true, name: true } },
              },
              orderBy: { createdAt: "asc" },
            },
            packLines: {
              include: {
                pack: {
                  select: {
                    id: true,
                    name: true,
                    barcode: true,
                    prixVentePack: true,
                    purchasePrice: true,
                    components: {
                      include: {
                        article: {
                          select: {
                            id: true,
                            name: true,
                            barcode: true,
                            gereEnStock: true,
                          },
                        },
                        variant: {
                          select: { id: true, name: true, barcode: true },
                        },
                      },
                    },
                  },
                },
              },
              orderBy: { id: "asc" },
            },
          },
        });
      },
      { timeout: 30000 },
    );

    return {
      ...result,
      summary: {
        totalLines: result.document.lines.length,
        totalPackLines: result.packLines.length,
        stockManagedLines: stockManaged.length,
        nonStockManagedLines: nonStockManaged.length,
        totalQuantity:
          result.document.lines.reduce(
            (sum, l) => sum + parseFloat(l.quantity),
            0,
          ) +
          result.packLines.reduce(
            (sum, pl) => sum + parseFloat(pl.quantity),
            0,
          ),
        totalHT: parseFloat(result.document.totalHT),
        totalTVA: parseFloat(result.document.totalTVA),
        totalTTC: parseFloat(result.document.totalTTC),
        stockMovementApplied:
          status === "COMPLETED" &&
          (stockManaged.length > 0 || packsData.length > 0),
      },
    };
  } catch (error) {
    if (error.code === "P2002")
      throw new ApiError("Duplicate document number", 409);
    if (error.code === "P2003")
      throw new ApiError(
        "Invalid reference: Client, Depot, or Product not found",
        400,
      );
    if (error instanceof ApiError) throw error;
    throw new ApiError(`Failed to create bon livraison: ${error.message}`, 500);
  }
};

/* ============================================================
   VALIDATE BON LIVRAISON — Status Transition
   
   Two transitions allowed:
     DRAFT → COMPLETED : validate stock → apply OUTBOUND movements
     COMPLETED → DRAFT : reverse OUTBOUND movements → restore stock
   
   This function does NOT modify lines or financial totals.
   It is the single authoritative place for status changes
   that carry stock consequences.
   
   Audit trail strategy (COMPLETED → DRAFT):
     1. Create RETURN_IN records for each reversed OUTBOUND
        → preserves the history of the reversal event
     2. Delete the original OUTBOUND records linked to this BL
        → ensures the next DRAFT→COMPLETED starts clean
        → prevents phantom double-deductions on re-validation
============================================================ */

export const validate = async (id, targetStatus, user) => {
  // 1. Validate operating hours
  await timeRangeUtility.validateSystemHours(
    new Date(),
    "bon livraison validation",
  );

  // 2. Fetch BonLivraison with lines, pack lines, and OUTBOUND stock transactions
  const bonLivraison = await prisma.bonLivraison.findUnique({
    where: { id },
    include: {
      document: {
        include: {
          lines: true,
          client: { select: { id: true, name: true, societeId: true } },
        },
      },
      packLines: {
        include: {
          pack: {
            include: {
              components: {
                include: {
                  article: { select: { id: true, gereEnStock: true } },
                  variant: {
                    select: {
                      id: true,
                      article: { select: { gereEnStock: true } },
                    },
                  },
                },
              },
            },
          },
        },
      },
      // Only fetch OUTBOUNDs — these are the ones that need reversal
      stockTransactions: {
        where: { transactionType: "OUTBOUND" },
      },
    },
  });

  if (!bonLivraison) throw new ApiError("Bon livraison not found", 404);
  if (bonLivraison.type === "ADVANCED") {
    throw new ApiError(
      "Use the advanced bon livraison endpoint for ADVANCED type",
      400,
    );
  }

  // 3. Authorization
  if (
    !user.isSuperAdmin &&
    bonLivraison.document.client.societeId !== user.societeId
  ) {
    throw new ApiError("Access denied", 403);
  }

  const currentStatus = bonLivraison.document.status;
  const documentNumber = bonLivraison.document.documentNumber;
  const clientName = bonLivraison.document.client.name;
  const depotId = bonLivraison.depotId;

  // 4. Guard: no-op and invalid transitions
  if (currentStatus === targetStatus) {
    throw new ApiError(`Bon livraison is already ${targetStatus}`, 400);
  }

  const ALLOWED_TRANSITIONS = {
    DRAFT: "COMPLETED",
    COMPLETED: "DRAFT",
  };

  if (ALLOWED_TRANSITIONS[currentStatus] !== targetStatus) {
    throw new ApiError(
      `Cannot transition from ${currentStatus} to ${targetStatus}. ` +
        `Allowed transitions: DRAFT → COMPLETED, COMPLETED → DRAFT.`,
      400,
    );
  }

  // ════════════════════════════════════════════════════════════════════
  // TRANSITION: DRAFT → COMPLETED
  // ════════════════════════════════════════════════════════════════════
  if (targetStatus === "COMPLETED") {
    const lines = bonLivraison.document.lines;

    if ((!lines || lines.length === 0) && bonLivraison.packLines.length === 0) {
      throw new ApiError(
        "Cannot complete a bon livraison with no article lines or pack lines",
        400,
      );
    }

    // Categorize lines
    const { stockManaged, nonStockManaged } =
      await categorizeByStockManagement(lines);

    // Validate article stock availability. Exclude this BL's own lines from the
    // draft-reserved sum so they are not double-counted against themselves.
    if (stockManaged.length > 0) {
      await stockValidationService.validateBatchStockAvailabilityForBonLivraison(
        stockManaged.map((line) => ({
          depotId,
          articleId: line.articleId || null,
          variantId: line.variantId || null,
          quantity: parseFloat(line.quantity),
        })),
        `bon livraison ${documentNumber}`,
        id,
      );
    }

    // Validate pack component stock availability
    if (bonLivraison.packLines.length > 0) {
      const packCompMap = new Map();
      for (const packLine of bonLivraison.packLines) {
        for (const comp of packLine.pack.components) {
          const gereEnStock = comp.articleId
            ? comp.article?.gereEnStock
            : comp.variant?.article?.gereEnStock;
          if (!gereEnStock) continue;
          const key = comp.articleId
            ? `a_${comp.articleId}`
            : `v_${comp.variantId}`;
          const qty = parseFloat(packLine.quantity) * parseFloat(comp.quantity);
          if (packCompMap.has(key)) {
            packCompMap.get(key).quantity += qty;
          } else {
            packCompMap.set(key, {
              depotId,
              articleId: comp.articleId || null,
              variantId: comp.variantId || null,
              quantity: qty,
            });
          }
        }
      }
      const packNeeds = [...packCompMap.values()];
      if (packNeeds.length > 0) {
        await stockValidationService.validateBatchStockAvailabilityForBonLivraison(
          packNeeds,
          `bon livraison ${documentNumber} (pack components)`,
          id,
        );
      }
    }

    try {
      const result = await prisma.$transaction(
        async (tx) => {
          // Apply OUTBOUND stock movements for article/variant lines
          if (stockManaged.length > 0) {
            await stockManagementService.batchStockOperationsWithTx(
              tx,
              stockManaged.map((line) => ({
                depotId,
                articleId: line.articleId || null,
                variantId: line.variantId || null,
                quantityChange: -parseFloat(line.quantity), // OUTBOUND → negative
                transactionType: "OUTBOUND",
                referenceId: documentNumber,
                reason: `Delivery to ${clientName}: ${documentNumber}`,
                userId: user.id,
                bonLivraisonId: id,
              })),
            );
          }

          // Apply OUTBOUND stock movements for pack components
          if (bonLivraison.packLines.length > 0) {
            const packOps = [];
            for (const packLine of bonLivraison.packLines) {
              for (const comp of packLine.pack.components) {
                const gereEnStock = comp.articleId
                  ? comp.article?.gereEnStock
                  : comp.variant?.article?.gereEnStock;
                if (!gereEnStock) continue;
                packOps.push({
                  depotId,
                  articleId: comp.articleId || null,
                  variantId: comp.variantId || null,
                  quantityChange: -(
                    parseFloat(packLine.quantity) * parseFloat(comp.quantity)
                  ),
                  transactionType: "OUTBOUND",
                  referenceId: documentNumber,
                  reason: `Pack delivery to ${clientName}: ${documentNumber}`,
                  userId: user.id,
                  bonLivraisonId: id,
                });
              }
            }
            if (packOps.length > 0) {
              await stockManagementService.batchStockOperationsWithTx(
                tx,
                packOps,
              );
            }
          }

          // Transition status to COMPLETED
          await tx.clientDocument.update({
            where: { id },
            data: { status: "COMPLETED" },
          });

          return await tx.bonLivraison.findUnique({
            where: { id },
            include: FULL_BL_INCLUDE,
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
          packLinesProcessed: bonLivraison.packLines.length,
          outboundApplied:
            stockManaged.length > 0 || bonLivraison.packLines.length > 0,
          documentNumber,
        },
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        `Failed to validate bon livraison: ${error.message}`,
        500,
      );
    }
  }

  // ════════════════════════════════════════════════════════════════════
  // TRANSITION: COMPLETED → DRAFT
  // ════════════════════════════════════════════════════════════════════
  if (targetStatus === "DRAFT") {
    const outboundTransactions = bonLivraison.stockTransactions; // pre-filtered OUTBOUND

    try {
      const result = await prisma.$transaction(
        async (tx) => {
          // a. Reverse the physical stock each OUTBOUND removed — restore
          //    StockByDepot.quantityAvailable WITHOUT creating any new stock
          //    transaction record. Only stock-managed products had their stock
          //    decremented on COMPLETED, so only those are restored here.
          //    Iterating the OUTBOUND transactions covers both article/variant
          //    lines and exploded pack components (each has its own row).
          for (const t of outboundTransactions) {
            const isManaged =
              await stockManagementService.isProductStockManaged(
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
                  increment: Math.abs(parseFloat(t.quantityChange)), // add back what OUTBOUND removed
                },
              },
            });
          }

          // b. Delete original OUTBOUND records so the next DRAFT→COMPLETED
          //    creates fresh OUTBOUNDs without double-counting
          await tx.stockTransaction.deleteMany({
            where: { bonLivraisonId: id, transactionType: "OUTBOUND" },
          });

          // c. Revert status to DRAFT
          await tx.clientDocument.update({
            where: { id },
            data: { status: "DRAFT" },
          });

          return await tx.bonLivraison.findUnique({
            where: { id },
            include: FULL_BL_INCLUDE,
          });
        },
        { timeout: 30000 },
      );

      return {
        ...result,
        transition: {
          from: "COMPLETED",
          to: "DRAFT",
          transactionsReversed: outboundTransactions.length,
          stockRestored: outboundTransactions.length > 0,
          documentNumber,
        },
      };
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        `Failed to revert bon livraison: ${error.message}`,
        500,
      );
    }
  }
};

/* ============================================================
   GET ALL BON LIVRAISONS
============================================================ */

export const getAll = async (query, user) => {
  const {
    clientId,
    depotId,
    status,
    startDate,
    endDate,
    page = 1,
    limit = 50,
  } = query;

  // ── Build documentDate filter ───────────────────────────────────────
  const documentDateFilter = {};
  if (startDate) documentDateFilter.gte = new Date(startDate);
  if (endDate) documentDateFilter.lte = new Date(endDate);

  const where = {
    type: "STANDARD",
    document: {
      ...(user.isSuperAdmin ? {} : { societeId: user.societeId }),
      ...(clientId && { clientId: parseInt(clientId) }),
      ...(status && { status }),
    },
    ...(depotId && { depotId: parseInt(depotId) }),
    ...(Object.keys(documentDateFilter).length > 0 && {
      documentDate: documentDateFilter,
    }),
  };

  // Explicit projection — list view only pulls what the UI needs.
  // Excludes ADVANCED-only scalars (agenceId, telephone, whatsapp, ville,
  // livreurId, preparateurId, commercialId, isReported, …) so a type=ADVANCED
  // row can never leak its advancedBonLivraison-specific payload here.
  const listSelect = {
    id: true,
    documentDate: true,
    dateLivraison: true,
    depotId: true,
    deliveryId: true,
    commandeId: true,
    type: true,
    createdAt: true,
    updatedAt: true,
    document: {
      select: {
        documentNumber: true,
        status: true,
        totalTTC: true,
        totalHT: true,
        totalTVA: true,
        amountPaid: true,
        amountDue: true,
        client: { select: { id: true, name: true, type: true } },
        _count: { select: { lines: true } },
      },
    },
    depot: { select: { id: true, code: true, name: true } },
    delivery: { select: { id: true, name: true } },
    _count: { select: { packLines: true } },
  };

  // 1. Fetch all without pagination
  const all = await prisma.bonLivraison.findMany({
    where,
    select: listSelect,
    orderBy: [{ documentDate: "desc" }],
  });

  // 2. Filter by system hours on documentDate before pagination
  const filtered = await timeRangeUtility.filterBySystemHours(
    all,
    "documentDate",
  );

  // 3. Paginate manually
  const parsedPage = parseInt(page);
  const parsedLimit = parseInt(limit);
  const total = filtered.length;
  const fmt = (d) =>
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

  const bonLivraisons = filtered
    .slice((parsedPage - 1) * parsedLimit, parsedPage * parsedLimit)
    .map((bl) => ({
      ...bl,
      documentDate: fmtDateTime(bl.documentDate),
      dateLivraison: fmt(bl.dateLivraison),
      createdAt: fmtDateTime(bl.createdAt),
      updatedAt: fmt(bl.updatedAt),
    }));

  return {
    bonLivraisons,
    pagination: {
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit),
    },
  };
};
/* ============================================================
   GET BON LIVRAISON BY ID
============================================================ */
export const getById = async (id, user) => {
  const bonLivraison = await prisma.bonLivraison.findUnique({
    where: { id },
    include: {
      document: {
        include: {
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
            include: {
              article: {
                select: {
                  id: true,
                  barcode: true,
                  name: true,
                  gereEnStock: true,
                  visible: true,
                  prixVente1: true,
                  prixVente2: true,
                  prixVente3: true,
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
                      visible: true,
                      family: { select: { id: true, name: true, TVA: true } },
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
      depot: {
        select: { id: true, code: true, name: true, address: true },
      },
      delivery: {
        select: { id: true, name: true, tel: true, address: true },
      },
      commande: {
        select: {
          id: true,
          document: { select: { documentNumber: true } },
        },
      },
      stockTransactions: {
        include: {
          article: { select: { id: true, name: true } },
          variant: { select: { id: true, name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      packLines: {
        include: {
          pack: {
            select: {
              id: true,
              name: true,
              barcode: true,
              prixVentePack: true,
              purchasePrice: true,
              components: {
                include: {
                  article: {
                    select: {
                      id: true,
                      name: true,
                      barcode: true,
                      gereEnStock: true,
                    },
                  },
                  variant: { select: { id: true, name: true, barcode: true } },
                },
              },
            },
          },
        },
        orderBy: { id: "asc" },
      },
    },
  });

  if (!bonLivraison) throw new ApiError("Bon livraison not found", 404);
  if (bonLivraison.type === "ADVANCED") {
    throw new ApiError(
      "Use the advanced bon livraison endpoint for ADVANCED type",
      400,
    );
  }

  if (
    !user.isSuperAdmin &&
    bonLivraison.document.societe.id !== user.societeId
  ) {
    throw new ApiError("Access denied", 403);
  }

  return bonLivraison;
};

/* ============================================================
   GET PRODUCTS FOR BON LIVRAISON - CORRECTED
   
   ✅ FIXED: Search now includes variant barcodes
   
   Search filters:
   - Article name
   - Article barcode  
   - Variant barcode ✅ NEW
============================================================ */

export const getProductsForBonLivraison = async (query, user) => {
  const {
    depotId,
    priceField = "prixVente3",
    search,
    categoryId,
    familyId,
    page = 1,
    limit = 50,
  } = query;

  if (!depotId) throw new ApiError("depotId is required", 400);

  if (!["prixVente1", "prixVente2", "prixVente3"].includes(priceField)) {
    throw new ApiError(
      "priceField must be prixVente1, prixVente2 or prixVente3",
      400,
    );
  }

  // ✅ Build WHERE clause
  const articleWhere = {
    visible: true,
    ...(familyId && { familyId: parseInt(familyId) }),
    ...(categoryId && { family: { categoryId: parseInt(categoryId) } }),
  };

  // ✅ FIXED: Add search for article name, article barcode, AND variant barcode
  if (search) {
    articleWhere.OR = [
      { name: { contains: search } }, // Article name
      { barcode: { contains: search } }, // Article barcode
      { variants: { some: { barcode: { contains: search } } } }, // ✅ Variant barcode
      { variants: { some: { name: { contains: search } } } }, // ✅ Variant name
    ];
  }

  const articles = await prisma.article.findMany({
    where: articleWhere,
    include: {
      family: {
        select: {
          id: true,
          name: true,
          TVA: true, // decimal (e.g. 0.20)
          remise: true, // decimal (e.g. 0.10)
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
    skip: (page - 1) * limit,
    take: parseInt(limit),
    orderBy: { name: "asc" },
  });

  const products = [];

  for (const article of articles) {
    // TVA and remise are decimals in DB (e.g., 0.20, 0.10)
    // Convert to percentage for frontend display
    const tvaRate = parseFloat(article.family.TVA || 0) * 100; // 0.20 → 20
    const familyRemise = parseFloat(article.family.remise || 0) * 100; // 0.10 → 10
    const articleRemise = parseFloat(article.remise || 0) * 100; // 0.05 → 5

    if (article.variants.length === 0) {
      // ── Article without variants ──────────────────────────────────────────
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
        tvaRate, // % (e.g., 20)
        familyRemise, // % (e.g., 10)
        articleRemise, // % (e.g., 5)
        prixAchat: parseFloat(article.prixAchat),
        unitPrice: parseFloat(article[priceField]),
        stock: {
          quantityAvailable: parseFloat(stock.quantityAvailable),
          quantityReserved: parseFloat(stock.quantityReserved),
          quantityInTransit: parseFloat(stock.quantityInTransit),
        },
      });
    } else {
      // ── Variants ──────────────────────────────────────────────────────────
      for (const variant of article.variants) {
        // ✅ If searching, only include variants that match the search
        if (search) {
          const searchLower = search.toLowerCase();
          const matchesVariantBarcode = variant.barcode
            ?.toLowerCase()
            .includes(searchLower);
          const matchesVariantName = variant.name
            ?.toLowerCase()
            .includes(searchLower);
          const matchesArticleName = article.name
            .toLowerCase()
            .includes(searchLower);
          const matchesArticleBarcode = article.barcode
            .toLowerCase()
            .includes(searchLower);

          // Skip this variant if it doesn't match
          if (
            !matchesVariantBarcode &&
            !matchesVariantName &&
            !matchesArticleName &&
            !matchesArticleBarcode
          ) {
            continue;
          }
        }

        const stock = variant.stockByDepot[0] || {
          quantityAvailable: 0,
          quantityReserved: 0,
          quantityInTransit: 0,
        };

        const attributes = variant.variantAttributes
          .map((va) => `${va.attributeValue.value}`)
          .join(", ");

        products.push({
          type: "variant",
          id: variant.id,
          articleId: article.id,
          variantId: variant.id,
          barcode: variant.barcode,
          name: `${article.name} (${attributes})`,
          family: article.family,
          unit: article.unitePrincipale,
          gereEnStock: article.gereEnStock,
          tvaRate, // % inherited from family
          familyRemise, // % inherited from family
          articleRemise, // % inherited from article
          prixAchat: parseFloat(article.prixAchat),
          unitPrice: parseFloat(article[priceField]),
          stock: {
            quantityAvailable: parseFloat(stock.quantityAvailable),
            quantityReserved: parseFloat(stock.quantityReserved),
            quantityInTransit: parseFloat(stock.quantityInTransit),
          },
        });
      }
    }
  }

  const total = await prisma.article.count({ where: articleWhere });

  return {
    products,
    priceField,
    pagination: {
      total,
      page: parseInt(page),
      limit: parseInt(limit),
      totalPages: Math.ceil(total / parseInt(limit)),
    },
  };
};

/* ============================================================
   UPDATE BON LIVRAISON
   
   Mode 1 — Simple (no lines in body): updates metadata only
   Mode 2 — Full (lines provided): diff-based line management
             with stock reversal and reapplication
============================================================ */
export const update = async (id, data, user) => {
  // ── Status is intentionally NOT accepted here ──────────────────────────
  // Status transitions (DRAFT ↔ COMPLETED) are exclusively handled by
  // PUT /api/bon-livraisons/:id/validate
  // This function only edits data: client, depot, dates, notes, lines, packLines.
  const {
    clientId,
    depotId,
    deliveryId,
    commandeId,
    documentDate,
    dateLivraison,
    notes,
    internalNotes,
    lines,
    packLines: rawPackLines,
  } = data;

  // ── Fetch including existing pack lines ────────────────────────────────
  const existingBL = await prisma.bonLivraison.findUnique({
    where: { id },
    include: {
      document: {
        include: {
          lines: { orderBy: { lineNumber: "asc" } },
          client: { select: { id: true, societeId: true } },
        },
      },
      packLines: true,
    },
  });

  if (!existingBL) throw new ApiError("Bon livraison not found", 404);
  if (existingBL.type === "ADVANCED") {
    throw new ApiError(
      "Use the advanced bon livraison endpoint for ADVANCED type",
      400,
    );
  }

  // ── Authorization ────────────────────────────────────────────────────────
  if (
    !user.isSuperAdmin &&
    existingBL.document.client.societeId !== user.societeId
  ) {
    throw new ApiError("Access denied", 403);
  }

  // ── Guard: only DRAFT documents can be edited ────────────────────────────
  // A COMPLETED document has stock movements applied. Editing it directly
  // would create a mismatch between the document lines and the stock records.
  // The correct workflow is:
  //   1. PUT /validate { targetStatus: "DRAFT" }   → revert stock
  //   2. PUT /:id { ... }                           → edit data
  //   3. PUT /validate { targetStatus: "COMPLETED" } → reapply stock
  if (existingBL.document.status !== "DRAFT") {
    throw new ApiError(
      `Cannot update a ${existingBL.document.status} bon livraison. ` +
        `Revert it to DRAFT first via PUT /bon-livraisons/${id}/validate.`,
      400,
    );
  }

  await timeRangeUtility.validateSystemHours(
    new Date(),
    "bon livraison update",
  );

  // ── Validate client / depot if changing ───────────────────────────────────
  let client = existingBL.document.client;
  let depot = { id: existingBL.depotId, societeId: client.societeId };

  if (clientId && clientId !== existingBL.document.clientId) {
    client = await validateClientAccess(clientId, user);
  }
  if (depotId && depotId !== existingBL.depotId) {
    depot = await validateDepotAccess(depotId, user);
  }
  if (client.societeId !== depot.societeId) {
    throw new ApiError("Client and depot must belong to the same société", 400);
  }

  // Mode 2 is triggered when the caller supplies at least one of
  // `lines` or `packLines` in the request body.
  const shouldUpdateLines = Array.isArray(lines) || Array.isArray(rawPackLines);

  // ════════════════════════════════════════════════════════════════════════
  // MODE 1: Simple — metadata only (no lines in body)
  // Updates: clientId, depotId, deliveryId, commandeId,
  //          documentDate, dateLivraison, notes, internalNotes
  // ════════════════════════════════════════════════════════════════════════
  if (!shouldUpdateLines) {
    try {
      return await prisma.$transaction(async (tx) => {
        await tx.clientDocument.update({
          where: { id },
          data: {
            ...(clientId && { clientId }),
            ...(notes !== undefined && { notes }),
            ...(internalNotes !== undefined && { internalNotes }),
          },
        });

        await tx.bonLivraison.update({
          where: { id },
          data: {
            ...(documentDate && { documentDate: new Date(documentDate) }),
            ...(dateLivraison && { dateLivraison: new Date(dateLivraison) }),
            ...(depotId && { depotId }),
            ...(deliveryId !== undefined && { deliveryId }),
            ...(commandeId !== undefined && { commandeId }),
          },
        });

        const result = await tx.bonLivraison.findUnique({
          where: { id },
          include: FULL_BL_INCLUDE,
        });

        return {
          ...result,
          summary: { updateMode: "simple", linesUpdated: false },
        };
      });
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        `Failed to update bon livraison: ${error.message}`,
        500,
      );
    }
  }

  // ════════════════════════════════════════════════════════════════════════
  // MODE 2: Full — diff-based line management + financial recalculation
  // Updates everything from mode 1 PLUS: adds/updates/deletes lines
  //          and recalculates document totals.
  // No stock operations — call /validate after editing to reapply.
  // ════════════════════════════════════════════════════════════════════════
  const effectiveDepotId = depotId || existingBL.depotId;
  const normalizedLines = Array.isArray(lines) ? lines : null;
  const normalizedPackLines = Array.isArray(rawPackLines) ? rawPackLines : null;

  // Guard: if both are explicitly provided as empty arrays, reject
  if (normalizedLines?.length === 0 && normalizedPackLines?.length === 0) {
    throw new ApiError(
      "At least one article line or pack line is required when updating lines",
      400,
    );
  }

  // ── Article line diff setup ───────────────────────────────────────────
  let linesToCreate = [];
  let linesToUpdate = [];
  let linesToDelete = [];
  let existingLineMap = new Map();

  if (normalizedLines !== null) {
    if (normalizedLines.length > 0) {
      await validateLines(normalizedLines);
    }

    const { stockManaged: stockManagedUpdate } =
      await categorizeByStockManagement(normalizedLines);

    if (stockManagedUpdate.length > 0) {
      await stockValidationService.validateBatchStockAvailabilityForBonLivraison(
        stockManagedUpdate.map((line) => ({
          depotId: effectiveDepotId,
          articleId: line.articleId,
          variantId: line.variantId,
          quantity: parseFloat(line.quantity),
        })),
        "bon livraison update",
        id,
      );
    }

    const existingLines = existingBL.document.lines;
    existingLineMap = new Map(existingLines.map((l) => [l.id, l]));
    const existingLineIds = new Set(existingLines.map((l) => l.id));
    const incomingLineIds = new Set(
      normalizedLines.filter((l) => l.id).map((l) => l.id),
    );

    linesToCreate = normalizedLines.filter((l) => !l.id);
    linesToUpdate = normalizedLines.filter(
      (l) => l.id && existingLineIds.has(l.id),
    );
    linesToDelete = existingLines.filter((l) => !incomingLineIds.has(l.id));

    linesToCreate.forEach((line, index) => {
      if (!line.priceField) {
        throw new ApiError(
          `New line ${index + 1}: priceField is required (prixVente1, prixVente2, or prixVente3)`,
          400,
        );
      }
    });
  }

  // ── Pack line diff setup ─────────────────────────────────────────────
  let packLinesToCreate = [];
  let packLinesToUpdate = [];
  let packLinesToDelete = [];
  let newPacksData = [];

  if (normalizedPackLines !== null) {
    if (normalizedPackLines.length > 0) {
      validatePackLinesInput(normalizedPackLines);
    }

    const existingPackLines = existingBL.packLines;
    const existingPackLineIds = new Set(existingPackLines.map((pl) => pl.id));
    const incomingPackLineIds = new Set(
      normalizedPackLines.filter((pl) => pl.id).map((pl) => pl.id),
    );

    packLinesToCreate = normalizedPackLines.filter((pl) => !pl.id);
    packLinesToUpdate = normalizedPackLines.filter(
      (pl) => pl.id && existingPackLineIds.has(pl.id),
    );
    packLinesToDelete = existingPackLines.filter(
      (pl) => !incomingPackLineIds.has(pl.id),
    );

    // Validate stock for all surviving pack lines (create + update)
    const allSurvivingPackLines = [...packLinesToCreate, ...packLinesToUpdate];
    if (allSurvivingPackLines.length > 0) {
      newPacksData = await fetchAndValidatePackLines(
        allSurvivingPackLines,
        effectiveDepotId,
        user,
        id,
      );
    }
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // ── Process article lines: validate prices + compute financials ──────
        const processedLines = [];
        let lineNumber = 1;

        const linesToProcess =
          normalizedLines !== null ? [...linesToUpdate, ...linesToCreate] : [];

        for (const line of linesToProcess) {
          const article = await resolveLineArticle(
            tx,
            line.articleId,
            line.variantId,
          );
          if (!article) throw new ApiError(`Line: Product not found`, 404);

          const resolvedPriceField =
            line.priceField || existingLineMap.get(line.id)?.priceField;

          const tvaRate = parseFloat(article.family.TVA || 0);
          const familyRemise = parseFloat(article.family.remise || 0);
          const prixAchatTTC = parseFloat(article.prixAchat);
          const referencePriceTTC = parseFloat(article[resolvedPriceField]);
          const unitPriceTTC = parseFloat(line.unitPrice);
          const lineRemise = parseFloat(line.remise || 0);

          if (lineRemise > familyRemise) {
            throw new ApiError(
              `remise ${(lineRemise * 100).toFixed(2)}% exceeds family maximum ${(familyRemise * 100).toFixed(2)}%`,
              400,
            );
          }
          if (unitPriceTTC < prixAchatTTC) {
            throw new ApiError(
              `Unit price ${unitPriceTTC.toFixed(2)} below purchase price ${prixAchatTTC.toFixed(2)}`,
              400,
            );
          }
          const minPrice = referencePriceTTC * (1 - familyRemise);
          if (unitPriceTTC < minPrice) {
            throw new ApiError(
              `Unit price ${unitPriceTTC.toFixed(2)} below minimum ${minPrice.toFixed(2)}`,
              400,
            );
          }

          const quantity = parseFloat(line.quantity);
          const totalTTC = quantity * unitPriceTTC * (1 - lineRemise);
          const totalHT = totalTTC / (1 + tvaRate);
          const totalTVA = totalTTC - totalHT;

          processedLines.push({
            id: line.id || undefined,
            articleId: line.articleId || null,
            variantId: line.variantId || null,
            lineNumber: lineNumber++,
            description: line.description || article.name,
            quantity,
            unitPrice: unitPriceTTC,
            remise: lineRemise,
            totalHT: parseFloat(totalHT.toFixed(2)),
            tvaRate,
            totalTVA: parseFloat(totalTVA.toFixed(2)),
            totalTTC: parseFloat(totalTTC.toFixed(2)),
            priceField: resolvedPriceField,
          });
        }

        // ── Article line totals ───────────────────────────────────────────────
        // If lines were not provided, fall back to existing DB totals.
        const articleTotals =
          normalizedLines !== null
            ? processedLines.reduce(
                (acc, l) => ({
                  totalHT: acc.totalHT + l.totalHT,
                  totalTVA: acc.totalTVA + l.totalTVA,
                  totalTTC: acc.totalTTC + l.totalTTC,
                }),
                { totalHT: 0, totalTVA: 0, totalTTC: 0 },
              )
            : {
                totalHT: parseFloat(existingBL.document.totalHT),
                totalTVA: parseFloat(existingBL.document.totalTVA),
                totalTTC: parseFloat(existingBL.document.totalTTC),
              };

        // ── Pack line totals ──────────────────────────────────────────────────
        // If packLines were not provided, fall back to the existing stored total.
        let packTotalTTC = 0;
        if (normalizedPackLines !== null) {
          packTotalTTC = newPacksData.reduce(
            (sum, pd) => sum + pd.quantity * pd.prixVente,
            0,
          );
        } else {
          // Use persisted pack line totals from existing BL
          packTotalTTC = existingBL.packLines.reduce(
            (sum, pl) =>
              sum + parseFloat(pl.quantity) * parseFloat(pl.prixVente),
            0,
          );
        }

        // ── Recalculate document totals ──────────────────────────────────────
        const documentTotals = {
          totalHT: articleTotals.totalHT + packTotalTTC,
          totalTVA: articleTotals.totalTVA,
          totalTTC: articleTotals.totalTTC + packTotalTTC,
        };

        // ── Delete removed article lines ─────────────────────────────────────
        if (linesToDelete.length > 0) {
          await tx.clientDocumentLine.deleteMany({
            where: {
              id: { in: linesToDelete.map((l) => l.id) },
              documentId: id,
            },
          });
        }

        // ── Update existing article lines ────────────────────────────────────
        for (const line of processedLines.filter((l) => l.id)) {
          await tx.clientDocumentLine.update({
            where: { id: line.id, documentId: id },
            data: {
              lineNumber: line.lineNumber,
              description: line.description,
              quantity: line.quantity,
              unitPrice: line.unitPrice,
              remise: line.remise,
              totalHT: line.totalHT,
              tvaRate: line.tvaRate,
              totalTVA: line.totalTVA,
              totalTTC: line.totalTTC,
              priceField: line.priceField,
            },
          });
        }

        // ── Create new article lines ─────────────────────────────────────────
        const newArticleLines = processedLines.filter((l) => !l.id);
        if (newArticleLines.length > 0) {
          await tx.clientDocumentLine.createMany({
            data: newArticleLines.map((l) => ({
              documentId: id,
              ...l,
              id: undefined,
            })),
          });
        }

        // ── Delete removed pack lines ────────────────────────────────────────
        if (packLinesToDelete.length > 0) {
          await tx.bonLivraisonPackLine.deleteMany({
            where: {
              id: { in: packLinesToDelete.map((pl) => pl.id) },
              bonLivraisonId: id,
            },
          });
        }

        // ── Upsert surviving pack lines ──────────────────────────────────────
        for (const pd of newPacksData) {
          const existingPackLine = existingBL.packLines.find(
            (pl) => pl.packId === pd.packId,
          );
          if (existingPackLine) {
            // Update quantity and prixVente
            await tx.bonLivraisonPackLine.update({
              where: { id: existingPackLine.id },
              data: { quantity: pd.quantity, prixVente: pd.prixVente },
            });
          } else {
            // Create new pack line
            await tx.bonLivraisonPackLine.create({
              data: {
                bonLivraisonId: id,
                packId: pd.packId,
                quantity: pd.quantity,
                prixVente: pd.prixVente,
              },
            });
          }
        }

        // ── Keep any linked advances in sync with the new total ────────
        const newAmountDue = parseFloat(documentTotals.totalTTC.toFixed(2));
        let newAmountPaid;
        const linkedAdvances = await tx.bonLivraisonAdvance.findMany({
          where: { bonLivraisonId: id },
          include: { advance: { select: { id: true, montantRegle: true } } },
        });
        if (linkedAdvances.length > 0) {
          let remaining = newAmountDue;
          let totalNewApplied = 0;
          for (const link of linkedAdvances) {
            const maxFromAdvance = Number(link.advance.montantRegle);
            const newApplied = parseFloat(
              Math.min(maxFromAdvance, remaining).toFixed(2),
            );
            await tx.bonLivraisonAdvance.update({
              where: { id: link.id },
              data: { amountApplied: newApplied },
            });
            // montantBL always equals the BL's amountDue
            await tx.reglementClient.update({
              where: { id: link.advance.id },
              data: { montantBL: newAmountDue },
            });
            totalNewApplied += newApplied;
            remaining = parseFloat((remaining - newApplied).toFixed(2));
          }
          newAmountPaid = parseFloat(totalNewApplied.toFixed(2));
        }

        // ── Update ClientDocument header (no status field) ───────────────────
        await tx.clientDocument.update({
          where: { id },
          data: {
            ...(clientId && { clientId }),
            ...(notes !== undefined && { notes }),
            ...(internalNotes !== undefined && { internalNotes }),
            totalHT: parseFloat(documentTotals.totalHT.toFixed(2)),
            totalTVA: parseFloat(documentTotals.totalTVA.toFixed(2)),
            totalTTC: parseFloat(documentTotals.totalTTC.toFixed(2)),
            amountDue: newAmountDue,
            ...(newAmountPaid !== undefined && { amountPaid: newAmountPaid }),
          },
        });

        // ── Update BonLivraison extension ────────────────────────────────────
        await tx.bonLivraison.update({
          where: { id },
          data: {
            ...(documentDate && { documentDate: new Date(documentDate) }),
            ...(dateLivraison && { dateLivraison: new Date(dateLivraison) }),
            ...(depotId && { depotId }),
            ...(deliveryId !== undefined && { deliveryId }),
            ...(commandeId !== undefined && { commandeId }),
          },
        });

        return await tx.bonLivraison.findUnique({
          where: { id },
          include: FULL_BL_INCLUDE,
        });
      },
      { timeout: 30000 },
    );

    return {
      ...result,
      summary: {
        updateMode: "full",
        totalLines: result.document.lines.length,
        totalPackLines: result.packLines.length,
        linesCreated: linesToCreate.length,
        linesUpdated: linesToUpdate.length,
        linesDeleted: linesToDelete.length,
        packLinesCreated: packLinesToCreate.length,
        packLinesUpdated: packLinesToUpdate.length,
        packLinesDeleted: packLinesToDelete.length,
        totalHT: parseFloat(result.document.totalHT),
        totalTVA: parseFloat(result.document.totalTVA),
        totalTTC: parseFloat(result.document.totalTTC),
      },
    };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(`Failed to update bon livraison: ${error.message}`, 500);
  }
};

/* ============================================================
   DELETE BON LIVRAISON
   
   ✅ FIX: Stock reversal now uses batchStockOperationsWithTx
   so RETURN_IN transactions are properly recorded in the audit trail
   instead of silently patching StockByDepot.
============================================================ */
export const remove = async (id, user) => {
  await timeRangeUtility.validateSystemHours(
    new Date(),
    "delete bon livraison",
  );

  const bonLivraison = await prisma.bonLivraison.findUnique({
    where: { id },
    include: {
      document: {
        select: {
          societeId: true,
          amountPaid: true,
          status: true,
        },
      },
      stockTransactions: true,
    },
  });

  if (!bonLivraison) throw new ApiError("Bon livraison not found", 404);
  if (bonLivraison.type === "ADVANCED") {
    throw new ApiError(
      "Use the advanced bon livraison endpoint for ADVANCED type",
      400,
    );
  }

  if (
    !user.isSuperAdmin &&
    bonLivraison.document.societeId !== user.societeId
  ) {
    throw new ApiError("Access denied", 403);
  }

  // Guard: cannot delete a BL that has payments applied
  if (parseFloat(bonLivraison.document.amountPaid) > 0) {
    throw new ApiError(
      "Cannot delete a bon de livraison with associated règlements or bonRetour",
      400,
    );
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        // Directly reverse OUTBOUND stock levels (both article lines and
        // pack components) without creating new transaction records —
        // this way deleteMany below removes everything cleanly.
        const outboundTransactions = bonLivraison.stockTransactions.filter(
          (t) => t.transactionType === "OUTBOUND",
        );

        if (
          bonLivraison.document.status === "COMPLETED" &&
          outboundTransactions.length > 0
        ) {
          for (const t of outboundTransactions) {
            const where = t.articleId
              ? { depotId: t.depotId, articleId: t.articleId }
              : { depotId: t.depotId, variantId: t.variantId };

            const stock = await tx.stockByDepot.findFirst({ where });
            if (stock) {
              await tx.stockByDepot.update({
                where: { id: stock.id },
                data: {
                  quantityAvailable:
                    parseFloat(stock.quantityAvailable) +
                    Math.abs(parseFloat(t.quantityChange)),
                },
              });
            }
          }
        }

        // Delete ALL stock transactions linked to this BL — no orphans remain.
        await tx.stockTransaction.deleteMany({ where: { bonLivraisonId: id } });

        // Delete document lines
        await tx.clientDocumentLine.deleteMany({ where: { documentId: id } });

        // Delete BonLivraison extension
        await tx.bonLivraison.delete({ where: { id } });

        // Delete ClientDocument header
        await tx.clientDocument.delete({ where: { id } });
      },
      { timeout: 30000 },
    );

    return { message: "Bon livraison deleted successfully" };
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(`Failed to delete bon livraison: ${error.message}`, 500);
  }
};

/* ============================================================
   GENERATE BON LIVRAISON PDF
============================================================ */

const BL_PDF_CONFIG = {
  title: "BON DE LIVRAISON",
  clientLabel: "DESTINATAIRE / CLIENT",
  getSubLine: (bl) => {
    let line = `N°: ${bl.document.documentNumber}  |  Date: ${formatDate(bl.documentDate)}`;
    if (bl.dateLivraison)
      line += `  |  Livraison: ${formatDate(bl.dateLivraison)}`;
    return line;
  },
  getInfoBar: (bl) => {
    let text = `Dépôt: ${bl.depot.name} (${bl.depot.code})`;
    if (bl.delivery) text += `  |  Livreur: ${bl.delivery.name}`;
    return text;
  },
  signatureLeft: "Signature du livreur",
  signatureRight: "Signature du client",
};

export const generateBonLivraisonPDF = async (id, user) => {
  const bonLivraison = await getById(id, user);
  if (!bonLivraison) throw new ApiError("Bon livraison not found", 404);
  return generateDocumentPDF(bonLivraison, BL_PDF_CONFIG);
};

// Add to exports at bottom of file
export default {
  getNextDocumentNumber,
  create,
  getAll,
  getById,
  getProductsForBonLivraison,
  update,
  remove,
  validate,
  generateBonLivraisonPDF, // ✅ Add this
};
