import PDFDocument from "pdfkit";
import prisma from "../../loaders/prisma.js";
import ApiError from "../utils/apiError.js";
import ApiFeatures from "../utils/apiFeatures.js";
import timeRangeUtility from "../utils/timeRangeUtility.js";
import { formatDate, formatMoney } from "../utils/pdfGenerator.js";
import {
  resolveWalletForExpense,
  debitWallet,
  reverseExpense,
} from "./caisseWalletHelper.js";

const MODES_REQUIRING_BANK = ["CARTE_BANCAIRE", "VIREMENT"];
const MODES_REQUIRING_REF = ["CHEQUE", "EFFET"];

const REGLEMENT_SELECT = {
  id: true,
  date: true,
  modeReglement: true,
  documentNumbers: true,
  montantRegle: true,
  montantBR: true,
  solde: true,
  refDocument: true,
  dateEcheance: true,
  createdAt: true,
  avanceId: true,
  avanceConsumed: true,
  fournisseur: { select: { id: true, name: true } },
  banque: { select: { id: true, name: true, RIB: true } },
};

// ============================================
// GET ALL
// ============================================
export const getAll = async (query, societeId = null) => {
  const where = {};
  if (societeId) where.societeId = societeId;
  if (query.fournisseurId) where.fournisseurId = parseInt(query.fournisseurId);
  if (query.modeReglement) where.modeReglement = query.modeReglement;
  if (query.startDate || query.endDate) {
    const dateFilter = {};
    if (query.startDate) dateFilter.gte = new Date(query.startDate);
    if (query.endDate) dateFilter.lte = new Date(query.endDate);
    where.date = dateFilter;
  }

  // 1. Fetch all matching records (no pagination yet)
  const apiFeatures = new ApiFeatures(query).sort();
  const { select: _ignored, skip: _s, take: _t, ...rest } = apiFeatures.build();

  const all = await prisma.reglementFournisseur.findMany({
    ...rest,
    where,
    select: REGLEMENT_SELECT,
  });

  // 2. Apply system hour filter on the payment date field before pagination
  const filtered = await timeRangeUtility.filterBySystemHours(all, "date");

  // 3. Paginate manually on the filtered result
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 5;
  const total = filtered.length;
  const totalPages = Math.ceil(total / limit);
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

  const reglements = filtered
    .slice((page - 1) * limit, page * limit)
    .map((r) => ({
      ...r,
      date: fmtDateTime(r.date),
      dateEcheance: fmt(r.dateEcheance),
      createdAt: fmt(r.createdAt),
    }));

  const pagination = {
    currentPage: page,
    limit,
    numberOfPages: totalPages,
    ...(page * limit < total && { next: page + 1 }),
    ...(page > 1 && { prev: page - 1 }),
  };

  return {
    results: reglements.length,
    pagination,
    data: reglements,
  };
};

// ============================================
// GET BY ID
// ============================================
export const getById = async (id, user = null) => {
  const reglement = await prisma.reglementFournisseur.findUnique({
    where: { id },
    select: { ...REGLEMENT_SELECT, paymentBreakdown: true, societeId: true },
  });

  if (!reglement) throw new ApiError("Reglement not found", 404);
  if (user && !user.isSuperAdmin && reglement.societeId !== user.societeId) {
    throw new ApiError("Access denied", 403);
  }

  return reglement;
};

