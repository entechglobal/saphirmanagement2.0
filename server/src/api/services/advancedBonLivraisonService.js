import prisma from "../../loaders/prisma.js";
import ApiError from "../utils/apiError.js";
import timeRangeUtility from "../utils/timeRangeUtility.js";
import productVisibilityUtility from "../utils/productVisibilityUtility.js";
import stockManagementService from "./domain/stockManagementService.js";
import stockValidationService from "./domain/stockValidationService.js";
import { generateDocumentPDF, formatDate } from "../utils/pdfGenerator.js";
import { enqueueCreateColis } from "./colisSyncService.js";
import { PROVIDER_BY_NAME } from "../../providers/index.js";
import { getPhoneSearchVariants } from "../utils/phoneUtils.js";
import {
  resolveWalletForIncome,
  creditWallet,
} from "./caisseWalletHelper.js";
import {
  requireActiveShiftForLivreur,
  linkOrderToActiveShift,
} from "./deliveryShiftService.js";

const MODES_REQUIRING_BANK = ["CARTE_BANCAIRE", "VIREMENT"];
const ADMIN_ROLE_NAMES = new Set(["Super_Admin", "Societe_Admin"]);

const isAdminLevelUser = (user) =>
  !!user?.isSuperAdmin || ADMIN_ROLE_NAMES.has(user?.roleName);

const resolveLivreurDeliveryId = async (userId) => {
  const delivery = await prisma.delivery.findUnique({
    where: { userId },
    select: { id: true },
  });
  return delivery?.id ?? -1;
};

/**
 * Restrict Advanced BL queries to the caller's own orders.
 * Super_Admin / Societe_Admin keep société (or global) visibility.
 */
const applyPersonalOrderScope = async (where, user) => {
  if (isAdminLevelUser(user)) return where;

  if (user.roleName === "Livreur") {
    where.livreurId = await resolveLivreurDeliveryId(user.id);
    return where;
  }
  if (user.roleName === "Preparateur") {
    where.preparateurId = user.id;
    return where;
  }
  if (user.roleName === "Commercial") {
    where.commercialId = user.id;
    return where;
  }

  where.AND = [
    ...(where.AND || []),
    {
      OR: [
        { document: { createdBy: user.id } },
        { commercialId: user.id },
      ],
    },
  ];
  return where;
};

const resolveVilleName = (ville) => {
  if (ville == null || ville === "") return null;
  if (typeof ville === "object") return ville.name ? String(ville.name).trim() || null : null;
  const trimmed = String(ville).trim();
  return trimmed || null;
};

const resolveAddress = (localisation) =>
  typeof localisation === "string" && localisation.trim()
    ? localisation.trim()
    : null;

const persistClientLocation = async (tx, clientId, { villeName, address }) => {
  if (!clientId) return;
  const data = {};
  if (villeName !== undefined) {
    data.city = villeName;
    if (villeName) data.region = villeName;
  }
  if (address !== undefined) data.address = address;
  if (Object.keys(data).length === 0) return;
  await tx.client.update({
    where: { id: clientId },
    data,
  });
};

async function creditOrderPayment(tx, {
  societeId,
  modeReglement,
  banqueId,
  amount,
  userId,
  clientId,
  documentNumber,
  documentDue,
}) {
  const creditAmount = parseFloat(amount);
  if (!creditAmount || creditAmount <= 0) return;

  if (MODES_REQUIRING_BANK.includes(modeReglement) && !banqueId) {
    throw new ApiError(
      `banqueId is required for ${modeReglement}. Select a bank to credit its wallet.`,
      400,
    );
  }

  let reglementId = null;
  if (clientId && modeReglement) {
    const reglement = await tx.reglementClient.create({
      data: {
        societeId,
        date: new Date(),
        clientId,
        modeReglement,
        documentNumbers: documentNumber ? [documentNumber] : null,
        montantRegle: creditAmount,
        montantBL: documentDue ?? 0,
        solde: Math.max(0, parseFloat(((documentDue ?? 0) - creditAmount).toFixed(2))),
        banqueId: banqueId ?? null,
      },
    });
    reglementId = reglement.id;
  }

  const targetWallet = await resolveWalletForIncome(tx, {
    societeId,
    modeReglement,
    banqueId,
    userId,
  });
  if (targetWallet) {
    await creditWallet(tx, {
      caisse: targetWallet,
      amount: creditAmount,
      note: documentNumber
        ? `Encaissement commande ${documentNumber} (${modeReglement})`
        : `Encaissement commande (${modeReglement})`,
      createdBy: userId ?? null,
      reglementClientId: reglementId,
    });
  }
}

/* ============================================================
   STATUS TRANSITION MAP
   Defines allowed transitions per current status.
   Stock impact happens ONLY at LIVRE.
============================================================ */
const ALLOWED_TRANSITIONS = {
  EN_COURS: ["CONFIRME"], //supprimer
  CONFIRME: ["PREPARE", "ANNULE"],
  PREPARE: ["COLLECTE", "ANNULE"], //stock change
  COLLECTE: ["EN_ROUTE", "ANNULE"], //stock change
  EN_ROUTE: ["LIVRE", "ANNULE"], //stock change
  LIVRE: ["PAYE"],
  // ANNULE and PAYE are terminal states.
  // REPORTE is NOT a lifecycle status — handled via reportBL/resumeReportedBL.
};

// Role-based transition gate. SuperAdmin bypasses; roles not listed
// here fall back to the RBAC permission check on the route.
const ROLE_TRANSITIONS = {
  Preparateur: new Set(["CONFIRME->PREPARE", "PREPARE->ANNULE"]),
  Livreur: new Set([
    "PREPARE->COLLECTE",
    "PREPARE->ANNULE",
    "COLLECTE->EN_ROUTE",
    "COLLECTE->ANNULE",
    "EN_ROUTE->LIVRE",
    "EN_ROUTE->ANNULE",
    "LIVRE->PAYE",
  ]),
};

/* ============================================================
   HELPER: Generate Document Number (shared with standard BL)
   Format: BL-{YEAR}-{6-digit-sequence}
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
    nextNumber = parseInt(lastDoc.documentNumber.split("-")[2]) + 1;
  }

  return `${prefix}-${String(nextNumber).padStart(6, "0")}`;
};

/* ============================================================
   HELPER: Resolve article for a line
============================================================ */
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

/* ============================================================
   HELPER: Validate line structure
============================================================ */
const validateLines = async (lines) => {
  if (!Array.isArray(lines) || lines.length === 0) return;

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
      throw new ApiError(`Line ${index + 1}: Quantity must be > 0`, 400);
    }
    if (!line.unitPrice || parseFloat(line.unitPrice) <= 0) {
      throw new ApiError(`Line ${index + 1}: Unit price must be > 0`, 400);
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
    lines.map((l) => ({ articleId: l.articleId, variantId: l.variantId })),
    "advanced bon livraison",
  );
};

/* ============================================================
   HELPER: Categorize by stock management
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
   HELPER: Collect stock-impacting items for a BL
   direction = "OUTBOUND" (PREPARE) | "INBOUND" (rollback on ANNULE)
============================================================ */
const collectStockItems = async (bl, user, direction) => {
  const sign = direction === "OUTBOUND" ? -1 : 1;
  const reasonPrefix =
    direction === "OUTBOUND"
      ? "Advanced BL preparation"
      : "Advanced BL cancellation rollback";
  const items = [];

  for (const line of bl.document.lines) {
    const isManaged = await stockManagementService.isProductStockManaged(
      line.articleId,
      line.variantId,
    );
    if (!isManaged) continue;

    items.push({
      depotId: bl.depotId,
      articleId: line.articleId || null,
      variantId: line.variantId || null,
      quantityChange: sign * parseFloat(line.quantity),
      transactionType: direction,
      referenceId: bl.document.documentNumber,
      reason: `${reasonPrefix}: ${bl.document.documentNumber}`,
      userId: user.id,
      bonLivraisonId: bl.id,
    });
  }

  for (const packLine of bl.packLines) {
    const packQty = parseFloat(packLine.quantity);
    for (const comp of packLine.pack.components) {
      const compArticle =
        comp.article || (comp.variant ? { gereEnStock: true } : null);
      if (!compArticle || !compArticle.gereEnStock) continue;

      items.push({
        depotId: bl.depotId,
        articleId: comp.articleId || null,
        variantId: comp.variantId || null,
        quantityChange: sign * (parseFloat(comp.quantity) * packQty),
        transactionType: direction,
        referenceId: bl.document.documentNumber,
        reason: `${reasonPrefix} — pack "${packLine.pack.name}" × ${packQty} in ${bl.document.documentNumber}`,
        userId: user.id,
        bonLivraisonId: bl.id,
      });
    }
  }

  return items;
};

