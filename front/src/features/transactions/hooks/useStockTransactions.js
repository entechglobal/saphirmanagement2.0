import { useQuery, keepPreviousData, useMutation } from "@/shared/lib/query";
import { stockTransactionsApi } from "../api/stockTransactions.api";
import { openPdfPreview } from "../../../shared/utils/pdfPreviewStore";

/**
 * Query keys
 */
export const stockTransactionKeys = {
  all: ["stockTransactions"],
  lists: () => [...stockTransactionKeys.all, "list"],
  list: (filters) => [...stockTransactionKeys.lists(), filters],
  unifiedProducts: (filters) => [
    ...stockTransactionKeys.all,
    "unified",
    filters,
  ],
};

// ─── Queries ─────────────────────────────────────────────────────────────────

/**
 * Fetch paginated stock transactions
 * NOTE: results are only fetched when either articleId or variantId is provided
 */
export const useStockTransactions = ({
  pageIndex,
  pageSize,
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
  const hasProduct = !!articleId || !!variantId;

  return useQuery({
    queryKey: stockTransactionKeys.list({
      pageIndex,
      pageSize,
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
    }),
    queryFn: () =>
      stockTransactionsApi.getAll({
        page: pageIndex != null ? pageIndex + 1 : undefined,
        limit: pageSize,
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
      }),
    enabled: hasProduct, // ← Only fetch when a product is selected
    placeholderData: keepPreviousData,
  });
};

/**
 * Mutation to download the PDF print report
 * Uses the same filters as the main table query
 */
export const usePrintStockTransactions = () => {
  return useMutation({
    mutationFn: (filters) => stockTransactionsApi.printPdf(filters),
    onSuccess: (blob) => {
      openPdfPreview({
        blob,
        filename: `stock-transactions-${Date.now()}.pdf`,
        title: "Aperçu — Mouvements de stock",
      });
    },
  });
};

/**
 * Fetch unified product list (articles + variants)
 * Used for the product autocomplete selector
 * Optionally filtered by familyId
 */
export const useUnifiedProducts = ({ keyword, familyId } = {}) => {
  return useQuery({
    queryKey: stockTransactionKeys.unifiedProducts({ keyword, familyId }),
    queryFn: () =>
      stockTransactionsApi.getUnifiedProducts({
        keyword: keyword || undefined,
        familyId: familyId || undefined,
      }),
    placeholderData: keepPreviousData,
  });
};
