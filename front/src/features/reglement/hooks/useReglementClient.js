import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { reglementClientApi, rcClientsApi, banquesApi } from "../api/reglementClient.api.js";
import { openPdfPreview } from "../../../shared/utils/pdfPreviewStore";
import { caisseKeys } from "../../caisse/hooks/useCaisse";

/* ─────── Query Keys ─────── */
export const rcKeys = {
  all: ["reglements-client"],
  unpaid: (clientId, societeId) => ["rc-unpaid", clientId, societeId],
};

export const rcClientKeys = {
  all: (keyword) => ["rc-clients", keyword],
};

/* ─────── Règlements Client Hooks ─────── */
export const useReglementClients = ({
  pageIndex = 0,
  pageSize = 10,
  keyword = "",
  clientId,
  startDate,
  endDate,
} = {}) => {
  return useQuery({
    queryKey: [...rcKeys.all, pageIndex, pageSize, keyword, clientId, startDate, endDate],
    queryFn: () =>
      reglementClientApi.getAll({
        page: pageIndex + 1,
        limit: pageSize,
        keyword,
        clientId,
        startDate,
        endDate,
      }),
    keepPreviousData: true,
  });
};

export const useCreateReglementClient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ societeId, payload }) =>
      reglementClientApi.create({ societeId, payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rcKeys.all });
      queryClient.invalidateQueries({ queryKey: caisseKeys.myCaisse });
      queryClient.invalidateQueries({ queryKey: caisseKeys.all });
      queryClient.invalidateQueries({ queryKey: caisseKeys.allTransactions });
    },
  });
};

export const useDeleteReglementClient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id}) => reglementClientApi.remove({ id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: rcKeys.all });
      queryClient.invalidateQueries({ queryKey: caisseKeys.myCaisse });
      queryClient.invalidateQueries({ queryKey: caisseKeys.all });
      queryClient.invalidateQueries({ queryKey: caisseKeys.allTransactions });
    },
  });
};

export const useUnpaidDocuments = ({ clientId, societeId } = {}) => {
  return useQuery({
    queryKey: rcKeys.unpaid(clientId, societeId),
    queryFn: () => reglementClientApi.getUnpaidByClient({ clientId, societeId }),
    enabled: !!clientId && !!societeId,
    staleTime: 0,
  });
};

/* ─────── Clients Hook ─────── */
export const useRCClients = ({ keyword = "" } = {}) => {
  return useQuery({
    queryKey: rcClientKeys.all(keyword),
    queryFn: () => rcClientsApi.getAll({ keyword, limit: 100 }),
    keepPreviousData: true,
    staleTime: 60_000,
  });
};

/* ─────── Banques Hook ─────── */
export const useBanques = () => {
  return useQuery({
    queryKey: ["banques"],
    queryFn: () => banquesApi.getAll({ limit: 100 }),
    staleTime: 5 * 60_000,
  });
};

/* ─────── Print PDF Hook ─────── */
export const usePrintReglementClient = () => {
  return useMutation({
    mutationFn: (id) => reglementClientApi.printPDF(id),
    onSuccess: (blob, id) => {
      openPdfPreview({
        blob,
        filename: `reglement-client-${id}.pdf`,
        title: "Aperçu — Règlement client",
      });
    },
  });
};