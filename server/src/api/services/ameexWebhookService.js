import prisma from "../../loaders/prisma.js";
import { runInBackground } from "../utils/runInBackground.js";
import stockManagementService from "./domain/stockManagementService.js";

/* ============================================================
   AMEEX STATUS → ADVANCED BL STATUS MAP

   Only the statuses relevant to our workflow are mapped.
   Anything outside this object is silently ignored.
============================================================ */
export const AMEEX_TO_BL_STATUS = {
  PICKED_UP: "COLLECTE",
  DISTRIBUTION: "EN_ROUTE",
  DELIVERED: "LIVRE", // auto-followed by PAYE
  RETURNED: "ANNULE",
  POSTPONED: "REPORTE", // parallel condition — does not change commandStatus
};

// States where stock OUTBOUND was already applied (at PREPARE transition).
// ANNULE from any of these requires an INBOUND rollback.
const STOCK_APPLIED_STATES = new Set([
  "PREPARE",
  "COLLECTE",
  "EN_ROUTE",
  "LIVRE",
]);

/* ============================================================
   STEP 1 — SAVE AND SCHEDULE
   Called synchronously inside the HTTP handler.
   Persists the raw payload, then runs processing in-process
   (same Node server, fire-and-forget) so the HTTP response
   can return 200 immediately.
============================================================ */
export const saveAndEnqueue = async (rawPayload) => {
  const trackingCode = (rawPayload.CODE ?? rawPayload.code ?? "").trim();
  const ameexStatus = (rawPayload.STATUS ?? rawPayload.status ?? "").trim();

  const log = await prisma.ameexWebhookLog.create({
    data: {
      trackingCode,
      ameexStatus,
      rawPayload,
      status: "PENDING",
    },
  });

  runInBackground(() => processWebhookJob(log.id), {
    attempts: 5,
    delayMs: 10_000,
    label: `AmeexWebhook:${log.id}`,
  });

  return { logId: log.id, trackingCode, ameexStatus };
};

/* ============================================================
   STEP 2 — PROCESS WEBHOOK JOB
   Runs in the API process after saveAndEnqueue schedules it.
   Reads the log row, applies the BL status change, then stamps
   the log as PROCESSED or FAILED.
============================================================ */
export const processWebhookJob = async (logId) => {
  const log = await prisma.ameexWebhookLog.findUnique({ where: { id: logId } });
  if (!log) throw new Error(`Webhook log ${logId} not found`);
  if (log.status === "PROCESSED") return { skipped: true };

  // Mark as PROCESSING to prevent concurrent overlap
  await prisma.ameexWebhookLog.update({
    where: { id: logId },
    data: { status: "PROCESSING" },
  });

  try {
    const result = await _applyStatusChange(
      log.trackingCode,
      log.ameexStatus,
      log.rawPayload,
    );

    await prisma.ameexWebhookLog.update({
      where: { id: logId },
      data: { status: "PROCESSED", processedAt: new Date(), error: null },
    });

    return result;
  } catch (err) {
    await prisma.ameexWebhookLog.update({
      where: { id: logId },
      data: { status: "FAILED", error: err.message },
    });
    throw err;
  }
};