/* ============================================================
   FULL INCLUDE BLOCK (read operations)
============================================================ */
const FULL_ADVANCED_BL_INCLUDE = {
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
  banque: { select: { id: true, name: true, RIB: true } },
  depot: { select: { id: true, code: true, name: true } },
  delivery: { select: { id: true, name: true, tel: true } },
  agence: { select: { id: true, name: true, localisation: true } },
  commercial: { select: { id: true, name: true, email: true } },
  preparateur: { select: { id: true, name: true, email: true } },
  reportedBy: { select: { id: true, name: true, email: true } },
  livreur: {
    select: {
      id: true,
      name: true,
      type: true,
      tel: true,
      user: { select: { id: true, email: true } },
    },
  },
  packLines: {
    include: {
      pack: {
        select: {
          id: true,
          barcode: true,
          name: true,
          prixVentePack: true,
          components: {
            include: {
              article: { select: { id: true, name: true, gereEnStock: true } },
              variant: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  },
  stockTransactions: {
    include: {
      article: { select: { id: true, name: true } },
      variant: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  },
  statusHistory: {
    select: {
      id: true,
      status: true,
      note: true,
      createdAt: true,
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { createdAt: "asc" },
  },
};

/* ============================================================
   CREATE ADVANCED BON LIVRAISON

   Creates a ClientDocument + BonLivraison with type = ADVANCED
   and commandStatus = EN_COURS.

   Stock is NOT deducted at creation — only at status LIVRE.
============================================================ */
export const create = async (data, user) => {
  const {
    clientName,
    depotId,
    deliveryId,
    commandeId,
    documentDate,
    dateLivraison,
    heureLivraison,
    lines = [],
    packLines = [],
    montantPaid,
    clientId,
    saveAsClient,
    updateClientLocation,
    // Advanced fields
    agenceId,
    telephone,
    whatsapp,
    ville,
    localisation,
    withFacture,
    raisonSocial,
    ice,
    siegeSocial,
    nombreDeColis,
    observation,
    modeReglement,
    modeReglementAvance,
    banqueId,
    commercialId,
    preparateurId,
    livreurId,
    commandStatus,
    providerConfigId,
  } = data;

  const requestedPaid = parseFloat(montantPaid || 0);
  const creditMode =
    requestedPaid > 0 ? (modeReglementAvance || modeReglement) : null;
  if (
    requestedPaid > 0 &&
    MODES_REQUIRING_BANK.includes(creditMode) &&
    !banqueId
  ) {
    throw new ApiError(
      `banqueId is required for ${creditMode}. Select a bank to credit its wallet.`,
      400,
    );
  }

  // Initial status: EN_COURS (draft) or CONFIRME (skip approval step).
  const ALLOWED_INITIAL_STATUSES = ["EN_COURS", "CONFIRME"];
  const initialStatus = commandStatus || "EN_COURS";
  if (!ALLOWED_INITIAL_STATUSES.includes(initialStatus)) {
    throw new ApiError(
      `commandStatus must be one of: ${ALLOWED_INITIAL_STATUSES.join(", ")}`,
      400,
    );
  }

  // Commercial role auto-assignment: a logged-in commercial owns the BL.
  const effectiveCommercialId =
    user.roleName === "Commercial" ? user.id : commercialId || null;

  await timeRangeUtility.validateSystemHours(
    new Date(),
    "advanced bon livraison creation",
  );

  if (!clientName || !clientName.trim()) {
    throw new ApiError("clientName is required", 400);
  }

  // Validate depot — depot drives the société for the document
  if (!depotId) throw new ApiError("Depot is required", 400);
  const depot = await prisma.depot.findFirst({
    where: {
      id: depotId,
      ...(user.isSuperAdmin ? {} : { societeId: user.societeId }),
    },
    select: { id: true, societeId: true, active: true },
  });
  if (!depot) throw new ApiError("Depot not found or access denied", 404);
  if (!depot.active) throw new ApiError("Cannot use inactive depot", 400);

  const docSocieteId = depot.societeId;

  // Validate agence if provided
  if (agenceId) {
    const agence = await prisma.agence.findFirst({
      where: { id: agenceId, societeId: docSocieteId, active: true },
    });
    if (!agence) throw new ApiError("Agence not found or inactive", 404);
  }

  // Validate article lines
  if (lines.length > 0) {
    await validateLines(lines);
    lines.forEach((line, i) => {
      if (!line.priceField) {
        throw new ApiError(`Line ${i + 1}: priceField is required`, 400);
      }
    });
  }

  // Validate pack lines
  if (packLines.length > 0) {
    for (let i = 0; i < packLines.length; i++) {
      const pl = packLines[i];
      if (!pl.id)
        throw new ApiError(`Pack line ${i + 1}: id (packId) is required`, 400);
      const pack = await prisma.pack.findFirst({
        where: { id: pl.id, societeId: docSocieteId, active: true },
      });
      if (!pack) throw new ApiError(`Pack ${pl.id} not found or inactive`, 404);
    }
  }

  if (lines.length === 0 && packLines.length === 0) {
    throw new ApiError(
      "At least one article line or pack line is required",
      400,
    );
  }

  const documentNumber = await generateDocumentNumber(docSocieteId);

  // ── Step 1: resolve livreur type BEFORE the transaction ────────────────────
  // Determines whether an external parcel must be created after the BL saves.
  // ── Step 1: resolve livreur type BEFORE the transaction ────────────────────
  // type=EXTERN + entityType=SOCIETE + known provider → company API integration
  // type=EXTERN + entityType=PARTICULIER               → individual, local only
  // type=INTERN                                        → internal, local only
  let livreurIsExtern = false; // true only for EXTERN+SOCIETE with a known provider
  let providerCode = null;
  let externEntityType = null; // "SOCIETE" | "PARTICULIER" | null
  if (livreurId) {
    const livreur = await prisma.delivery.findUnique({
      where: { id: livreurId },
      select: { type: true, entityType: true, name: true },
    });
    if (livreur?.type === "EXTERN") {
      externEntityType = livreur.entityType; // "SOCIETE" or "PARTICULIER"
      if (livreur.entityType === "SOCIETE") {
        providerCode = PROVIDER_BY_NAME[livreur.name?.toLowerCase()] ?? null;
        livreurIsExtern = !!providerCode;
      }
      // PARTICULIER: externEntityType is set but livreurIsExtern stays false
      // → no provider API, no queue, colisSync stays NOT_APPLICABLE
    }
  }

  try {
    const result = await prisma.$transaction(
      async (tx) => {
        // Process article lines — TTC pricing, no TVA/remise math
        const linesWithFinancials = [];
        let articlesCommission = 0;
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const article = await resolveLineArticle(
            tx,
            line.articleId,
            line.variantId,
          );
          if (!article)
            throw new ApiError(`Line ${i + 1}: Product not found`, 404);

          const quantity = parseFloat(line.quantity);
          const unitPriceTTC = parseFloat(line.unitPrice);
          const totalTTC = parseFloat((quantity * unitPriceTTC).toFixed(2));
          const unitCommission = parseFloat(article.commission || 0);
          articlesCommission += unitCommission * quantity;

          linesWithFinancials.push({
            articleId: line.articleId || null,
            variantId: line.variantId || null,
            lineNumber: i + 1,
            description: line.description || article.name,
            quantity,
            unitPrice: unitPriceTTC,
            remise: 0,
            commission: unitCommission,
            totalHT: totalTTC,
            tvaRate: 0,
            totalTVA: 0,
            totalTTC,
            priceField: line.priceField,
          });
        }

        // Pack line totals (prixVente × quantity), TTC + commission snapshot
        let packTotalTTC = 0;
        let packsCommission = 0;
        const packLinesWithCommission = [];
        for (const pl of packLines) {
          const pack = await tx.pack.findFirst({
            where: { id: pl.id, societeId: docSocieteId, active: true },
            select: { id: true, commission: true },
          });
          const qty = parseFloat(pl.quantity);
          const unitCommission = parseFloat(pack?.commission || 0);
          packTotalTTC += parseFloat(pl.prixVente) * qty;
          packsCommission += unitCommission * qty;
          packLinesWithCommission.push({
            bonLivraisonId: null, // filled below
            packId: pl.id,
            quantity: qty,
            prixVente: parseFloat(pl.prixVente),
            commission: unitCommission,
          });
        }

        const articlesTotalTTC = linesWithFinancials.reduce(
          (acc, l) => acc + l.totalTTC,
          0,
        );

        const totalTTC = parseFloat(
          (articlesTotalTTC + packTotalTTC).toFixed(2),
        );
        const totalHT = totalTTC;
        const totalTVA = 0;
        const totalCommission = parseFloat(
          (articlesCommission + packsCommission).toFixed(2),
        );

        // Payment: clamp montantPaid to [0, totalTTC]
        const paid = Math.max(
          0,
          Math.min(parseFloat(montantPaid || 0), totalTTC),
        );
        const amountPaid = parseFloat(paid.toFixed(2));
        const amountDue = totalTTC;

        const phone = typeof telephone === "string" ? telephone.trim() : null;
        const villeName = resolveVilleName(ville);
        const address = resolveAddress(localisation);
        const wantsFacture = withFacture === true || withFacture === "true";
        const iceValue =
          wantsFacture && typeof ice === "string" && /^\d{15}$/.test(ice.trim())
            ? ice.trim()
            : null;
        const factureRaison = wantsFacture && typeof raisonSocial === "string" && raisonSocial.trim()
          ? raisonSocial.trim()
          : null;
        const factureSiege = wantsFacture && typeof siegeSocial === "string" && siegeSocial.trim()
          ? siegeSocial.trim()
          : null;

        let linkedClientId = null;
        let createdNewClient = false;

        if (clientId) {
          const existingById = await tx.client.findFirst({
            where: { id: Number(clientId), societeId: docSocieteId },
            select: { id: true },
          });
          if (!existingById) {
            throw new ApiError("Client not found or access denied", 404);
          }
          linkedClientId = existingById.id;
        } else if (saveAsClient && phone) {
          const phoneVariants = getPhoneSearchVariants(phone);
          const existingByPhone = await tx.client.findFirst({
            where: {
              societeId: docSocieteId,
              phone: { in: phoneVariants },
            },
            select: { id: true },
          });

          if (existingByPhone) {
            linkedClientId = existingByPhone.id;
          } else {
            let clientIce = null;
            let clientType = "PARTICULIER";
            if (iceValue) {
              const iceTaken = await tx.client.findFirst({
                where: { societeId: docSocieteId, ice: iceValue },
                select: { id: true },
              });
              if (!iceTaken) {
                clientIce = iceValue;
                clientType = "SOCIETE";
              }
            }

            const createdClient = await tx.client.create({
              data: {
                societeId: docSocieteId,
                name: clientName.trim(),
                phone,
                address,
                city: villeName,
                region: villeName,
                ice: clientIce,
                type: clientType,
              },
              select: { id: true },
            });
            linkedClientId = createdClient.id;
            createdNewClient = true;
          }
        }

        if (linkedClientId && !createdNewClient && updateClientLocation !== false) {
          await persistClientLocation(tx, linkedClientId, { villeName, address });
        }

        const clientDocument = await tx.clientDocument.create({
          data: {
            societeId: docSocieteId,
            clientId: linkedClientId,
            clientName: clientName.trim(),
            documentNumber,
            status: "DRAFT",
            totalHT,
            totalTVA,
            totalTTC,
            discount: 0,
            amountPaid,
            amountDue,
            createdBy: user.id,
          },
        });

        // Create BonLivraison with type = ADVANCED
        await tx.bonLivraison.create({
          data: {
            id: clientDocument.id,
            documentDate: documentDate ? new Date(documentDate) : new Date(),
            // dateLivraison is NOT NULL in the schema — default to the document date
            dateLivraison: dateLivraison
              ? new Date(dateLivraison)
              : documentDate
                ? new Date(documentDate)
                : new Date(),
            depotId,
            deliveryId: deliveryId || null,
            commandeId: commandeId || null,
            // Advanced fields
            type: "ADVANCED",
            commandStatus: initialStatus,
            agenceId: agenceId || null,
            heureLivraison: heureLivraison || null,
            telephone: telephone || null,
            whatsapp: whatsapp || null,
            ville: villeName,
            localisation: address,
            withFacture: wantsFacture,
            raisonSocial: factureRaison,
            ice: iceValue,
            siegeSocial: factureSiege,
            nombreDeColis: nombreDeColis || null,
            observation: observation || null,
            modeReglement: modeReglement || null,
            banqueId: banqueId || null,
            commercialId: effectiveCommercialId,
            preparateurId: preparateurId || null,
            livreurId: livreurId || null,
            totalCommission,
            // ── Step 2: stamp colis sync state + selected provider config ───
            colisSync: livreurIsExtern ? "PENDING" : "NOT_APPLICABLE",
            colisProvider: livreurIsExtern ? providerCode : null,
            providerConfigId: livreurIsExtern
              ? (providerConfigId ?? null)
              : null,
          },
        });

        // Create article lines
        if (linesWithFinancials.length > 0) {
          await tx.clientDocumentLine.createMany({
            data: linesWithFinancials.map((l) => ({
              ...l,
              documentId: clientDocument.id,
            })),
          });
        }

        // Create pack lines
        if (packLinesWithCommission.length > 0) {
          await tx.bonLivraisonPackLine.createMany({
            data: packLinesWithCommission.map((pl) => ({
              bonLivraisonId: clientDocument.id,
              packId: pl.packId,
              quantity: pl.quantity,
              prixVente: pl.prixVente,
              commission: pl.commission,
            })),
          });
        }

        // Initial status entry — anchors the audit trail
        await tx.bonLivraisonStatusHistory.create({
          data: {
            bonId: clientDocument.id,
            status: initialStatus,
            userId: user.id,
          },
        });

        if (amountPaid > 0) {
          await creditOrderPayment(tx, {
            societeId: docSocieteId,
            modeReglement: creditMode,
            banqueId,
            amount: amountPaid,
            userId: user.id,
            clientId: linkedClientId,
            documentNumber,
            documentDue: amountDue,
          });
        }

        return tx.bonLivraison.findUnique({
          where: { id: clientDocument.id },
          include: FULL_ADVANCED_BL_INCLUDE,
        });
      },
      { timeout: 30000 },
    );

    // ── Step 3: schedule colis creation AFTER transaction commits ─────────────
    // Never call the Ameex API inside a Prisma transaction.
    // Runs in-process (fire-and-forget) — no Redis / separate worker.
    // TODO: map result.ville (free text) to a numeric Ameex city ID before production.
    if (livreurIsExtern) {
      enqueueCreateColis(
        result.id,
        providerCode,
        providerConfigId ?? null,
        {
          receiver: clientName,
          phone: telephone ?? null,
          city: ville.id, // TODO: resolve numeric city ID from ville string before production
          address: localisation ?? null,
          cod: parseFloat(
            (
              parseFloat(result.document?.amountDue ?? 0) -
              parseFloat(result.document?.amountPaid ?? 0)
            ).toFixed(2),
          ),
          order_num: result.document?.documentNumber ?? null,
          comment: observation ?? null,
          product: null,
        },
      );
    }

    return result;
  } catch (error) {
    if (error.code === "P2002") {
      const target = error.meta?.target;
      const targetStr = Array.isArray(target)
        ? target.join(",")
        : String(target || "");
      if (targetStr.includes("phone")) {
        throw new ApiError("Phone number already exists for a client", 409);
      }
      throw new ApiError("Duplicate document number", 409);
    }
    if (error.code === "P2003") throw new ApiError("Invalid reference", 400);
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      `Failed to create advanced bon livraison: ${error.message}`,
      500,
    );
  }
};

/* ============================================================
   TRANSITION STATUS

   Enforces the workflow state machine.
   Stock deduction (OUTBOUND) happens ONLY on transition to LIVRE.
   Pack components are exploded into individual stock transactions.
============================================================ */
export const transitionStatus = async (id, targetStatus, user) => {
  await timeRangeUtility.validateSystemHours(
    new Date(),
    "advanced BL status transition",
  );

  const bl = await prisma.bonLivraison.findUnique({
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
                  variant: { select: { id: true, articleId: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!bl) throw new ApiError("Advanced bon livraison not found", 404);
  if (bl.type !== "ADVANCED") {
    throw new ApiError(
      "This endpoint is only for ADVANCED bon livraisons",
      400,
    );
  }
  if (!user.isSuperAdmin && bl.document.societeId !== user.societeId) {
    throw new ApiError("Access denied", 403);
  }

  if (bl.isSuspended) {
    throw new ApiError(
      "Cannot transition while BL is suspended. Resume it first.",
      409,
    );
  }

  const currentStatus = bl.commandStatus;
  if (!currentStatus)
    throw new ApiError("BonLivraison has no workflow status", 400);

  const allowed = ALLOWED_TRANSITIONS[currentStatus];
  if (!allowed || !allowed.includes(targetStatus)) {
    throw new ApiError(
      `Cannot transition from ${currentStatus} to ${targetStatus}. Allowed: ${(allowed || []).join(", ") || "none (terminal state)"}`,
      400,
    );
  }

  // Role-based gate (SuperAdmin bypasses)
  if (!user.isSuperAdmin) {
    const allowedForRole = ROLE_TRANSITIONS[user.roleName];
    if (
      allowedForRole &&
      !allowedForRole.has(`${currentStatus}->${targetStatus}`)
    ) {
      throw new ApiError(
        `Role ${user.roleName} cannot perform ${currentStatus} → ${targetStatus}`,
        403,
      );
    }
  }

  // Livreur must have an open shift before LIVRE / PAYE
  if (
    user.roleName === "Livreur" &&
    (targetStatus === "LIVRE" || targetStatus === "PAYE")
  ) {
    await requireActiveShiftForLivreur(user);
  }

  // Stock impact:
  //   PREPARE                                 → OUTBOUND (apply)
  //   ANNULE from {PREPARE, COLLECTE, EN_ROUTE} → INBOUND  (rollback)
  const isStockApply = targetStatus === "PREPARE";
  const isStockRollback =
    targetStatus === "ANNULE" &&
    ["PREPARE", "COLLECTE", "EN_ROUTE"].includes(currentStatus);

  let stockItems = [];
  if (isStockApply || isStockRollback) {
    stockItems = await collectStockItems(
      bl,
      user,
      isStockApply ? "OUTBOUND" : "INBOUND",
    );
  }

  if (isStockApply && stockItems.length > 0) {
    await stockValidationService.validateBatchStockAvailabilityForBonLivraison(
      stockItems.map((item) => ({
        depotId: item.depotId,
        articleId: item.articleId,
        variantId: item.variantId,
        quantity: Math.abs(item.quantityChange),
      })),
      `advanced BL ${bl.document.documentNumber}`,
      bl.id,
    );
  }

  const result = await prisma.$transaction(
    async (tx) => {
      if (isStockApply && stockItems.length > 0) {
        // PREPARE → OUTBOUND: record stock transactions (needed for remove cleanup)
        await stockManagementService.batchStockOperationsWithTx(tx, stockItems);
      } else if (isStockRollback && stockItems.length > 0) {
        // ANNULE rollback: directly reverse stock levels without creating new
        // transaction records — deleteMany in remove() cleans the originals.
        for (const item of stockItems) {
          const where = item.articleId
            ? { depotId: item.depotId, articleId: item.articleId }
            : { depotId: item.depotId, variantId: item.variantId };
          const stock = await tx.stockByDepot.findFirst({ where });
          if (stock) {
            await tx.stockByDepot.update({
              where: { id: stock.id },
              data: {
                quantityAvailable:
                  parseFloat(stock.quantityAvailable) +
                  Math.abs(parseFloat(item.quantityChange)),
              },
            });
          }
        }
      }

      await tx.bonLivraison.update({
        where: { id },
        data: { commandStatus: targetStatus },
      });

      if (targetStatus === "ANNULE") {
        await tx.clientDocument.update({
          where: { id },
          data: { status: "CANCELLED", amountPaid: 0 },
        });
      } else if (targetStatus === "LIVRE") {
        await tx.clientDocument.update({
          where: { id },
          data: { status: "COMPLETED" },
        });
        await linkOrderToActiveShift(tx, {
          user,
          bonLivraisonId: id,
          status: "LIVRE",
          amount: parseFloat(bl.document.totalTTC || 0),
        });
      } else if (targetStatus === "PAYE") {
        // Payment settled: amountPaid = total due, amountDue → 0.
        const totalTTC = parseFloat(bl.document.totalTTC);
        const previousPaid = parseFloat(bl.document.amountPaid || 0);
        const remaining = parseFloat((totalTTC - previousPaid).toFixed(2));
        await tx.clientDocument.update({
          where: { id },
          data: {
            amountPaid: totalTTC,
          },
        });
        if (remaining > 0) {
          await creditOrderPayment(tx, {
            societeId: bl.document.societeId,
            modeReglement: bl.modeReglement,
            banqueId: bl.banqueId,
            amount: remaining,
            userId: user.id,
            clientId: bl.document.clientId,
            documentNumber: bl.document.documentNumber,
            documentDue: totalTTC,
          });
        }
        await linkOrderToActiveShift(tx, {
          user,
          bonLivraisonId: id,
          status: "PAYE",
          amount: totalTTC,
        });
      }

      await tx.bonLivraisonStatusHistory.create({
        data: { bonId: id, status: targetStatus, userId: user.id },
      });

      return tx.bonLivraison.findUnique({
        where: { id },
        include: FULL_ADVANCED_BL_INCLUDE,
      });
    },
    { timeout: 30000 },
  );

  return {
    ...result,
    transition: {
      from: currentStatus,
      to: targetStatus,
      stockApplied: isStockApply,
      stockRolledBack: isStockRollback,
    },
  };
};

/* ============================================================
   REPORT BL (parallel operational condition)

   Marks a BL as temporarily postponed without changing
   commandStatus or moving stock. Records a REPORTE event
   in the status history.
============================================================ */
const REPORTABLE_STATUSES = ["CONFIRME", "PREPARE", "COLLECTE", "EN_ROUTE"];

export const reportBL = async (id, data, user) => {
  const { reason, nextDeliveryDate } = data;

  if (!reason || !reason.trim()) {
    throw new ApiError("reason is required", 400);
  }
  if (!nextDeliveryDate) {
    throw new ApiError("nextDeliveryDate is required", 400);
  }

  const bl = await prisma.bonLivraison.findUnique({
    where: { id },
    select: {
      id: true,
      type: true,
      isReported: true,
      commandStatus: true,
      document: { select: { societeId: true } },
    },
  });

  if (!bl) throw new ApiError("Advanced bon livraison not found", 404);
  if (bl.type !== "ADVANCED") {
    throw new ApiError(
      "This endpoint is only for ADVANCED bon livraisons",
      400,
    );
  }
  if (!user.isSuperAdmin && bl.document.societeId !== user.societeId) {
    throw new ApiError("Access denied", 403);
  }

  if (!REPORTABLE_STATUSES.includes(bl.commandStatus)) {
    throw new ApiError(
      `Cannot report a BL in status ${bl.commandStatus}. Allowed: ${REPORTABLE_STATUSES.join(", ")}`,
      400,
    );
  }

  return prisma.$transaction(async (tx) => {
    await tx.bonLivraison.update({
      where: { id },
      data: {
        isReported: true,
        reportedAt: new Date(),
        reportedById: user.id,
        reportReason: reason.trim(),
        nextDeliveryDate: new Date(nextDeliveryDate),
      },
    });

    await tx.bonLivraisonStatusHistory.create({
      data: {
        bonId: id,
        status: "REPORTE",
        note: reason.trim(),
        userId: user.id,
      },
    });

    return tx.bonLivraison.findUnique({
      where: { id },
      include: FULL_ADVANCED_BL_INCLUDE,
    });
  });
};

/* ============================================================
   RESUME REPORTED BL

   Clears the reported flag and metadata. commandStatus is
   untouched — the workflow continues from where it paused.
   No history entry is written (resume is not a transition).
============================================================ */
export const resumeReportedBL = async (id, user) => {
  const bl = await prisma.bonLivraison.findUnique({
    where: { id },
    select: {
      id: true,
      type: true,
      isReported: true,
      document: { select: { societeId: true } },
    },
  });

  if (!bl) throw new ApiError("Advanced bon livraison not found", 404);
  if (bl.type !== "ADVANCED") {
    throw new ApiError(
      "This endpoint is only for ADVANCED bon livraisons",
      400,
    );
  }
  if (!user.isSuperAdmin && bl.document.societeId !== user.societeId) {
    throw new ApiError("Access denied", 403);
  }
  if (!bl.isReported) {
    throw new ApiError("BL is not reported", 409);
  }

  return prisma.bonLivraison.update({
    where: { id },
    data: {
      isReported: false,
      reportedAt: null,
      reportedById: null,
      reportReason: null,
      nextDeliveryDate: null,
    },
    include: FULL_ADVANCED_BL_INCLUDE,
  });
};

/* ============================================================
   SUSPENDED / RESUME BL

   Toggles the isSuspended flag on a BL.
   - isSuspended false → true : logs SUSPENDED in history.
   - isSuspended true  → false: logs CONTINUED in history.

   While isSuspended = true, transitionStatus is blocked (409).
============================================================ */
export const suspended = async (id, user) => {
  const bl = await prisma.bonLivraison.findUnique({
    where: { id },
    select: {
      id: true,
      type: true,
      isSuspended: true,
      document: { select: { societeId: true } },
    },
  });

  if (!bl) throw new ApiError("Advanced bon livraison not found", 404);
  if (bl.type !== "ADVANCED") {
    throw new ApiError("This is not an advanced bon livraison", 400);
  }
  if (!user.isSuperAdmin && bl.document.societeId !== user.societeId) {
    throw new ApiError("Access denied", 403);
  }

  const newState = !bl.isSuspended;
  const historyStatus = newState ? "SUSPENDED" : "CONTINUED";

  return prisma.$transaction(async (tx) => {
    await tx.bonLivraison.update({
      where: { id },
      data: { isSuspended: newState },
    });

    await tx.bonLivraisonStatusHistory.create({
      data: { bonId: id, status: historyStatus, userId: user.id },
    });

    return tx.bonLivraison.findUnique({
      where: { id },
      include: FULL_ADVANCED_BL_INCLUDE,
    });
  });
};

/* ============================================================
   GET ALL ADVANCED BON LIVRAISONS
============================================================ */
export const getAll = async (query, user) => {
  const {
    search,
    livreurId,
    commercialId,
    preparateurId,
    agenceId,
    commandStatus,
    page = 1,
    limit = 50,
  } = query;

  // ── Role-based scope ───────────────────────────────────────────
  // Admins      → société (or global) visibility
  // Livreur     → only BLs assigned to their Delivery.id, restricted to
  //               execution-phase statuses
  //               (PREPARE, COLLECTE, EN_ROUTE, LIVRE).
  // Preparateur → only BLs assigned to themselves, restricted to
  //               commandStatus = CONFIRME (ready to prepare).
  // Commercial  → only BLs they own (commercialId = user.id).
  // Other roles → orders they created or own as commercial.
  const roleScope = {};
  if (!isAdminLevelUser(user)) {
    if (user.roleName === "Livreur") {
      roleScope.livreurId = await resolveLivreurDeliveryId(user.id);
      roleScope.commandStatus = {
        in: ["PREPARE", "COLLECTE", "EN_ROUTE", "LIVRE"],
      };
    } else if (user.roleName === "Preparateur") {
      roleScope.preparateurId = user.id;
      roleScope.commandStatus = "CONFIRME";
    } else if (user.roleName === "Commercial") {
      roleScope.commercialId = user.id;
    } else {
      roleScope.AND = [
        {
          OR: [
            { document: { createdBy: user.id } },
            { commercialId: user.id },
          ],
        },
      ];
    }
  }

  const where = {
    type: "ADVANCED",
    document: user.isSuperAdmin ? undefined : { societeId: user.societeId },
    ...(search && {
      OR: [
        { document: { clientName: { contains: search } } },
        { ville: { contains: search } },
      ],
    }),
    ...(agenceId && { agenceId: parseInt(agenceId) }),
    ...(commandStatus && { commandStatus }),
    ...(commercialId && { commercialId: parseInt(commercialId) }),
    ...(preparateurId && { preparateurId: parseInt(preparateurId) }),
    ...(livreurId && { livreurId: parseInt(livreurId) }),
    ...roleScope,
  };

  const parsedPage = parseInt(page);
  const parsedLimit = parseInt(limit);

  const [total, rows] = await Promise.all([
    prisma.bonLivraison.count({ where }),
    prisma.bonLivraison.findMany({
      where,
      select: {
        id: true,
        ville: true,
        whatsapp: true,
        dateLivraison: true,
        heureLivraison: true,
        commandStatus: true,
        isReported: true,
        isSuspended: true,
        nextDeliveryDate: true,
        colisTrackingNumber: true,
        withFacture: true,
        ice: true,
        raisonSocial: true,
        siegeSocial: true,
        document: {
          select: { clientName: true, amountDue: true, amountPaid: true },
        },
        agence: { select: { name: true } },
      },
      orderBy: [{ documentDate: "desc" }, { createdAt: "desc" }],
      skip: (parsedPage - 1) * parsedLimit,
      take: parsedLimit,
    }),
  ]);

  const fmt = (d) =>
    d
      ? new Date(d).toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : null;

  const data = rows.map((bl) => ({
    id: bl.id,
    clientName: bl.document?.clientName ?? null,
    whatsapp: bl.whatsapp,
    ville: bl.ville,
    agenceName: bl.agence?.name ?? null,
    dateLivraison: fmt(bl.dateLivraison),
    heureLivraison: bl.heureLivraison,
    amountDue: bl.document?.amountDue ? parseFloat(bl.document.amountDue) : 0,
    amountPaid: bl.document?.amountPaid
      ? parseFloat(bl.document.amountPaid)
      : 0,
    commandStatus: bl.commandStatus,
    isReported: bl.isReported,
    isSuspended: bl.isSuspended,
    colisTrackingNumber: bl.colisTrackingNumber,
    nextDeliveryDate: fmt(bl.nextDeliveryDate),
    isFacture: bl.withFacture === true || !!(bl.ice || bl.raisonSocial || bl.siegeSocial),
  }));

  return {
    data,
    pagination: {
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit),
    },
  };
};

/* ============================================================
   GET BY ID
============================================================ */
export const getById = async (id, user) => {
  const bl = await prisma.bonLivraison.findUnique({
    where: { id },
    include: {
      ...FULL_ADVANCED_BL_INCLUDE,
      document: {
        include: {
          ...FULL_ADVANCED_BL_INCLUDE.document.include,
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
        },
      },
    },
  });

  if (!bl) throw new ApiError("Advanced bon livraison not found", 404);
  if (bl.type !== "ADVANCED") {
    throw new ApiError("This is not an advanced bon livraison", 400);
  }
  if (!user.isSuperAdmin && bl.document.societe.id !== user.societeId) {
    throw new ApiError("Access denied", 403);
  }

  return bl;
};

/* ============================================================
   GET STEPPER TIMELINE

   Builds the UI-ready lifecycle timeline for an Advanced BL.
   Shape: [{ key, label, status, user, datetime }, ...]
   - status: "confirmed" (past), "in_progress" (current), "pending" (future)
   - REPORTE / ANNULE never appear here — the stepper shows only the
     7 lifecycle steps. ANNULE keeps reached steps as "confirmed".
============================================================ */
const STEPPER_STEPS = [
  { key: "EN_COURS", label: "En cours" },
  { key: "CONFIRME", label: "Commande crée" },
  { key: "PREPARE", label: "Commande préparée" },
  { key: "COLLECTE", label: "Commande collectée" },
  { key: "EN_ROUTE", label: "En route" },
  { key: "LIVRE", label: "Livrée" },
  { key: "PAYE", label: "Payée" },
];

const formatStepDateTime = (date) => {
  if (!date) return "—";
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, "0");
  return `${pad(d.getDate())}-${pad(d.getMonth() + 1)}-${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

// Pure mapper — used by both /timeline and /details endpoints.
const buildStepperTimeline = (commandStatus, statusHistory) => {
  const firstByStatus = new Map();
  for (const entry of statusHistory) {
    if (!firstByStatus.has(entry.status)) {
      firstByStatus.set(entry.status, entry);
    }
  }

  return STEPPER_STEPS.reduce((acc, step) => {
    const entry = firstByStatus.get(step.key);
    const reached = !!entry;
    const isCurrent = commandStatus === step.key;

    // Skip EN_COURS if no history entry exists (no actor or timestamp recorded)
    if (step.key === "EN_COURS" && !entry) return acc;

    acc.push({
      key: step.key,
      label: step.label,
      status: isCurrent ? "in_progress" : reached ? "confirmed" : "pending",
      user: entry?.user?.name ?? "—",
      datetime: formatStepDateTime(entry?.createdAt),
    });

    return acc;
  }, []);
};

/* ============================================================
   GET ADVANCED BL DETAILS

   Single aggregation endpoint that returns the full UI payload:
   { timeline, destinataire, blInfo, propos, history }.

   Reuses the timeline mapper to guarantee consistency with
   /:id/timeline. One Prisma round-trip serves the whole view.
============================================================ */
export const getAdvancedBLDetails = async (id, user) => {
  const bl = await prisma.bonLivraison.findUnique({
    where: { id },
    select: {
      id: true,
      type: true,
      commandStatus: true,
      createdAt: true,
      updatedAt: true,
      dateLivraison: true,
      heureLivraison: true,
      telephone: true,
      whatsapp: true,
      ville: true,
      localisation: true,
      observation: true,
      totalCommission: true,
      commercial: { select: { id: true, name: true } },
      document: {
        select: {
          societeId: true,
          clientId: true,
          clientName: true,
          client: { select: { id: true, name: true, phone: true } },
          amountDue: true,
          amountPaid: true,
          createdAt: true,
          user: { select: { name: true } },
          lines: {
            select: {
              lineNumber: true,
              description: true,
              quantity: true,
              unitPrice: true,
              commission: true,
              totalTTC: true,
              article: { select: { id: true, name: true } },
              variant: { select: { id: true, name: true } },
            },
            orderBy: { lineNumber: "asc" },
          },
        },
      },
      agence: { select: { name: true } },
      preparateur: { select: { name: true } },
      livreur: { select: { name: true } },
      packLines: {
        select: {
          quantity: true,
          prixVente: true,
          commission: true,
          pack: { select: { id: true, name: true } },
        },
      },
      statusHistory: {
        select: {
          status: true,
          note: true,
          createdAt: true,
          user: { select: { name: true } },
        },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!bl) throw new ApiError("Advanced bon livraison not found", 404);
  if (bl.type !== "ADVANCED") {
    throw new ApiError("This is not an advanced bon livraison", 400);
  }
  if (!user.isSuperAdmin && bl.document.societeId !== user.societeId) {
    throw new ApiError("Access denied", 403);
  }

  const timeline = buildStepperTimeline(bl.commandStatus, bl.statusHistory);

  const destinataire = {
    clientName: bl.document.clientName ?? null,
    clientId: bl.document.clientId ?? null,
    linkedClientName: bl.document.client?.name ?? null,
    telephone: bl.telephone ?? null,
    whatsapp: bl.whatsapp ?? null,
    ville: bl.ville ?? null,
    localisation: bl.localisation ?? null,
    withFacture: bl.withFacture === true,
    ice: bl.ice ?? null,
    raisonSocial: bl.raisonSocial ?? null,
    siegeSocial: bl.siegeSocial ?? null,
  };

  const products = [
    ...bl.document.lines.map((l) => ({
      kind: "article",
      name: l.article?.name || l.variant?.name || l.description || "—",
      quantity: parseFloat(l.quantity),
      unitPrice: parseFloat(l.unitPrice),
      commission: parseFloat(l.commission || 0),
      commissionTotal: parseFloat(
        (parseFloat(l.commission || 0) * parseFloat(l.quantity)).toFixed(2),
      ),
      total: parseFloat(l.totalTTC),
    })),
    ...bl.packLines.map((pl) => ({
      kind: "pack",
      name: pl.pack?.name ?? "—",
      quantity: parseFloat(pl.quantity),
      unitPrice: parseFloat(pl.prixVente),
      commission: parseFloat(pl.commission || 0),
      commissionTotal: parseFloat(
        (parseFloat(pl.commission || 0) * parseFloat(pl.quantity)).toFixed(2),
      ),
      total: parseFloat(
        (parseFloat(pl.prixVente) * parseFloat(pl.quantity)).toFixed(2),
      ),
    })),
  ];

  const blInfo = {
    montantDue: parseFloat(bl.document.amountDue || 0),
    montantPaid: parseFloat(bl.document.amountPaid || 0),
    totalCommission: parseFloat(bl.totalCommission || 0),
    commercialName: bl.commercial?.name ?? null,
    commercialId: bl.commercial?.id ?? null,
    products,
  };

  const propos = {
    dateLivraison: formatStepDateTime(bl.dateLivraison),
    heureLivraison: bl.heureLivraison ?? "—",
    agenceName: bl.agence?.name ?? "—",
    livreurName: bl.livreur?.name ?? "—",
    preparateurName: bl.preparateur?.name ?? "—",
    observation: bl.observation ?? null,
  };

  // Build the audit history in chronological order.
  const events = [];

  events.push({
    type: "creation",
    user: bl.document.user?.name ?? "—",
    datetime: formatStepDateTime(bl.createdAt),
    _ts: bl.createdAt,
  });

  for (const entry of bl.statusHistory) {
    let type;
    let includeStatus = true;
    if (entry.status === "ANNULE") type = "annulation";
    else if (entry.status === "REPORTE") type = "reporte";
    else if (entry.status === "UPDATE") {
      type = "update";
      includeStatus = false;
    } else if (entry.status === "SUSPENDED") {
      type = "suspended";
      includeStatus = false;
    } else if (entry.status === "CONTINUED") {
      type = "continued";
      includeStatus = false;
    } else type = "transitionStatus";

    events.push({
      type,
      ...(includeStatus && { status: entry.status }),
      user: entry.user?.name ?? "—",
      datetime: formatStepDateTime(entry.createdAt),
      ...(entry.note ? { note: entry.note } : {}),
      _ts: entry.createdAt,
    });
  }

  events.sort((a, b) => new Date(a._ts).getTime() - new Date(b._ts).getTime());
  const history = events.map(({ _ts, ...rest }) => rest);

  return { timeline, destinataire, blInfo, propos, history };
};

/* ============================================================
   UPDATE ADVANCED BON LIVRAISON

   Editability rules:
     - EN_COURS / CONFIRME → fully editable (lines, packs, totals included)
     - PREPARE / COLLECTE / EN_ROUTE / LIVRE / PAYE → restricted edit
       (only auxiliary, non-stock-impacting fields)
     - ANNULE → frozen (no edits)

   All prices are TTC — no TVA / no remise math.
============================================================ */
const FULL_EDIT_STATUSES = ["EN_COURS", "CONFIRME"];
const FROZEN_STATUSES = ["ANNULE"];

// Whitelist of fields editable when commandStatus has progressed past CONFIRME.
// Anything stock-impacting (lines, packLines, depot, montantPaid, …) is excluded.
const RESTRICTED_EDIT_FIELDS = new Set([
  "clientName",
  "telephone",
  "whatsapp",
  "dateLivraison",
  "heureLivraison",
  "ville",
  "localisation",
  "withFacture",
  "raisonSocial",
  "ice",
  "siegeSocial",
  "nombreDeColis",
  "observation",
  "modeReglement",
  "banqueId",
  "agenceId",
  "preparateurId",
  "livreurId",
  "commercialId",
]);

export const update = async (id, data, user) => {
  const existing = await prisma.bonLivraison.findUnique({
    where: { id },
    select: {
      id: true,
      type: true,
      commandStatus: true,
      banqueId: true,
      modeReglement: true,
      document: { select: { societeId: true, clientId: true, documentNumber: true } },
    },
  });

  if (!existing) throw new ApiError("Advanced bon livraison not found", 404);
  if (existing.type !== "ADVANCED") {
    throw new ApiError("This is not an advanced bon livraison", 400);
  }
  if (!user.isSuperAdmin && existing.document.societeId !== user.societeId) {
    throw new ApiError("Access denied", 403);
  }
  if (FROZEN_STATUSES.includes(existing.commandStatus)) {
    throw new ApiError(
      `Cannot update a BL with status ${existing.commandStatus}.`,
      400,
    );
  }

  const isFullEdit = FULL_EDIT_STATUSES.includes(existing.commandStatus);

  // In restricted mode, reject any field outside the whitelist before doing work.
  if (!isFullEdit) {
    const disallowed = Object.keys(data || {}).filter(
      (k) => !RESTRICTED_EDIT_FIELDS.has(k),
    );
    if (disallowed.length > 0) {
      throw new ApiError(
        `Cannot edit ${disallowed.join(", ")} when status is ${existing.commandStatus}. Allowed: ${[...RESTRICTED_EDIT_FIELDS].join(", ")}.`,
        400,
      );
    }
  }

  await timeRangeUtility.validateSystemHours(new Date(), "advanced BL update");

  const {
    clientName,
    depotId,
    deliveryId,
    commandeId,
    documentDate,
    dateLivraison,
    heureLivraison,
    lines,
    packLines,
    montantPaid,
    agenceId,
    telephone,
    whatsapp,
    ville,
    localisation,
    withFacture,
    raisonSocial,
    ice,
    siegeSocial,
    nombreDeColis,
    observation,
    modeReglement,
    banqueId,
    commercialId,
    preparateurId,
    livreurId,
  } = data;

  const wantsFacture =
    withFacture === undefined
      ? undefined
      : withFacture === true || withFacture === "true";
  const villeName = ville !== undefined ? resolveVilleName(ville) : undefined;
  const address = localisation !== undefined ? resolveAddress(localisation) : undefined;

  const resolvedMode = modeReglement !== undefined ? modeReglement : undefined;
  const resolvedBanque = banqueId !== undefined ? banqueId : undefined;
  if (
    resolvedMode !== undefined &&
    MODES_REQUIRING_BANK.includes(resolvedMode) &&
    !(resolvedBanque || existing.banqueId)
  ) {
    throw new ApiError(
      `banqueId is required for ${resolvedMode}. Select a bank to credit its wallet.`,
      400,
    );
  }

  const effectiveCommercialId =
    commercialId !== undefined
      ? user.roleName === "Commercial"
        ? user.id
        : commercialId || null
      : undefined;

  // Pre-validate lines outside the transaction (cheap, fail fast)
  if (isFullEdit && Array.isArray(lines)) {
    if (
      lines.length === 0 &&
      (!Array.isArray(packLines) || packLines.length === 0)
    ) {
      throw new ApiError("At least one article or pack line is required", 400);
    }
    await validateLines(lines);
    lines.forEach((line, i) => {
      if (!line.priceField) {
        throw new ApiError(`Line ${i + 1}: priceField is required`, 400);
      }
    });
  }

  if (isFullEdit && Array.isArray(packLines)) {
    for (let i = 0; i < packLines.length; i++) {
      const pl = packLines[i];
      if (!pl.id)
        throw new ApiError(`Pack line ${i + 1}: id (packId) is required`, 400);
      const pack = await prisma.pack.findFirst({
        where: {
          id: pl.id,
          societeId: existing.document.societeId,
          active: true,
        },
        select: { id: true },
      });
      if (!pack) throw new ApiError(`Pack ${pl.id} not found or inactive`, 404);
    }
  }

  const result = await prisma.$transaction(
    async (tx) => {
      if (clientName !== undefined) {
        const trimmed = typeof clientName === "string" ? clientName.trim() : "";
        if (!trimmed) {
          throw new ApiError("clientName cannot be empty", 400);
        }
        await tx.clientDocument.update({
          where: { id },
          data: { clientName: trimmed },
        });
      }

      await tx.bonLivraison.update({
        where: { id },
        data: {
          ...(isFullEdit &&
            documentDate && { documentDate: new Date(documentDate) }),
          // dateLivraison is NOT NULL in the schema — ignore explicit null/empty
          ...(dateLivraison && { dateLivraison: new Date(dateLivraison) }),
          ...(isFullEdit && depotId && { depotId }),
          ...(isFullEdit &&
            deliveryId !== undefined && {
              deliveryId: deliveryId || null,
            }),
          ...(isFullEdit &&
            commandeId !== undefined && {
              commandeId: commandeId || null,
            }),
          ...(agenceId !== undefined && { agenceId: agenceId || null }),
          ...(heureLivraison !== undefined && { heureLivraison }),
          ...(telephone !== undefined && { telephone }),
          ...(whatsapp !== undefined && { whatsapp }),
          ...(villeName !== undefined && { ville: villeName }),
          ...(address !== undefined && { localisation: address }),
          ...(wantsFacture !== undefined && { withFacture: wantsFacture }),
          ...(wantsFacture === false
            ? { raisonSocial: null, ice: null, siegeSocial: null }
            : {
                ...(raisonSocial !== undefined && { raisonSocial }),
                ...(ice !== undefined && { ice }),
                ...(siegeSocial !== undefined && { siegeSocial }),
              }),
          ...(nombreDeColis !== undefined && { nombreDeColis }),
          ...(observation !== undefined && { observation }),
          ...(modeReglement !== undefined && {
            modeReglement: modeReglement || null,
          }),
          ...(banqueId !== undefined && { banqueId: banqueId || null }),
          ...(effectiveCommercialId !== undefined && {
            commercialId: effectiveCommercialId,
          }),
          ...(preparateurId !== undefined && {
            preparateurId: preparateurId || null,
          }),
          ...(livreurId !== undefined && { livreurId: livreurId || null }),
        },
      });

      if (
        existing.document.clientId &&
        (villeName !== undefined || address !== undefined)
      ) {
        await persistClientLocation(tx, existing.document.clientId, {
          villeName: villeName ?? undefined,
          address: address ?? undefined,
        });
      }

      // Lines / packs / totals are only touched in fully-editable statuses.
      if (!isFullEdit) {
        await tx.bonLivraisonStatusHistory.create({
          data: { bonId: id, status: "UPDATE", userId: user.id },
        });

        return tx.bonLivraison.findUnique({
          where: { id },
          include: FULL_ADVANCED_BL_INCLUDE,
        });
      }

      // Replace article lines if provided — TTC pricing, no TVA/remise
      if (Array.isArray(lines)) {
        await tx.clientDocumentLine.deleteMany({ where: { documentId: id } });

        const linesWithFinancials = [];
        for (let i = 0; i < lines.length; i++) {
          const line = lines[i];
          const article = await resolveLineArticle(
            tx,
            line.articleId,
            line.variantId,
          );
          if (!article)
            throw new ApiError(`Line ${i + 1}: Product not found`, 404);

          const quantity = parseFloat(line.quantity);
          const unitPriceTTC = parseFloat(line.unitPrice);
          const totalTTC = parseFloat((quantity * unitPriceTTC).toFixed(2));
          const unitCommission = parseFloat(article.commission || 0);

          linesWithFinancials.push({
            documentId: id,
            articleId: line.articleId || null,
            variantId: line.variantId || null,
            lineNumber: i + 1,
            description: line.description || article.name,
            quantity,
            unitPrice: unitPriceTTC,
            remise: 0,
            commission: unitCommission,
            totalHT: totalTTC,
            tvaRate: 0,
            totalTVA: 0,
            totalTTC,
            priceField: line.priceField,
          });
        }

        if (linesWithFinancials.length > 0) {
          await tx.clientDocumentLine.createMany({ data: linesWithFinancials });
        }
      }

      // Replace pack lines if provided
      if (Array.isArray(packLines)) {
        await tx.bonLivraisonPackLine.deleteMany({
          where: { bonLivraisonId: id },
        });
        if (packLines.length > 0) {
          const packRows = [];
          for (const pl of packLines) {
            const pack = await tx.pack.findFirst({
              where: {
                id: pl.id,
                societeId: existing.document.societeId,
                active: true,
              },
              select: { id: true, commission: true },
            });
            packRows.push({
              bonLivraisonId: id,
              packId: pl.id,
              quantity: parseFloat(pl.quantity),
              prixVente: parseFloat(pl.prixVente),
              commission: parseFloat(pack?.commission || 0),
            });
          }
          await tx.bonLivraisonPackLine.createMany({ data: packRows });
        }
      }

      // Recalculate document totals from current rows (TTC only)
      const [updatedLines, updatedPackLines, currentDoc] = await Promise.all([
        tx.clientDocumentLine.findMany({
          where: { documentId: id },
          select: { totalTTC: true, quantity: true, commission: true },
        }),
        tx.bonLivraisonPackLine.findMany({
          where: { bonLivraisonId: id },
          select: { quantity: true, prixVente: true, commission: true },
        }),
        tx.clientDocument.findUnique({
          where: { id },
          select: { amountPaid: true, clientId: true, documentNumber: true },
        }),
      ]);

      const articlesTotalTTC = updatedLines.reduce(
        (acc, l) => acc + parseFloat(l.totalTTC || 0),
        0,
      );
      const packTotalTTC = updatedPackLines.reduce(
        (acc, pl) =>
          acc + parseFloat(pl.prixVente || 0) * parseFloat(pl.quantity || 0),
        0,
      );
      const totalCommission = parseFloat(
        (
          updatedLines.reduce(
            (acc, l) =>
              acc + parseFloat(l.commission || 0) * parseFloat(l.quantity || 0),
            0,
          ) +
          updatedPackLines.reduce(
            (acc, pl) =>
              acc +
              parseFloat(pl.commission || 0) * parseFloat(pl.quantity || 0),
            0,
          )
        ).toFixed(2),
      );

      const totalTTC = parseFloat((articlesTotalTTC + packTotalTTC).toFixed(2));

      const previousPaid = parseFloat(currentDoc?.amountPaid || 0);
      const proposedPaid =
        montantPaid !== undefined ? parseFloat(montantPaid) : previousPaid;
      const amountPaid = parseFloat(
        Math.max(0, Math.min(proposedPaid, totalTTC)).toFixed(2),
      );
      const amountDue = parseFloat(totalTTC.toFixed(2));

      await tx.clientDocument.update({
        where: { id },
        data: {
          totalHT: totalTTC,
          totalTVA: 0,
          totalTTC,
          amountPaid,
          amountDue,
        },
      });

      await tx.bonLivraison.update({
        where: { id },
        data: { totalCommission },
      });

      const paymentDelta = parseFloat((amountPaid - previousPaid).toFixed(2));
      if (paymentDelta > 0) {
        await creditOrderPayment(tx, {
          societeId: existing.document.societeId,
          modeReglement: modeReglement ?? existing.modeReglement,
          banqueId: banqueId !== undefined ? banqueId : existing.banqueId,
          amount: paymentDelta,
          userId: user.id,
          clientId: currentDoc?.clientId ?? existing.document.clientId,
          documentNumber: currentDoc?.documentNumber ?? existing.document.documentNumber,
          documentDue: amountDue,
        });
      }

      // Audit trail: who edited the BL and when. Not a lifecycle transition.
      await tx.bonLivraisonStatusHistory.create({
        data: { bonId: id, status: "UPDATE", userId: user.id },
      });

      return tx.bonLivraison.findUnique({
        where: { id },
        include: FULL_ADVANCED_BL_INCLUDE,
      });
    },
    { timeout: 30000 },
  );

  return result;
};

/* ============================================================
   DELETE ADVANCED BON LIVRAISON
   Only allowed when commandStatus is EN_COURS or ANNULE.
============================================================ */
export const remove = async (id, user) => {
  await timeRangeUtility.validateSystemHours(
    new Date(),
    "advanced BL deletion",
  );

  const bl = await prisma.bonLivraison.findUnique({
    where: { id },
    select: {
      id: true,
      type: true,
      commandStatus: true,
      colisTrackingNumber: true,
      document: {
        select: {
          societeId: true,
          amountPaid: true,
        },
      },
    },
  });

  if (!bl) throw new ApiError("Advanced bon livraison not found", 404);
  if (bl.type !== "ADVANCED") {
    throw new ApiError("This is not an advanced bon livraison", 400);
  }
  if (!user.isSuperAdmin && bl.document.societeId !== user.societeId) {
    throw new ApiError("Access denied", 403);
  }
  if (!["EN_COURS", "ANNULE"].includes(bl.commandStatus)) {
    throw new ApiError(
      `Cannot delete advanced BL with status ${bl.commandStatus}. Only EN_COURS or ANNULE can be deleted.`,
      400,
    );
  }

  if (parseFloat(bl.document.amountPaid) > 0) {
    throw new ApiError("Cannot delete with associated payments", 400);
  }

  await prisma.$transaction(
    async (tx) => {
      await tx.bonLivraisonPackLine.deleteMany({
        where: { bonLivraisonId: id },
      });
      await tx.clientDocumentLine.deleteMany({ where: { documentId: id } });

      // Delete ALL stock transactions linked to this BL — no orphans remain.
      await tx.stockTransaction.deleteMany({ where: { bonLivraisonId: id } });

      // Clean up webhook log records linked to this parcel's tracking number
      if (bl.colisTrackingNumber) {
        await tx.ameexWebhookLog.deleteMany({
          where: { trackingCode: bl.colisTrackingNumber },
        });
      }

      await tx.bonLivraison.delete({ where: { id } });
      await tx.clientDocument.delete({ where: { id } });
    },
    { timeout: 30000 },
  );

  return { message: "Advanced bon livraison deleted successfully" };
};

/* ============================================================
   GENERATE PDF
============================================================ */
const ADVANCED_BL_PDF_CONFIG = {
  title: "BON DE COMMANDE / LIVRAISON",
  clientLabel: "DESTINATAIRE / CLIENT",
  getSubLine: (bl) => {
    let line = `N°: ${bl.document.documentNumber}  |  Date: ${formatDate(bl.documentDate)}`;
    if (bl.dateLivraison)
      line += `  |  Livraison: ${formatDate(bl.dateLivraison)}`;
    if (bl.heureLivraison) line += ` à ${bl.heureLivraison}`;
    return line;
  },
  getInfoBar: (bl) => {
    let text = `Dépôt: ${bl.depot.name} (${bl.depot.code})`;
    if (bl.agence) text += `  |  Agence: ${bl.agence.name}`;
    if (bl.delivery) text += `  |  Livreur: ${bl.delivery.name}`;
    if (bl.commandStatus) text += `  |  Statut: ${bl.commandStatus}`;
    return text;
  },
  signatureLeft: "Signature du livreur",
  signatureRight: "Signature du client",
};

export const generatePDF = async (id, user) => {
  const bl = await getById(id, user);
  return generateDocumentPDF(bl, ADVANCED_BL_PDF_CONFIG);
};

/* ============================================================
   UNIFIED PICKER — products OR packs

   Query:
     - products=true  → returns flat product list (variants + articles without variants)
     - pack=true      → returns packs
     - search         → filters by name
     - priceField     → prixVente1 | prixVente2 | prixVente3 (products only)
     - page, limit    → pagination
============================================================ */
export const getProductsOrPacks = async (query, user) => {
  const {
    products,
    pack,
    search,
    priceField = "prixVente1",
    page = 1,
    limit = 50,
  } = query;

  const parsedPage = parseInt(page);
  const parsedLimit = parseInt(limit);
  const skip = (parsedPage - 1) * parsedLimit;

  // ── PACKS MODE ──────────────────────────────────────────────
  if (pack) {
    const where = {
      active: true,
      ...(user.isSuperAdmin ? {} : { societeId: user.societeId }),
      ...(search && { name: { contains: search } }),
    };

    const [total, packs] = await Promise.all([
      prisma.pack.count({ where }),
      prisma.pack.findMany({
        where,
        select: {
          id: true,
          name: true,
          prixVentePack: true,
          commission: true,
        },
        orderBy: { name: "asc" },
        skip,
        take: parsedLimit,
      }),
    ]);

    return {
      mode: "pack",
      data: packs.map((p) => ({
        id: p.id,
        name: p.name,
        prixVentePack: parseFloat(p.prixVentePack),
        commission: parseFloat(p.commission || 0),
      })),
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(total / parsedLimit),
      },
    };
  }

  // ── PRODUCTS MODE ───────────────────────────────────────────
  if (products) {
    const { depotId } = query;

    if (!depotId) {
      throw new ApiError("depotId is required for products mode", 400);
    }

    if (!["prixVente1", "prixVente2", "prixVente3"].includes(priceField)) {
      throw new ApiError(
        "priceField must be prixVente1, prixVente2 or prixVente3",
        400,
      );
    }

    const depot = await prisma.depot.findFirst({
      where: {
        id: parseInt(depotId),
        ...(user.isSuperAdmin ? {} : { societeId: user.societeId }),
      },
      select: { id: true, active: true },
    });
    if (!depot) throw new ApiError("Depot not found or access denied", 404);
    if (!depot.active) throw new ApiError("Cannot use inactive depot", 400);

    const articleWhere = { visible: true };
    if (search) {
      articleWhere.OR = [
        { name: { contains: search } },
        { variants: { some: { name: { contains: search } } } },
      ];
    }

    const parsedDepotId = parseInt(depotId);

    const articles = await prisma.article.findMany({
      where: articleWhere,
      select: {
        id: true,
        name: true,
        image: true,
        prixVente1: true,
        prixVente2: true,
        prixVente3: true,
        commission: true,
        stockByDepot: {
          where: { depotId: parsedDepotId },
          select: {
            quantityAvailable: true,
            quantityReserved: true,
            quantityInTransit: true,
          },
        },
        variants: {
          select: {
            id: true,
            name: true,
            stockByDepot: {
              where: { depotId: parsedDepotId },
              select: {
                quantityAvailable: true,
                quantityReserved: true,
                quantityInTransit: true,
              },
            },
          },
        },
      },
      orderBy: { name: "asc" },
    });

    const EMPTY_STOCK = {
      quantityAvailable: 0,
      quantityReserved: 0,
      quantityInTransit: 0,
    };

    const formatStock = (s) =>
      s
        ? {
            quantityAvailable: parseFloat(s.quantityAvailable),
            quantityReserved: parseFloat(s.quantityReserved),
            quantityInTransit: parseFloat(s.quantityInTransit),
          }
        : EMPTY_STOCK;

    const data = [];
    const searchLower = search ? search.toLowerCase() : null;

    for (const article of articles) {
      const prixVente = parseFloat(article[priceField]);
      const commission = parseFloat(article.commission || 0);

      if (article.variants.length === 0) {
        data.push({
          id: article.id,
          articleId: article.id,
          variantId: null,
          name: article.name,
          image: article.image,
          type: "ARTICLE",
          prixVente,
          commission,
          stock: formatStock(article.stockByDepot[0]),
        });
      } else {
        for (const variant of article.variants) {
          if (searchLower) {
            const matchesVariant = variant.name
              ?.toLowerCase()
              .includes(searchLower);
            const matchesArticle = article.name
              .toLowerCase()
              .includes(searchLower);
            if (!matchesVariant && !matchesArticle) continue;
          }

          data.push({
            id: variant.id,
            articleId: article.id,
            variantId: variant.id,
            name: variant.name || article.name,
            image: article.image,
            type: "VARIANT",
            prixVente,
            commission,
            stock: formatStock(variant.stockByDepot[0]),
          });
        }
      }
    }

    const total = data.length;
    const paged = data.slice(skip, skip + parsedLimit);

    return {
      mode: "products",
      priceField,
      data: paged,
      pagination: {
        total,
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(total / parsedLimit),
      },
    };
  }

  throw new ApiError(
    "Either 'products' or 'pack' query parameter is required",
    400,
  );
};

/* ============================================================
   UNIFIED LIVREURS PICKER

   Single source of truth: the Delivery model.
     - INTERN → Delivery.type = INTERN, linked to a User (auth identity)
     - EXTERN → Delivery.type = EXTERN, standalone

   Query:
     - type=intern | extern   (required)
     - search                 (name; email for intern)
     - active                 (boolean)
     - page, limit            (pagination)

   Unified response row:
     { id, userId, name, source, email, tel, address, profile, active }
============================================================ */
/* ============================================================
   GET PREPARATEURS

   Returns paginated users having the "Preparateur" role,
   scoped to the caller's société (super admin sees all).
============================================================ */
export const getPreparateurs = async (query, user) => {
  const { search, active, societeId, page = 1, limit = 50 } = query;

  const parsedPage = parseInt(page);
  const parsedLimit = parseInt(limit);
  const skip = (parsedPage - 1) * parsedLimit;

  // SuperAdmin sees all by default; can filter by societeId.
  // Regular users are always scoped to their own société.
  const societeScope = user.isSuperAdmin
    ? societeId
      ? { societeId: parseInt(societeId) }
      : {}
    : { societeId: user.societeId };

  const where = {
    ...societeScope,
    ...(active !== undefined && {
      active: active === true || active === "true",
    }),
    AND: [
      {
        OR: [{ role: { name: "Preparateur" } }, { canBePreparateur: true }],
      },
      ...(search
        ? [
            {
              OR: [
                { name: { contains: search } },
                { email: { contains: search } },
              ],
            },
          ]
        : []),
    ],
  };

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        profile: true,
        active: true,
      },
      orderBy: { name: "asc" },
      skip,
      take: parsedLimit,
    }),
  ]);

  return {
    data: users,
    pagination: {
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit),
    },
  };
};

/* ============================================================
   GET COMMERCIALS

   Returns users having the "Commercial" role (id + name only),
   scoped to the caller's société (super admin sees all).
============================================================ */
export const getCommercials = async (user) => {
  return prisma.user.findMany({
    where: {
      role: { name: "Commercial" },
      ...(user.isSuperAdmin ? {} : { societeId: user.societeId }),
    },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });
};

/* ============================================================
   COMMERCIAL STATS / TOP COMMERCIALS

   Aggregates Advanced BLs by commercialId for a date range
   (filters on dateLivraison). Returns order counts, CA, and
   commission owed to each commercial.
============================================================ */
const buildCommercialStatsWhere = (user, query = {}) => {
  const { dateFrom, dateTo, commercialId } = query;
  const where = {
    type: "ADVANCED",
    commercialId: { not: null },
    ...(user.isSuperAdmin ? {} : { document: { societeId: user.societeId } }),
  };

  if (user.roleName === "Commercial" || !isAdminLevelUser(user)) {
    where.commercialId = user.id;
  } else if (commercialId) {
    where.commercialId = parseInt(commercialId);
  }

  if (dateFrom || dateTo) {
    where.dateLivraison = {};
    if (dateFrom) where.dateLivraison.gte = new Date(dateFrom);
    if (dateTo) where.dateLivraison.lte = new Date(dateTo);
  }

  return where;
};

export const getCommercialStats = async (user, query = {}) => {
  const where = buildCommercialStatsWhere(user, query);

  const rows = await prisma.bonLivraison.findMany({
    where,
    select: {
      id: true,
      commercialId: true,
      totalCommission: true,
      commandStatus: true,
      dateLivraison: true,
      commercial: { select: { id: true, name: true } },
      document: {
        select: {
          documentNumber: true,
          clientName: true,
          amountDue: true,
          amountPaid: true,
          createdAt: true,
        },
      },
    },
    orderBy: { dateLivraison: "desc" },
  });

  const byCommercial = new Map();
  let totalOrders = 0;
  let totalCommission = 0;
  let totalCA = 0;
  let totalPaid = 0;

  for (const bl of rows) {
    const cid = bl.commercialId;
    if (!cid) continue;

    if (!byCommercial.has(cid)) {
      byCommercial.set(cid, {
        id: cid,
        name: bl.commercial?.name || "—",
        orderCount: 0,
        totalCommission: 0,
        totalCA: 0,
        totalPaid: 0,
        orders: [],
      });
    }

    const entry = byCommercial.get(cid);
    const commission = parseFloat(bl.totalCommission || 0);
    const ca = parseFloat(bl.document?.amountDue || 0);
    const paid = parseFloat(bl.document?.amountPaid || 0);

    entry.orderCount += 1;
    entry.totalCommission += commission;
    entry.totalCA += ca;
    entry.totalPaid += paid;
    entry.orders.push({
      id: bl.id,
      documentNumber: bl.document?.documentNumber ?? null,
      clientName: bl.document?.clientName ?? null,
      commandStatus: bl.commandStatus,
      dateLivraison: bl.dateLivraison,
      amountDue: ca,
      amountPaid: paid,
      totalCommission: commission,
    });

    totalOrders += 1;
    totalCommission += commission;
    totalCA += ca;
    totalPaid += paid;
  }

  const commercials = Array.from(byCommercial.values())
    .map((c) => ({
      ...c,
      totalCommission: parseFloat(c.totalCommission.toFixed(2)),
      totalCA: parseFloat(c.totalCA.toFixed(2)),
      totalPaid: parseFloat(c.totalPaid.toFixed(2)),
    }))
    .sort((a, b) => b.totalCommission - a.totalCommission || b.orderCount - a.orderCount);

  return {
    summary: {
      orderCount: totalOrders,
      totalCommission: parseFloat(totalCommission.toFixed(2)),
      totalCA: parseFloat(totalCA.toFixed(2)),
      totalPaid: parseFloat(totalPaid.toFixed(2)),
      commercialCount: commercials.length,
    },
    commercials,
  };
};

export const getTopCommercials = async (user, query = {}) => {
  const limit = Math.min(Math.max(parseInt(query.limit || 5), 1), 20);
  const stats = await getCommercialStats(user, query);
  return {
    summary: stats.summary,
    commercials: stats.commercials.slice(0, limit).map(({ orders, ...rest }) => rest),
  };
};

/* ============================================================
   GET BLs BY STATUS

   Paginated list driven by a status filter (the same buckets
   the workflow-counts cards expose). Role-based scoping mirrors
   getWorkflowCounts so dashboard counters and detail views agree.

   Query: { status, livreurId?, page?, limit? }
   - status   : one of CONFIRME, PREPARE, COLLECTE, EN_ROUTE, LIVRE, PAYE
   - livreurId: optional; ignored for Livreur (forced to own Delivery.id)
============================================================ */
const STATUS_BY_ROLE = {
  Livreur: new Set(["PREPARE", "COLLECTE", "EN_ROUTE", "LIVRE"]),
  Preparateur: new Set(["CONFIRME"]),
};
const VISIBLE_STATUSES = new Set([
  "CONFIRME",
  "PREPARE",
  "COLLECTE",
  "EN_ROUTE",
  "LIVRE",
  "PAYE",
]);

export const getBLsByStatus = async (query, user) => {
  const { status, livreurId, page = 1, limit = 20 } = query;

  if (!status) throw new ApiError("status is required", 400);
  if (!VISIBLE_STATUSES.has(status)) {
    throw new ApiError(
      `status must be one of: ${[...VISIBLE_STATUSES].join(", ")}`,
      400,
    );
  }

  // Role-based status gate
  if (!user.isSuperAdmin) {
    const allowedForRole = STATUS_BY_ROLE[user.roleName];
    if (allowedForRole && !allowedForRole.has(status)) {
      throw new ApiError(
        `Role ${user.roleName} cannot view BLs in status ${status}`,
        403,
      );
    }
  }

  // Role-based row scoping
  const where = {
    type: "ADVANCED",
    commandStatus: status,
    ...(user.isSuperAdmin ? {} : { document: { societeId: user.societeId } }),
  };

  await applyPersonalOrderScope(where, user);
  if (livreurId && user.roleName !== "Livreur") {
    where.livreurId = parseInt(livreurId);
  }

  const parsedPage = parseInt(page);
  const parsedLimit = parseInt(limit);

  const [total, rows] = await Promise.all([
    prisma.bonLivraison.count({ where }),
    prisma.bonLivraison.findMany({
      where,
      select: {
        id: true,
        documentDate: true,
        dateLivraison: true,
        ville: true,
        telephone: true,
        whatsapp: true,
        isReported: true,
        nextDeliveryDate: true,
        document: {
          select: {
            documentNumber: true,
            clientName: true,
            amountDue: true,
            amountPaid: true,
            user: { select: { id: true, name: true } },
            lines: {
              select: {
                id: true,
                lineNumber: true,
                description: true,
                quantity: true,
                unitPrice: true,
                totalTTC: true,
                article: { select: { id: true, name: true } },
                variant: { select: { id: true, name: true } },
              },
              orderBy: { lineNumber: "asc" },
            },
          },
        },
        livreur: { select: { id: true, name: true } },
        packLines: {
          select: {
            id: true,
            quantity: true,
            prixVente: true,
            pack: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: [{ documentDate: "desc" }, { createdAt: "desc" }],
      skip: (parsedPage - 1) * parsedLimit,
      take: parsedLimit,
    }),
  ]);

  const fmt = (d) => {
    if (!d) return null;
    const date = new Date(d);
    const dd = String(date.getDate()).padStart(2, "0");
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  const data = rows.map((bl) => {
    const products = [
      ...bl.document.lines.map((l) => ({
        kind: "article",
        name: l.article?.name || l.variant?.name || l.description || "—",
        quantity: parseFloat(l.quantity),
        unitPrice: parseFloat(l.unitPrice),
        total: parseFloat(l.totalTTC),
      })),
      ...bl.packLines.map((pl) => ({
        kind: "pack",
        name: pl.pack?.name ?? "—",
        quantity: parseFloat(pl.quantity),
        unitPrice: parseFloat(pl.prixVente),
        total: parseFloat(
          (parseFloat(pl.prixVente) * parseFloat(pl.quantity)).toFixed(2),
        ),
      })),
    ];

    return {
      id: bl.id,
      documentNumber: bl.document?.documentNumber ?? null,
      createdBy: bl.document?.user?.name ?? null,
      livreurName: bl.livreur?.name ?? null,
      documentDate: fmt(bl.documentDate),
      dateLivraison: fmt(bl.dateLivraison),
      clientName: bl.document?.clientName ?? null,
      telephone: bl.telephone,
      whatsapp: bl.whatsapp,
      ville: bl.ville,
      isReported: bl.isReported,
      nextDeliveryDate: fmt(bl.nextDeliveryDate),
      amountPaid: parseFloat(bl.document?.amountPaid || 0),
      amountDue: parseFloat(bl.document?.amountDue || 0),
      products,
    };
  });

  return {
    pagination: {
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit),
    },
    data,
  };
};

/* ============================================================
   GET WORKFLOW COUNTS

   Returns role-aware counters of Advanced BLs grouped by their
   current status. The counters represent the *next actionable
   step* — the calculation is on the current commandStatus, but
   labels reflect what the user has to do next.

   Role visibility:
     - Super_Admin / Societe_Admin
         → 5 counters: aPreparer, aCollecter, enRoute, aLivrer, aPayer (société/global)
     - Commercial / Gerant / Caissier / other non-admins
         → 5 counters on their own orders
     - Livreur     → only aCollecter, enRoute, aLivrer, aPayer (own BLs)
     - Preparateur → only aPreparer (own BLs)
============================================================ */
export const getWorkflowCounts = async (user, query = {}) => {
  const { dateFrom, dateTo } = query;

  const where = {
    type: "ADVANCED",
    ...(user.isSuperAdmin ? {} : { document: { societeId: user.societeId } }),
  };

  // Optional period filter on delivery date (same spirit as main dashboard)
  if (dateFrom || dateTo) {
    const range = {};
    if (dateFrom) {
      const from = new Date(dateFrom);
      if (!Number.isNaN(from.getTime())) {
        from.setHours(0, 0, 0, 0);
        range.gte = from;
      }
    }
    if (dateTo) {
      const to = new Date(dateTo);
      if (!Number.isNaN(to.getTime())) {
        to.setHours(23, 59, 59, 999);
        range.lte = to;
      }
    }
    if (Object.keys(range).length) {
      where.dateLivraison = range;
    }
  }

  await applyPersonalOrderScope(where, user);

  // Single roundtrip — group by status, count rows.
  const groups = await prisma.bonLivraison.groupBy({
    by: ["commandStatus"],
    where,
    _count: { _all: true },
  });

  const byStatus = Object.fromEntries(
    groups.map((g) => [g.commandStatus, g._count._all]),
  );

  // Counter map: current status → next-step label
  const allCounts = {
    aPreparer: byStatus.CONFIRME ?? 0,
    aCollecter: byStatus.PREPARE ?? 0,
    enRoute: byStatus.COLLECTE ?? 0,
    aLivrer: byStatus.EN_ROUTE ?? 0,
    aPayer: byStatus.LIVRE ?? 0,
  };

  const total = Object.values(byStatus).reduce((s, n) => s + n, 0);

  if (user.roleName === "Livreur") {
    return {
      aCollecter: allCounts.aCollecter,
      enRoute: allCounts.enRoute,
      aLivrer: allCounts.aLivrer,
      aPayer: allCounts.aPayer,
      total,
    };
  }
  if (user.roleName === "Preparateur") {
    return { aPreparer: allCounts.aPreparer, total };
  }
  return { ...allCounts, total };
};

/* ============================================================
   GET PLANNING

   Operational planning view: groups Advanced BLs by day across
   a date interval and aggregates per-livreur metrics.

   Query: { livreurId?, startDate, endDate }
   Date filter is on `documentDate`. Days within the interval that
   have no BLs are still returned with an empty array, so the
   frontend can render a continuous calendar.
============================================================ */
export const getPlanning = async (query, user) => {
  const { livreurId, startDate, endDate } = query;

  if (!startDate || !endDate) {
    throw new ApiError("startDate and endDate are required", 400);
  }

  const start = new Date(startDate);
  const end = new Date(endDate);

  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new ApiError("startDate and endDate must be valid ISO dates", 400);
  }
  if (start > end) {
    throw new ApiError("startDate must be <= endDate", 400);
  }

  // Normalize boundaries to full-day inclusive
  start.setHours(0, 0, 0, 0);

  end.setHours(23, 59, 59, 999);

  const where = {
    type: "ADVANCED",
    dateLivraison: { gte: start, lte: end },
    ...(livreurId && { livreurId: parseInt(livreurId) }),
    document: user.isSuperAdmin ? undefined : { societeId: user.societeId },
  };

  // Role scoping — same as workflow counts / list
  await applyPersonalOrderScope(where, user);

  const rows = await prisma.bonLivraison.findMany({
    where,
    select: {
      id: true,
      documentDate: true,
      dateLivraison: true,
      heureLivraison: true,
      ville: true,
      localisation: true,
      whatsapp: true,
      telephone: true,
      nombreDeColis: true,
      commandStatus: true,
      isReported: true,
      isSuspended: true,
      livreurId: true,
      preparateurId: true,
      observation: true,
      modeReglement: true,
      document: {
        select: {
          user: { select: { name: true } },
          documentNumber: true,
          clientName: true,
          amountDue: true,
          amountPaid: true,
        },
      },
      agence: { select: { id: true, name: true } },
      livreur: { select: { id: true, name: true, tel: true } },
      preparateur: { select: { id: true, name: true } },
    },
    orderBy: [{ documentDate: "asc" }, { createdAt: "asc" }],
  });

  const fmt = (d) => {
    const dd = String(d.getDate()).padStart(2, "0");
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  };

  // Bucket BLs by their normalized documentDate key (dd/mm/yyyy).
  const blsByDate = new Map();
  let totalColis = 0;
  let totalMontant = 0;

  for (const bl of rows) {
    const key = fmt(new Date(bl.dateLivraison));
    if (!blsByDate.has(key)) blsByDate.set(key, []);

    const amountDue = parseFloat(bl.document?.amountDue || 0);
    const amountPaid = parseFloat(bl.document?.amountPaid || 0);
    const reste = parseFloat((amountDue - amountPaid).toFixed(2));

    blsByDate.get(key).push({
      id: bl.id,
      documentNumber: bl.document?.documentNumber ?? null,
      clientName: bl.document?.clientName ?? null,
      createdBy: bl.document.user.name,
      ville: bl.ville,
      localisation: bl.localisation,
      telephone: bl.telephone,
      whatsapp: bl.whatsapp,
      observation: bl.observation,
      dateLivraison: bl.dateLivraison ? fmt(new Date(bl.dateLivraison)) : null,
      heureLivraison: bl.heureLivraison,
      nombreDeColis: bl.nombreDeColis ?? 0,
      commandStatus: bl.commandStatus,
      modeReglement: bl.modeReglement,
      isReported: bl.isReported,
      isSuspended: bl.isSuspended,
      agenceName: bl.agence?.name ?? null,
      livreurId: bl.livreurId,
      livreurName: bl.livreur?.name ?? null,
      livreurPhone: bl.livreur?.tel ?? null,
      preparateurId: bl.preparateurId,
      preparateurName: bl.preparateur?.name ?? null,
      amountDue,
      amountPaid,
      reste,
    });

    totalColis += bl.nombreDeColis ?? 0;
    totalMontant += reste;
  }

  // Walk every day in the interval so empty days are included.
  const groupedByDate = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const endDay = new Date(end);
  endDay.setHours(0, 0, 0, 0);

  while (cursor <= endDay) {
    const key = fmt(cursor);
    groupedByDate.push({
      date: key,
      advancedBonLivraisons: blsByDate.get(key) ?? [],
    });
    cursor.setDate(cursor.getDate() + 1);
  }

  const totalDays = groupedByDate.filter(
    (g) => g.advancedBonLivraisons.length > 0,
  ).length;

  return {
    groupedByDate,
    metrics: {
      totalAdvancedBonLivraisons: rows.length,
      totalColis,
      totalMontantAdvancedBonLivraisons: parseFloat(totalMontant.toFixed(2)),
      totalDays,
    },
  };
};

export const getLivreurs = async (query, user) => {
  const { type, search, active, societeId, page = 1, limit = 50 } = query;

  if (!["intern", "extern"].includes(type)) {
    throw new ApiError("type must be either 'intern' or 'extern'", 400);
  }

  const parsedPage = parseInt(page);
  const parsedLimit = parseInt(limit);
  const skip = (parsedPage - 1) * parsedLimit;

  // SuperAdmin sees all by default; can filter by societeId.
  // Regular users are always scoped to their own société.
  const societeScope = user.isSuperAdmin
    ? societeId
      ? { societeId: parseInt(societeId) }
      : {}
    : { societeId: user.societeId };
  const activeFilter =
    active === undefined
      ? {}
      : { active: active === true || active === "true" };

  const deliveryType = type === "intern" ? "INTERN" : "EXTERN";

  const where = {
    ...societeScope,
    ...activeFilter,
    type: deliveryType,
    ...(type === "intern" && {
      OR: [
        { user: { role: { name: "Livreur" } } },
        { user: { canBeLivreur: true } },
      ],
    }),
    ...(search && {
      AND: [
        {
          OR: [
            { name: { contains: search } },
            ...(type === "intern"
              ? [{ user: { email: { contains: search } } }]
              : []),
          ],
        },
      ],
    }),
  };

  const [total, deliveries] = await Promise.all([
    prisma.delivery.count({ where }),
    prisma.delivery.findMany({
      where,
      select: {
        id: true,
        userId: true,
        name: true,
        type: true,
        entityType: true,
        address: true,
        tel: true,
        active: true,
        user:
          type === "intern"
            ? {
                select: {
                  id: true,
                  email: true,
                  profile: true,
                  active: true,
                },
              }
            : false,
      },
      orderBy: { name: "asc" },
      skip,
      take: parsedLimit,
    }),
  ]);

  return {
    type,
    data: deliveries.map((d) => ({
      id: d.id,
      userId: d.userId,
      name: d.name,
      source: d.type,
      email: d.user?.email ?? null,
      tel: d.tel,
      address: d.address,
      profile: d.user?.profile ?? null,
      entityType: d.entityType,
      active: d.active,
    })),
    pagination: {
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit),
    },
  };
};
