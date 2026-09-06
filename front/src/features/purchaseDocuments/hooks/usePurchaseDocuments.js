import { useQuery, useMutation, useQueryClient } from "@/shared/lib/query";
import {
  createPurchaseDocumentsApi,
  fournisseursApi,
} from "../api/purchaseDocuments.api";
import { openPdfPreview } from "../../../shared/utils/pdfPreviewStore";

export const createPurchaseDocumentHooks = (config) => {
  const api = createPurchaseDocumentsApi(config.apiBase);
  const rootKey = config.key;

  const useList = ({
    pageIndex = 0,
    pageSize = 10,
    startDate,
    endDate,
    frsId,
    status,
    keyword = "",
  } = {}) =>
    useQuery({
      queryKey: [
        rootKey,
        pageIndex,
        pageSize,
        startDate,
        endDate,
        frsId,
        status,
        keyword,
      ],
      queryFn: () =>
        api.getAll({
          page: pageIndex + 1,
          limit: pageSize,
          startDate,
          endDate,
          frsId,
          status,
          keyword,
        }),
      keepPreviousData: true,
    });

  const useById = (id) =>
    useQuery({
      queryKey: [rootKey, "one", String(id)],
      queryFn: () => api.getById(id),
      enabled: !!id,
    });

  const useNextNumber = (societeId) =>
    useQuery({
      queryKey: [rootKey, "next-number", societeId],
      queryFn: () => api.getNextNumber(societeId),
      enabled: !!societeId,
      staleTime: 0,
    });

  const useCreate = () => {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: api.create,
      onSuccess: () => qc.invalidateQueries({ queryKey: [rootKey] }),
    });
  };

  const useUpdate = () => {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: ({ id, payload }) => api.update(id, payload),
      onSuccess: (_, { id }) => {
        qc.invalidateQueries({ queryKey: [rootKey] });
        qc.invalidateQueries({ queryKey: [rootKey, "one", String(id)] });
      },
    });
  };

  const useDelete = () => {
    const qc = useQueryClient();
    return useMutation({
      mutationFn: api.remove,
      onSuccess: () => qc.invalidateQueries({ queryKey: [rootKey] }),
    });
  };

  const usePrint = () =>
    useMutation({
      mutationFn: async ({ id, filename, title }) => {
        const blob = await api.printPDF(id, false);
        openPdfPreview({
          blob,
          filename: filename || `${config.key}-${id}.pdf`,
          title: title || `Aperçu — ${config.singular || config.title}`,
        });
        return blob;
      },
    });

  const useProducts = ({ search, page = 1, enabled = true, limit = 20 } = {}) =>
    useQuery({
      queryKey: [rootKey, "products", search, page, limit],
      queryFn: () => api.products.search({ search, page, limit }),
      enabled,
      keepPreviousData: true,
      staleTime: 30_000,
    });

  const useFournisseurs = ({ keyword, societeId, pageSize = 100 } = {}) =>
    useQuery({
      queryKey: [rootKey, "fournisseurs", keyword, societeId],
      queryFn: () =>
        fournisseursApi.getAll({
          keyword,
          societeId,
          limit: pageSize,
          page: 1,
        }),
    });

  return {
    api,
    useList,
    useById,
    useNextNumber,
    useCreate,
    useUpdate,
    useDelete,
    usePrint,
    useProducts,
    useFournisseurs,
  };
};