// ============================================
// CREATE
// ============================================
export const create = async (data, societeId, user = null) => {
  const {
    date,
    fournisseurId,
    modeReglement,
    montantRegle,
    solde,
    documentNumbers,
    refDocument,
    dateEcheance,
    banqueId,
    advanceIds,
    caisseId,
  } = data;

  if (MODES_REQUIRING_BANK.includes(modeReglement) && !banqueId) {
    throw new ApiError(`banqueId is required for ${modeReglement}`, 400);
  }
  if (
    MODES_REQUIRING_REF.includes(modeReglement) &&
    (!refDocument || !dateEcheance)
  ) {
    throw new ApiError(
      `refDocument and dateEcheance are required for ${modeReglement}`,
      400,
    );
  }

  const hasAdvances = Array.isArray(advanceIds) && advanceIds.length > 0;

  return prisma.$transaction(async (tx) => {
    let montantBR = 0;
    const paymentBreakdown = {};
    const advances = [];
    let totalAmountFromAdvances = 0;

    const hasDocuments =
      Array.isArray(documentNumbers) && documentNumbers.length > 0;

    // advanceIds is only meaningful when settling documents
    if (hasAdvances && !hasDocuments) {
      throw new ApiError(
        "advanceIds can only be used when documentNumbers are provided",
        400,
      );
    }

    if (hasDocuments) {
      // Fetch BonReception-backed FournisseurDocuments for this fournisseur
      const docs = await tx.fournisseurDocument.findMany({
        where: {
          societeId,
          fournisseurId,
          documentNumber: { in: documentNumbers },
          bonReception: { isNot: null },
        },
        select: {
          id: true,
          documentNumber: true,
          amountDue: true,
          amountPaid: true,
        },
      });

      if (docs.length === 0) {
        throw new ApiError(
          "No matching BonReception documents found for this fournisseur",
          404,
        );
      }

      const docMap = new Map(docs.map((d) => [d.documentNumber, d]));

      // montantBR = sum of amountDue across all selected BRs
      montantBR = docs.reduce((sum, d) => sum + Number(d.amountDue), 0);

      // resteTotalBR = sum of (amountDue - amountPaid) for all selected BRs
      const resteTotalBR = docs.reduce(
        (sum, d) => sum + (Number(d.amountDue) - Number(d.amountPaid)),
        0,
      );

      // Load and validate all selected advances
      if (hasAdvances) {
        for (const aId of advanceIds) {
          const adv = await tx.reglementFournisseur.findUnique({
            where: { id: Number(aId) },
          });
          if (!adv) throw new ApiError(`Advance ${aId} not found`, 404);
          if (adv.fournisseurId !== fournisseurId)
            throw new ApiError(
              `Advance ${aId} does not belong to this fournisseur`,
              400,
            );
          if (adv.societeId !== societeId)
            throw new ApiError(
              `Advance ${aId} does not belong to this société`,
              403,
            );
          if (Number(adv.montantBR) > 0)
            throw new ApiError(
              `Reglement ${aId} is not an advance (montantBR > 0)`,
              400,
            );
          advances.push(adv);
        }
      }

      // ─── Consistency validation ───
      // adjustedReste = totalReste - sum(advance montantRegle)
      // Expected: adjustedReste - montantRegle === solde
      const totalAvanceAmount = advances.reduce(
        (sum, a) => sum + Number(a.montantRegle),
        0,
      );
      const adjustedReste = resteTotalBR - totalAvanceAmount;
      const expectedSolde = adjustedReste - Number(montantRegle);
      const TOLERANCE = 0.01;

      if (Math.abs(expectedSolde - Number(solde)) > TOLERANCE) {
        throw new ApiError(
          `Inconsistent amounts: totalReste=${resteTotalBR.toFixed(2)}, avance=${totalAvanceAmount.toFixed(2)}, adjustedReste=${adjustedReste.toFixed(2)}, montantRegle=${Number(montantRegle).toFixed(2)}, expectedSolde=${expectedSolde.toFixed(2)}, providedSolde=${Number(solde).toFixed(2)}`,
          400,
        );
      }

      // Track new amountPaid per doc across both phases
      const newPaidMap = new Map(
        docs.map((d) => [d.documentNumber, Number(d.amountPaid)]),
      );

      // ─── Phase 1: distribute montantRegle ───
      let remaining = Number(montantRegle);
      for (const docNum of documentNumbers) {
        if (remaining <= 0.001) break;
        const doc = docMap.get(docNum);
        if (!doc) continue;

        const currentPaid = newPaidMap.get(docNum);
        const docReste = Number(doc.amountDue) - currentPaid;
        if (docReste <= 0.001) continue;

        const payment = Math.min(remaining, docReste);
        paymentBreakdown[docNum] = (paymentBreakdown[docNum] || 0) + payment;
        newPaidMap.set(docNum, currentPaid + payment);
        remaining -= payment;
      }

      // ─── Phase 2: consume from advances sequentially ───
      const consumedAdvances = [];
      for (const adv of advances) {
        let advanceRemaining = Number(adv.montantRegle);
        let consumed = 0;
        for (const docNum of documentNumbers) {
          if (advanceRemaining <= 0.001) break;
          const doc = docMap.get(docNum);
          if (!doc) continue;

          const currentPaid = newPaidMap.get(docNum);
          const docReste = Number(doc.amountDue) - currentPaid;
          if (docReste <= 0.001) continue;

          const payment = Math.min(advanceRemaining, docReste);
          paymentBreakdown[docNum] = (paymentBreakdown[docNum] || 0) + payment;
          newPaidMap.set(docNum, currentPaid + payment);
          advanceRemaining -= payment;
          consumed += payment;
        }
        if (consumed > 0) {
          consumedAdvances.push({ id: adv.id, amount: consumed });
          totalAmountFromAdvances += consumed;
        }
      }

      // Store consumed advance details in paymentBreakdown for rollback
      if (consumedAdvances.length > 0) {
        paymentBreakdown._advances = consumedAdvances;
      }

      // Persist amountPaid updates on each touched BR
      for (const doc of docs) {
        const finalPaid = newPaidMap.get(doc.documentNumber);
        if (finalPaid !== Number(doc.amountPaid)) {
          await tx.fournisseurDocument.update({
            where: { id: doc.id },
            data: { amountPaid: finalPaid },
          });
        }
      }

      // Mark each consumed advance as consumed by setting montantBR and
      // documentNumbers, so it is no longer identified as an advance.
      for (const ca of consumedAdvances) {
        await tx.reglementFournisseur.update({
          where: { id: ca.id },
          data: {
            montantBR,
            documentNumbers,
          },
        });
      }
    }

    const reglement = await tx.reglementFournisseur.create({
      data: {
        societeId,
        date: new Date(date),
        fournisseurId,
        modeReglement,
        documentNumbers: hasDocuments ? documentNumbers : null,
        paymentBreakdown:
          hasDocuments && Object.keys(paymentBreakdown).length > 0
            ? paymentBreakdown
            : null,
        montantRegle,
        montantBR,
        // For an advance (no documents), solde = 0
        // For a regular payment, solde comes from frontend
        solde: hasDocuments ? solde : 0,
        refDocument: refDocument ?? null,
        dateEcheance: dateEcheance ? new Date(dateEcheance) : null,
        banqueId: banqueId ?? null,
        avanceId: advances.length === 1 ? advances[0].id : null,
        avanceConsumed:
          totalAmountFromAdvances > 0 ? totalAmountFromAdvances : null,
      },
      select: REGLEMENT_SELECT,
    });

    const walletAmount = Number(montantRegle);
    if (walletAmount > 0) {
      const sourceWallet = await resolveWalletForExpense(tx, {
        societeId,
        modeReglement,
        banqueId,
        caisseId,
        userId: user?.id,
      });
      if (sourceWallet) {
        await debitWallet(tx, {
          caisse: sourceWallet,
          amount: walletAmount,
          note: `Décaissement fournisseur #${reglement.id} (${modeReglement})`,
          createdBy: user?.id ?? null,
          reglementFournisseurId: reglement.id,
        });
      }
    }

    return reglement;
  });
};

