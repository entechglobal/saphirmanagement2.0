import apiClient from "../../../shared/api/axios";

const api = apiClient;

/**
 * Stock Transactions API
 * ONLY HTTP calls – no cache, no logic
 */
export const stockTransactionsApi = {
  /**
   * GET /stock-transactions
   * Fetch paginated stock transactions with optional filters
   */
  getAll: async ({
    page,
    limit,
    depotId,
    documentType,
    movement,
    startDate,
    endDate,
    clientId,
    fournisseurId,
    familyId,
    societeId,
    variantId,
    articleId,
  } = {}) => {
    const res = await api.get("/stock-transactions", {
      params: {
        page,
        limit,
        depotId: depotId || undefined,
        documentType: documentType || undefined,
        movement: movement || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        clientId: clientId || undefined,
        fournisseurId: fournisseurId || undefined,
        familyId: familyId || undefined,
        societeId: societeId || undefined,
        variantId: variantId || undefined,
        articleId: articleId || undefined,
      },
    });
    return res.data;
  },



/**
 * GET /stock-transactions/print
 * Returns a PDF blob with the current filters applied
 */
printPdf: async ({
  depotId,
  documentType,
  movement,
  startDate,
  endDate,
  clientId,
  fournisseurId,
  familyId,
  societeId,
  variantId,
  articleId,
} = {}) => {
  const res = await api.get("/stock-transactions/print", {
    params: {
      depotId: depotId || undefined,
      documentType: documentType || undefined,
      movement: movement || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      clientId: clientId || undefined,
      fournisseurId: fournisseurId || undefined,
      familyId: familyId || undefined,
      societeId: societeId || undefined,
      variantId: variantId || undefined,
      articleId: articleId || undefined,
    },
    responseType: "blob", // ← critical: tells axios to handle PDF bytes
  });
  return res.data;
},

  /**
   * GET /stock-transactions/unified
   * Fetch unified product list (articles + variants) for product selector
   */
  getUnifiedProducts: async ({ keyword, familyId } = {}) => {
    const res = await api.get("/stock-transactions/unified", {
      params: {
        keyword: keyword || undefined,
        familyId: familyId || undefined,
        limit:100000
      },
    });
    return res.data;
  },
};