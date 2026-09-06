import { useQuery, useMutation, useQueryClient } from "@/shared/lib/query";
import { bonReceptionsApi, brProductsApi, brFournisseursApi, brFrsAdvancesApi } from "../api/bonReceptions.api.js";
import { openPdfPreview } from "../../../shared/utils/pdfPreviewStore";

/* ─────── Query Keys ─────── */
export const brKeys = {
  all: ["bon-receptions"],
  one: (id) => ["bon-reception", id],
  nextNumber: (societeId) => ["br-next-number", societeId],
};

export const brProductKeys = {
  search: (search, page) => ["br-products", search, page],
};

export const brFrsKeys = {
  all: (keyword, societeId) => ["br-fournisseurs", keyword, societeId],
};

/* ─────── List ─────── */
export const useBonReceptions = ({
  pageIndex = 0,
  pageSize = 10,
  frsId,
  depotId,
  status,
  startDate,
  endDate,
  search = "",
} = {}) => {
  return useQuery({
    queryKey: ["bon-receptions", pageIndex, pageSize, frsId, depotId, status, startDate, endDate, search],
    queryFn: () =>
      bonReceptionsApi.getAll({
        page: pageIndex + 1,
        limit: pageSize,
        frsId,
        depotId,
        status,
        startDate,
        endDate,
        search,
      }),
    keepPreviousData: true,
  });
};

export const useBonReceptionById = (id) => {
  return useQuery({
    queryKey: brKeys.one(id),
    queryFn: () => bonReceptionsApi.getById(id),
    enabled: !!id,
  });
};

export const useNextBRNumber = (societeId) => {
  return useQuery({
    queryKey: brKeys.nextNumber(societeId),
    queryFn: () => bonReceptionsApi.getNextNumber(societeId),
    enabled: !!societeId,
    staleTime: 0,
  });
};

/* ─────── Mutations ─────── */
export const useCreateBonReception = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bonReceptionsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: brKeys.all });
      queryClient.invalidateQueries({ queryKey: ["articles"] });
      queryClient.invalidateQueries({ queryKey: ["article"] });
      queryClient.invalidateQueries({ queryKey: ["stock"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["stockTransactions"], exact: false });
    },
  });
};

export const useDeleteBonReception = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bonReceptionsApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: brKeys.all });
      queryClient.invalidateQueries({ queryKey: ["stock"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["stockTransactions"], exact: false });
    },
  });
};

export const useValidateBonReception = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, targetStatus }) =>
      bonReceptionsApi.validate(id, { targetStatus }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: brKeys.all });
      queryClient.invalidateQueries({ queryKey: brKeys.one(id) });
      queryClient.invalidateQueries({ queryKey: ["stock"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["stockTransactions"], exact: false });
    },
  });
};

export const useUpdateBonReception = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => bonReceptionsApi.update(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: brKeys.all });
      queryClient.invalidateQueries({ queryKey: brKeys.one(id) });
      queryClient.invalidateQueries({ queryKey: ["stock"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["stockTransactions"], exact: false });
    },
  });
};

export const usePrintBonReception = () => {
  return useMutation({
    mutationFn: ({ id, view = false }) => bonReceptionsApi.printPDF(id, view),
    onSuccess: (blob, { id }) => {
      openPdfPreview({
        blob,
        filename: `bon-reception-${id}.pdf`,
        title: "Aperçu — Bon de réception",
      });
    },
  });
};

/* ─────── Products (catalog picker, no depot/priceField) ─────── */
export const useBRProducts = ({
  depotId,
  search,
  page = 1,
  limit = 50,
  enabled = true,
} = {}) => {
  return useQuery({
    queryKey: [...brProductKeys.search(search, page), depotId],
    queryFn: () =>
      brProductsApi.search({ depotId, search: search || undefined, page, limit }),
    enabled: enabled && !!depotId,
    keepPreviousData: true,
    staleTime: 30_000,
  });
};

/* ─────── Fournisseurs ─────── */
export const useBRFournisseurs = ({ keyword = "", societeId } = {}) => {
  return useQuery({
    queryKey: brFrsKeys.all(keyword, societeId),
    queryFn: () => brFournisseursApi.getAll({ keyword, societeId, limit: 100 }),
    keepPreviousData: true,
    staleTime: 60_000,
  });
};

export const brFrsAdvanceKeys = {
  byFrs: (fournisseurId, societeId) => ["br-frs-advances", fournisseurId, societeId],
};

export const useFrsAdvances = ({ fournisseurId, societeId } = {}) => {
  return useQuery({
    queryKey: brFrsAdvanceKeys.byFrs(fournisseurId, societeId),
    queryFn: () => brFrsAdvancesApi.getByFournisseur({ fournisseurId, societeId }),
    enabled: !!fournisseurId && !!societeId,
    staleTime: 0,
  });
};

export { useDepots } from "../../repositories/hooks/useRepositories";