// ============================================
// GET UNPAID BON RECEPTIONS FOR A FOURNISSEUR
// Returns unpaid/partial BRs + fournisseur advances
// ============================================
export const getUnpaidBonReceptions = async (fournisseurId, societeId) => {
  const docs = await prisma.fournisseurDocument.findMany({
    where: {
      societeId,
      fournisseurId,
      bonReception: { isNot: null },
    },
    select: {
      documentNumber: true,
      amountDue: true,
      amountPaid: true,
      bonReception: { select: { documentDate: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  const unpaidDocuments = docs
    .map((d) => ({
      documentNumber: d.documentNumber,
      documentDate: d.bonReception?.documentDate ?? null,
      amountDue: Number(d.amountDue),
      reste: Number(d.amountDue) - Number(d.amountPaid),
    }))
    .filter((d) => d.reste > 0.001);

  // Advances = reglements where montantBR is null or 0
  const advances = await prisma.reglementFournisseur.findMany({
    where: {
      societeId,
      fournisseurId,
      montantBR: 0,
    },
    select: {
      id: true,
      date: true,
      modeReglement: true,
      montantRegle: true,
      montantBR: true,
    },
    orderBy: { date: "asc" },
  });

  return { unpaidDocuments, advances };
};

// ============================================
// GET ALL ADVANCES FOR A FOURNISSEUR
// ============================================
export const getFournisseurAdvances = async (fournisseurId, societeId) => {
  const advances = await prisma.reglementFournisseur.findMany({
    where: { societeId, fournisseurId, montantBR: 0 },
    select: {
      id: true,
      date: true,
      modeReglement: true,
      montantRegle: true,
      montantBR: true,
      solde: true,
      createdAt: true,
    },
    orderBy: { date: "desc" },
  });

  const fmt = (d) =>
    d
      ? new Date(d).toLocaleDateString("fr-FR", {
          day: "2-digit",
          month: "2-digit",
          year: "numeric",
        })
      : null;

  return advances.map((a) => ({
    ...a,
    date: fmt(a.date),
    createdAt: fmt(a.createdAt),
  }));
};

// ============================================
// REMOVE (with full BR rollback)
// ============================================
export const remove = async (id, user) => {
  const reglement = await prisma.reglementFournisseur.findUnique({
    where: { id },
  });

  if (!reglement) throw new ApiError("Reglement not found", 404);
  if (!user.isSuperAdmin && reglement.societeId !== user.societeId) {
    throw new ApiError("Access denied", 403);
  }

  return prisma.$transaction(async (tx) => {
    // ── Scenario 1: This règlement IS an advance used by BonReception(s) ──
    // Check if this règlement is referenced as an advance in the join table
    const advanceLinks = await tx.bonReceptionAdvance.findMany({
      where: { advanceId: id },
      select: {
        id: true,
        bonReceptionId: true,
        amountApplied: true,
      },
    });

    if (advanceLinks.length > 0) {
      // 1. Subtract amountApplied from each linked BR's amountPaid
      for (const link of advanceLinks) {
        const doc = await tx.fournisseurDocument.findUnique({
          where: { id: link.bonReceptionId },
          select: { id: true, amountPaid: true },
        });

        if (doc) {
          const newPaid = Math.max(
            0,
            Number(doc.amountPaid) - Number(link.amountApplied),
          );
          await tx.fournisseurDocument.update({
            where: { id: doc.id },
            data: { amountPaid: newPaid },
          });
        }
      }

      // 2. Delete the join records
      await tx.bonReceptionAdvance.deleteMany({ where: { advanceId: id } });

      // 3. Restore source advance balance so it is reusable again.
      //    Use increment so partial-consumption scenarios stay correct.
      //    updateMany silently skips if the source advance was already deleted.
      if (reglement.avanceId && reglement.avanceConsumed) {
        await tx.reglementFournisseur.updateMany({
          where: { id: reglement.avanceId },
          data: {
            montantRegle: reglement.avanceConsumed,
            montantBR: 0,
            documentNumbers: null,
          },
        });
      }

      // 4. Delete this derived règlement.
      // await tx.reglementFournisseur.delete({ where: { id } });
    }

    // ── Scenario 2: Standard règlement (not an advance) ───────────────────
    if (advanceLinks.length === 0) {
      const breakdown = reglement.paymentBreakdown;

      if (breakdown && typeof breakdown === "object") {
        // The breakdown total for each BR includes amounts sourced from
        // advances (_advances). Those advance portions were (or will be)
        // rolled back independently when each advance is deleted, so we
        // must subtract only the own-cash contribution of this règlement.
        const consumedAdvances = Array.isArray(breakdown._advances)
          ? breakdown._advances
          : [];
        const totalAdvanceAmount = consumedAdvances.reduce(
          (sum, ca) => sum + Number(ca.amount),
          0,
        );

        for (const [key, paidAmount] of Object.entries(breakdown)) {
          if (key === "_advances") continue;
          const ownAmount = Math.max(
            0,
            Number(paidAmount) - totalAdvanceAmount,
          );
          if (ownAmount === 0) continue;
          const doc = await tx.fournisseurDocument.findFirst({
            where: { societeId: reglement.societeId, documentNumber: key },
            select: { id: true, amountPaid: true },
          });
          if (doc) {
            await tx.fournisseurDocument.update({
              where: { id: doc.id },
              data: {
                amountPaid: Math.max(0, Number(doc.amountPaid) - ownAmount),
              },
            });
          }
        }

        // Restore any advances consumed by this règlement.
        // updateMany silently skips already-deleted advances.
        if (consumedAdvances.length > 0) {
          for (const ca of consumedAdvances) {
            await tx.reglementFournisseur.updateMany({
              where: { id: ca.id },
              data: { montantBR: 0, documentNumbers: null },
            });
          }
        }
      } else if (
        // No breakdown → fallback: roll back montantRegle from each
        // linked BR (advance applied directly without a breakdown).
        Array.isArray(reglement.documentNumbers) &&
        reglement.documentNumbers.length > 0
      ) {
        const rollbackAmount = Number(reglement.montantRegle);
        for (const docNumber of reglement.documentNumbers) {
          const doc = await tx.fournisseurDocument.findFirst({
            where: {
              societeId: reglement.societeId,
              documentNumber: docNumber,
            },
            select: { id: true, amountPaid: true },
          });
          if (doc) {
            await tx.fournisseurDocument.update({
              where: { id: doc.id },
              data: {
                amountPaid: Math.max(
                  0,
                  Number(doc.amountPaid) - rollbackAmount,
                ),
              },
            });
          }
        }
      }

      await tx.reglementFournisseur.delete({ where: { id } });
    }

    await reverseExpense(tx, id);
  });
};

// ============================================
// GENERATE REGLEMENT FOURNISSEUR PDF
// ============================================

const MARGIN = 50;

const MODE_LABELS = {
  ESPECE: "Espèces",
  CARTE_BANCAIRE: "Carte Bancaire",
  CHEQUE: "Chèque",
  EFFET: "Effet",
  CARTE_FIDELITE: "Carte Fidélité",
  BON_ACHAT: "Bon d'Achat",
  REMISE: "Remise",
  VIREMENT: "Virement",
};

export const generateReglementFournisseurPDF = async (id, user) => {
  const reglement = await prisma.reglementFournisseur.findUnique({
    where: { id },
    select: {
      id: true,
      societeId: true,
      date: true,
      modeReglement: true,
      documentNumbers: true,
      paymentBreakdown: true,
      montantRegle: true,
      montantBR: true,
      solde: true,
      refDocument: true,
      dateEcheance: true,
      avanceId: true,
      avanceConsumed: true,
      createdAt: true,
      fournisseur: {
        select: {
          id: true,
          name: true,
          phone: true,
          address: true,
          ice: true,
        },
      },
      banque: { select: { id: true, name: true, RIB: true, ville: true } },
      societe: {
        select: {
          raisonSocial: true,
          address: true,
          tel: true,
          ice: true,
          logo: true,
        },
      },
    },
  });

  if (!reglement) throw new ApiError("Reglement not found", 404);
  if (!user.isSuperAdmin && reglement.societeId !== user.societeId) {
    throw new ApiError("Access denied", 403);
  }

  const doc = new PDFDocument({
    size: "A4",
    margin: MARGIN,
    bufferPages: true,
  });
  const pageWidth = doc.page.width;
  const contentWidth = pageWidth - 2 * MARGIN;
  const { societe, fournisseur } = reglement;

  // ── Header ──────────────────────────────────────────────────────────
  doc.fillColor("#000000").fontSize(20).font("Helvetica-Bold");
  doc.text("REÇU DE RÈGLEMENT FOURNISSEUR", MARGIN, 40, {
    align: "center",
    width: contentWidth,
  });

  doc.fontSize(10).font("Helvetica").fillColor("#444444");
  doc.text(
    `Réf: RF-${String(reglement.id).padStart(6, "0")}  |  Date: ${formatDate(reglement.date)}`,
    MARGIN,
    68,
    { align: "center", width: contentWidth },
  );

  doc
    .strokeColor("#dddddd")
    .lineWidth(0.5)
    .moveTo(MARGIN, 88)
    .lineTo(pageWidth - MARGIN, 88)
    .stroke();

  // ── Société (left) & Fournisseur (right) ────────────────────────────
  const colW = contentWidth / 2 - 10;
  const rightX = MARGIN + colW + 20;
  let currentY = 105;

  doc.fillColor("#000000").font("Helvetica-Bold").fontSize(11);
  doc.text(societe.raisonSocial, MARGIN, currentY, { width: colW });
  doc.font("Helvetica").fontSize(9).fillColor("#444444");
  if (societe.address) doc.text(societe.address, { width: colW });
  if (societe.tel) doc.text(`Tél: ${societe.tel}`);
  if (societe.ice) doc.text(`ICE: ${societe.ice}`);
  const societeEndY = doc.y;

  doc.fillColor("#000000").font("Helvetica-Bold").fontSize(10);
  doc.text("FOURNISSEUR", rightX, currentY);
  doc.font("Helvetica").fontSize(9).fillColor("#000000");
  doc.text(fournisseur.name, rightX, currentY + 14, { width: colW });
  doc.fillColor("#444444");
  if (fournisseur.address) doc.text(fournisseur.address, { width: colW });
  if (fournisseur.phone) doc.text(`Tél: ${fournisseur.phone}`);
  if (fournisseur.ice) doc.text(`ICE: ${fournisseur.ice}`);
  const fournisseurEndY = doc.y;

  // ── Mode de règlement bar ────────────────────────────────────────────
  currentY = Math.max(societeEndY, fournisseurEndY) + 15;
  doc.rect(MARGIN, currentY, contentWidth, 22).fill("#f0f4ff");
  doc.fillColor("#333333").font("Helvetica-Bold").fontSize(9);
  const modeLabel =
    MODE_LABELS[reglement.modeReglement] || reglement.modeReglement;
  doc.text(`Mode de règlement: ${modeLabel}`, MARGIN + 10, currentY + 7, {
    width: contentWidth - 20,
    lineBreak: false,
  });

  doc.y = currentY + 38;

  // ── Payment details table ────────────────────────────────────────────
  const labelX = MARGIN;
  const valueX = MARGIN + 220;
  const rowH = 20;

  const drawRow = (label, value, shade = false) => {
    const y = doc.y;
    if (shade) doc.rect(labelX, y - 3, contentWidth, rowH).fill("#f9f9f9");
    doc
      .fillColor("#555555")
      .font("Helvetica")
      .fontSize(9)
      .text(label, labelX, y, { lineBreak: false });
    doc
      .fillColor("#000000")
      .font("Helvetica-Bold")
      .fontSize(9)
      .text(value ?? "—", valueX, y, { lineBreak: false });
    doc.y = y + rowH;
  };

  doc.moveDown(0.5);

  let shade = false;

  drawRow("Montant Total BR (DH):", formatMoney(reglement.montantBR), shade);
  shade = !shade;

  // 👉 Handle montant réglé + avance
  let montantRegleDisplay = formatMoney(reglement.montantRegle);

  if (reglement.avanceId) {
    const avance = reglement.avanceConsumed ?? 0;

    montantRegleDisplay = `${formatMoney(reglement.montantRegle)} + ${formatMoney(avance)} (avance)`;
  }

  drawRow("Montant Réglé (DH):", montantRegleDisplay, shade);
  shade = !shade;

  drawRow("Solde Restant (DH):", formatMoney(reglement.solde), shade);
  shade = !shade;

  if (reglement.refDocument) {
    drawRow("Référence document:", reglement.refDocument, shade);
    shade = !shade;
  }

  if (reglement.dateEcheance) {
    drawRow("Date d'échéance:", formatDate(reglement.dateEcheance), shade);
    shade = !shade;
  }

  if (reglement.banque) {
    drawRow("Banque:", reglement.banque.name, shade);
    shade = !shade;

    if (reglement.banque.RIB) {
      drawRow("RIB:", reglement.banque.RIB, shade);
      shade = !shade;
    }
  }

  if (reglement.avanceId) {
    drawRow(
      "Avance utilisée (ID):",
      `RF-${String(reglement.avanceId).padStart(6, "0")}`,
      shade,
    );
    shade = !shade;
  }

  // ── Documents BR ────────────────────────────────────────────────────
  const docNums = Array.isArray(reglement.documentNumbers)
    ? reglement.documentNumbers
    : [];
  if (docNums.length > 0) {
    doc.moveDown(1);
    doc
      .fillColor("#000000")
      .font("Helvetica-Bold")
      .fontSize(10)
      .text("Bons de Réception concernés:", MARGIN, doc.y);
    doc.moveDown(0.4);

    // Table header
    const brColW = contentWidth / 2;
    const startY = doc.y;
    doc.rect(MARGIN, startY - 3, contentWidth, 18).fill("#f8f9fa");
    doc.fillColor("#333333").font("Helvetica-Bold").fontSize(8);
    doc.text("N° Document", MARGIN + 5, startY, {
      width: brColW,
      lineBreak: false,
    });
    doc.text("Montant Appliqué (DH)", MARGIN + brColW, startY, {
      width: brColW,
      align: "right",
    });
    doc.y = startY + 18;

    const breakdown =
      reglement.paymentBreakdown &&
      typeof reglement.paymentBreakdown === "object"
        ? reglement.paymentBreakdown
        : {};

    docNums.forEach((docNum, i) => {
      const y = doc.y;
      if (i % 2 === 1)
        doc.rect(MARGIN, y - 2, contentWidth, 16).fill("#fdfdfd");
      doc.fillColor("#000000").font("Helvetica").fontSize(8);
      doc.text(docNum, MARGIN + 5, y, { width: brColW, lineBreak: false });
      const applied =
        breakdown[docNum] != null ? formatMoney(breakdown[docNum]) : "—";
      doc.text(applied, MARGIN + brColW, y, { width: brColW, align: "right" });
      doc.y = y + 16;
    });
  }

  // ── Divider + Signatures ─────────────────────────────────────────────
  if (doc.y > doc.page.height - 160) doc.addPage();
  doc.moveDown(2);
  doc
    .strokeColor("#cccccc")
    .lineWidth(1)
    .moveTo(MARGIN, doc.y)
    .lineTo(pageWidth - MARGIN, doc.y)
    .stroke();
  doc.moveDown(2);

  const sigY = doc.y;
  doc.fontSize(9).font("Helvetica").fillColor("#000000");
  doc.text("Signature du responsable", MARGIN, sigY, { lineBreak: false });
  doc.text("Signature du fournisseur", pageWidth - MARGIN - 150, sigY);
  doc.text("_________________", MARGIN, sigY + 40, { lineBreak: false });
  doc.text("_________________", pageWidth - MARGIN - 150, sigY + 40, {
    lineBreak: false,
  });

  // ── Footer (page numbers) ────────────────────────────────────────────
  doc.flushPages();
  const range = doc.bufferedPageRange();
  for (let i = 0; i < range.count; i++) {
    doc.switchToPage(i);
    doc.save();
    doc
      .fontSize(8)
      .font("Helvetica")
      .fillColor("#888888")
      .text(`Page ${i + 1} / ${range.count}`, MARGIN, doc.page.height - 40, {
        align: "center",
        width: contentWidth,
        lineBreak: false,
      });
    doc.restore();
  }

  return doc;
};
