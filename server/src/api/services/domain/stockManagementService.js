import prisma from "../../../loaders/prisma.js";
import ApiError from "../../utils/apiError.js";

/* ============================================================
   STOCK MANAGEMENT SERVICE
   Handles gereEnStock logic for stock-managed vs non-stock items.

   v6.0 schema changes reflected here:
   ─────────────────────────────────────────────────────────────
   TransactionType enum:
     OLD: RETURN (ambiguous)
     NEW: RETURN_IN  — client returns goods to us (stock increases)
          RETURN_OUT — we return goods to supplier (stock decreases)

   StockTransaction source-tracking fields:
     REMOVED: avoirId        → Avoir is now financial-only, zero stock impact
     REMOVED: bonRetourId    → model renamed to BonRetourFournisseur
     ADDED:   bonRetourClientId      (RETURN_IN  — maps to BonRetourClient)
     ADDED:   bonRetourFournisseurId (RETURN_OUT — maps to BonRetourFournisseur)

   All other fields (transferId, inventoryId, bonLivraisonId, bonReceptionId)
   are unchanged.
============================================================ */

/* ============================================================
   CHECK IF PRODUCT IS STOCK-MANAGED
============================================================ */

const isArticleStockManaged = async (articleId) => {
  const article = await prisma.article.findUnique({
    where: { id: articleId },
    select: { gereEnStock: true },
  });

  if (!article) throw new ApiError("Article not found", 404);

  return article.gereEnStock;
};

const isVariantStockManaged = async (variantId) => {
  const variant = await prisma.articleVariant.findUnique({
    where: { id: variantId },
    include: {
      article: { select: { gereEnStock: true } },
    },
  });

  if (!variant) throw new ApiError("Variant not found", 404);

  return variant.article.gereEnStock;
};

export const isProductStockManaged = async (articleId, variantId) => {
  if (articleId) return await isArticleStockManaged(articleId);
  if (variantId) return await isVariantStockManaged(variantId);
  throw new ApiError("Either articleId or variantId must be provided", 400);
};

/* ============================================================
   STOCK UPDATE WITH GERESTOCK CHECK (standalone helper)
============================================================ */

export const updateStockIfManaged = async ({
  depotId,
  articleId,
  variantId,
  quantityChange,
  field = "quantityAvailable",
}) => {
  const isManaged = await isProductStockManaged(articleId, variantId);

  if (!isManaged) return null;

  const stockWhere = {
    depotId,
    articleId: articleId || null,
    variantId: variantId || null,
  };

  let stock = await prisma.stockByDepot.findFirst({ where: stockWhere });

  if (!stock) {
    stock = await prisma.stockByDepot.create({
      data: {
        ...stockWhere,
        quantityAvailable: 0,
        quantityReserved: 0,
        quantityInTransit: 0,
      },
    });
  }

  return await prisma.stockByDepot.update({
    where: { id: stock.id },
    data: { [field]: { increment: quantityChange } },
  });
};

/* ============================================================
   INTERNAL CORE: Process a single stock operation inside a tx
   ─────────────────────────────────────────────────────────────
   Shared by batchStockOperations, batchStockOperationsWithTx,
   and createStockTransaction. Single source of truth for the
   StockTransaction.create() data shape.

   Operation object shape:
   {
     depotId:          Int    (required)
     articleId:        Int?   (mutex with variantId)
     variantId:        Int?   (mutex with articleId)
     quantityChange:   Float  (positive = stock increases, negative = decreases)
     transactionType:  TransactionType enum value (required)
     referenceId:      String? (document number for traceability)
     reason:           String?
     userId:           Int?   (createdBy)

     // Source tracking — set at most one per call:
     transferId:             Int?  (TRANSFER_IN / TRANSFER_OUT)
     inventoryId:            Int?  (ADJUSTMENT)
     bonLivraisonId:         Int?  (OUTBOUND — delivery to client)
     bonRetourClientId:      Int?  (RETURN_IN — client returns goods to us)
     bonReceptionId:         Int?  (INBOUND — goods received from supplier)
     bonRetourFournisseurId: Int?  (RETURN_OUT — we return goods to supplier)
   }
============================================================ */