/* ============================================================
   INTERNAL — APPLY STATUS CHANGE
   Core business logic: map Ameex status → BL state mutation.
============================================================ */
const _applyStatusChange = async (
  trackingCode,
  ameexStatus,
  rawPayload = {},
) => {
  const targetStatus = AMEEX_TO_BL_STATUS[ameexStatus];

  if (!targetStatus) {
    return {
      handled: false,
      message: `Status "${ameexStatus}" not mapped — ignored`,
    };
  }

  // Load BL with everything needed for stock rollback
  const bl = await prisma.bonLivraison.findFirst({
    where: { type: "ADVANCED", colisTrackingNumber: trackingCode },
    include: {
      document: {
        select: {
          id: true,
          documentNumber: true,
          totalTTC: true,
          lines: {
            select: { articleId: true, variantId: true, quantity: true },
          },
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

  if (!bl) {
    return {
      handled: false,
      message: `No BL found for tracking number: ${trackingCode}`,
    };
  }

  const blId = bl.id;
  const currentStatus = bl.commandStatus;
  // ── POSTPONED → REPORTE (parallel condition, no commandStatus change) ──────
  if (targetStatus === "REPORTE") {
    // Parse the optional DATE field (next scheduled delivery date from Ameex)
    const rawDate = rawPayload.DATE ?? rawPayload.date ?? null;
    const nextDeliveryDate = rawDate ? new Date(rawDate) : null;

    await prisma.$transaction(async (tx) => {
      await tx.bonLivraison.update({
        where: { id: blId },
        data: {
          isReported: true,
          reportedAt: new Date(),
          reportReason: "Ameex: parcel postponed",
          ...(nextDeliveryDate &&
            !isNaN(nextDeliveryDate) && { nextDeliveryDate }),
        },
      });
      await tx.bonLivraisonStatusHistory.create({
        data: {
          bonId: blId,
          status: "REPORTE",
          note: "Ameex webhook: POSTPONED",
          userId: null,
        },
      });
    });
    return {
      handled: true,
      blId,
      message: `BL marked as reported (POSTPONED)${nextDeliveryDate && !isNaN(nextDeliveryDate) ? `, nextDeliveryDate: ${nextDeliveryDate.toISOString().slice(0, 10)}` : ""}`,
    };
  }

  // ── DELIVERED → LIVRE then PAYE ─────────────────────────────────────────
  if (targetStatus === "LIVRE") {
    const totalTTC = parseFloat(bl.document.totalTTC);
    await prisma.$transaction(async (tx) => {
      await tx.bonLivraison.update({
        where: { id: blId },
        data: { commandStatus: "PAYE" },
      });
      await tx.clientDocument.update({
        where: { id: blId },
        data: { status: "COMPLETED", amountPaid: totalTTC }, // amountDue: 0
      });
      await tx.bonLivraisonStatusHistory.createMany({
        data: [
          {
            bonId: blId,
            status: "LIVRE",
            note: "Ameex webhook: DELIVERED",
            userId: null,
          },
          {
            bonId: blId,
            status: "PAYE",
            note: "Ameex webhook: auto-settled",
            userId: null,
          },
        ],
      });
    });
    return { handled: true, blId, message: "BL set to LIVRE → PAYE" };
  }

  // ── RETURNED → ANNULE (stock rollback when needed) ──────────────────────
  if (targetStatus === "ANNULE") {
    const needsRollback = STOCK_APPLIED_STATES.has(currentStatus);
    const stockItems = needsRollback ? await _collectRollbackItems(bl) : [];

    await prisma.$transaction(
      async (tx) => {
        if (stockItems.length > 0) {
          await stockManagementService.batchStockOperationsWithTx(
            tx,
            stockItems,
          );
        }
        await tx.bonLivraison.update({
          where: { id: blId },
          data: { commandStatus: "ANNULE" },
        });
        await tx.clientDocument.update({
          where: { id: blId },
          data: { status: "CANCELLED" },
        });
        await tx.bonLivraisonStatusHistory.create({
          data: {
            bonId: blId,
            status: "ANNULE",
            note: `Ameex webhook: RETURNED${needsRollback ? " (stock rolled back)" : ""}`,
            userId: null,
          },
        });
      },
      { timeout: 30_000 },
    );
    return {
      handled: true,
      blId,
      message: `BL cancelled${needsRollback ? " with stock rollback" : ""}`,
    };
  }

  // ── PICKED_UP → COLLECTE  |  DISTRIBUTION → EN_ROUTE ───────────────────
  await prisma.$transaction(async (tx) => {
    await tx.bonLivraison.update({
      where: { id: blId },
      data: { commandStatus: targetStatus },
    });
    await tx.bonLivraisonStatusHistory.create({
      data: {
        bonId: blId,
        status: targetStatus,
        note: `Ameex webhook: ${ameexStatus}`,
        userId: null,
      },
    });
  });

  return { handled: true, blId, message: `BL updated to ${targetStatus}` };
};

/* ============================================================
   INTERNAL — COLLECT INBOUND STOCK ITEMS FOR ROLLBACK
============================================================ */
const _collectRollbackItems = async (bl) => {
  const items = [];
  const ref = bl.document.documentNumber;
  const reason = `Ameex RETURNED rollback: ${ref}`;

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
      quantityChange: parseFloat(line.quantity), // positive = INBOUND
      transactionType: "RETURN_IN",
      referenceId: ref,
      reason,
      userId: null,
      bonLivraisonId: bl.id,
    });
  }

  for (const packLine of bl.packLines) {
    const packQty = parseFloat(packLine.quantity);
    for (const comp of packLine.pack.components) {
      const article =
        comp.article || (comp.variant ? { gereEnStock: true } : null);
      if (!article?.gereEnStock) continue;
      items.push({
        depotId: bl.depotId,
        articleId: comp.articleId || null,
        variantId: comp.variantId || null,
        quantityChange: parseFloat(comp.quantity) * packQty,
        transactionType: "RETURN_IN",
        referenceId: ref,
        reason,
        userId: null,
        bonLivraisonId: bl.id,
      });
    }
  }

  return items;
};
