import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createSalesDocumentsApi, clientsApi } from "../api/salesDocuments.api";
import { openPdfPreview } from "../../../shared/utils/pdfPreviewStore";

export const createSalesDocumentHooks = (config) => {
  const api = createSalesDocumentsApi(config.apiBase);
  const rootKey = config.key;

  const useList = ({
    pageIndex = 0,
    pageSize = 10,
    startDate,
    endDate,
    clientId,
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
        clientId,
        status,
        keyword,
      ],
      queryFn: () =>
        api.getAll({
          page: pageIndex + 1,
          limit: pageSize,
          startDate,
          endDate,
          clientId,
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

  const useProducts = ({
    search,
    priceField = "prixVente1",
    page = 1,
    enabled = true,
    limit = 20,
  } = {}) =>
    useQuery({
      queryKey: [rootKey, "products", search, priceField, page, limit],
      queryFn: () =>
        api.products.search({ search, priceField, page, limit }),
      enabled,
      keepPreviousData: true,
      staleTime: 30_000,
    });

  const useClients = ({ keyword, societeId, pageSize = 100 } = {}) =>
    useQuery({
      queryKey: [rootKey, "clients", keyword, societeId],
      queryFn: () =>
        clientsApi.getAll({
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
    useClients,
  };
};