const processStockOperation = async (tx, op) => {
  const isManaged = await isProductStockManaged(op.articleId, op.variantId);

  const stockWhere = {
    depotId: op.depotId,
    articleId: op.articleId || null,
    variantId: op.variantId || null,
  };

  let stock = await tx.stockByDepot.findFirst({ where: stockWhere });

  const currentQty = parseFloat(stock?.quantityAvailable ?? 0);
  const quantityAfter = currentQty + op.quantityChange;

  // Always create the transaction record for full audit trail
  // regardless of whether the product is stock-managed
  const transaction = await tx.stockTransaction.create({
    data: {
      depotId: op.depotId,
      articleId: op.articleId || null,
      variantId: op.variantId || null,
      quantityChange: op.quantityChange,
      quantityAfter,
      transactionType: op.transactionType,
      referenceId: op.referenceId || null,
      reason: op.reason || null,
      createdBy: op.userId || null,

      // ── Source tracking (v6.0 field names) ──────────────────
      transferId: op.transferId || null,
      inventoryId: op.inventoryId || null,
      bonLivraisonId: op.bonLivraisonId || null,
      bonRetourClientId: op.bonRetourClientId || null, // ✅ v6.0 NEW
      bonReceptionId: op.bonReceptionId || null,
      bonRetourFournisseurId: op.bonRetourFournisseurId || null, // ✅ v6.0 NEW (was bonRetourId)
      // ── avoirId intentionally removed (Avoir = financial only) ──
    },
  });

  // Update StockByDepot.quantityAvailable only for stock-managed products
  let stockUpdate = null;

  if (isManaged) {
    if (!stock) {
      stock = await tx.stockByDepot.create({
        data: {
          ...stockWhere,
          quantityAvailable: 0,
          quantityReserved: 0,
          quantityInTransit: 0,
        },
      });
    }

    stockUpdate = await tx.stockByDepot.update({
      where: { id: stock.id },
      data: { quantityAvailable: { increment: op.quantityChange } },
    });
  }

  return {
    transaction,
    stockUpdated: isManaged,
    stock: stockUpdate,
  };
};

/* ============================================================
   CREATE STOCK TRANSACTION (single, standalone — opens own tx)
============================================================ */

export const createStockTransaction = async (transactionData) => {
  return await prisma.$transaction(async (tx) => {
    return await processStockOperation(tx, transactionData);
  });
};

/* ============================================================
   BATCH STOCK OPERATIONS
   Opens its own transaction.
   Use when called OUTSIDE an existing prisma.$transaction().
============================================================ */

export const batchStockOperations = async (operations) => {
  return await prisma.$transaction(
    async (tx) => {
      const results = [];
      for (const op of operations) {
        results.push(await processStockOperation(tx, op));
      }
      return results;
    },
    { timeout: 30000 },
  );
};

/* ============================================================
   BATCH STOCK OPERATIONS WITH TX
   Accepts an existing Prisma transaction client.
   Use when called INSIDE an existing prisma.$transaction()
   to avoid nested transaction timeout errors.
============================================================ */

export const batchStockOperationsWithTx = async (tx, operations) => {
  const results = [];
  for (const op of operations) {
    results.push(await processStockOperation(tx, op));
  }
  return results;
};

/* ============================================================
   QUERY HELPERS
============================================================ */

export const buildStockManagedFilter = () => ({
  article: { gereEnStock: true },
});

export const getStockManagedArticles = async (filters = {}) => {
  return await prisma.article.findMany({
    where: { ...filters, gereEnStock: true },
  });
};

export const getStockManagedVariants = async (filters = {}) => {
  return await prisma.articleVariant.findMany({
    where: { ...filters, article: { gereEnStock: true } },
  });
};

export default {
  isProductStockManaged,
  updateStockIfManaged,
  createStockTransaction,
  batchStockOperations,
  batchStockOperationsWithTx,
  buildStockManagedFilter,
  getStockManagedArticles,
  getStockManagedVariants,
};
