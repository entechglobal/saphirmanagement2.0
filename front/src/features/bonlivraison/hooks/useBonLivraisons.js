import { useQuery, useMutation, useQueryClient } from "@/shared/lib/query";
import { bonLivraisonsApi, blProductsApi, clientsApi, deliveriesApi } from "../api/bonLivraisons.api.js";
import { packsApi } from "../../saphirmanagement/packs/api/packs.api";
import { openPdfPreview } from "../../../shared/utils/pdfPreviewStore";

/* ─────── Query Keys ─────── */
export const blKeys = {
  all: ["bon-livraisons"],
  one: (id) => ["bon-livraison", String(id)],
  nextNumber: (societeId) => ["bl-next-number", societeId],
};

export const blProductKeys = {
  search: (depotId, priceField, search, page) => [
    "bl-products",
    depotId,
    priceField,
    search,
    page,
  ],
};

export const blClientKeys = {
  all: (keyword, societeId) => ["bl-clients", keyword, societeId],
};

// ✅ NEW
export const blAdvanceKeys = {
  byClient: (clientId, societeId) => ["bl-advances", clientId, societeId],
};

export const blPacksKeys = {
  list: (search, page) => ["bl-packs", search, page],
};

/* ─────── Bon Livraisons Hooks ─────── */
export const useBonLivraisons = ({
  pageIndex = 0,
  pageSize = 10,
  startDate,
  endDate,
  clientId,
  depotId,
  status,
  keyword = "",
} = {}) => {
  return useQuery({
    queryKey: [
      "bon-livraisons",
      pageIndex,
      pageSize,
      startDate,
      endDate,
      clientId,
      depotId,
      status,
      keyword,
    ],
    queryFn: () =>
      bonLivraisonsApi.getAll({
        page: pageIndex + 1,
        limit: pageSize,
        startDate,
        endDate,
        clientId,
        depotId,
        status,
        keyword,
      }),
    keepPreviousData: true,
  });
};

export const useBonLivraisonById = (id) => {
  return useQuery({
    queryKey: blKeys.one(id),
    queryFn: () => bonLivraisonsApi.getById(id),
    enabled: !!id,
  });
};

export const useNextBLNumber = (societeId) => {
  return useQuery({
    queryKey: blKeys.nextNumber(societeId),
    queryFn: () => bonLivraisonsApi.getNextNumber(societeId),
    enabled: !!societeId,
    staleTime: 0,
  });
};

export const useCreateBonLivraison = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bonLivraisonsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blKeys.all });
      queryClient.invalidateQueries({ queryKey: ["stock"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["stockTransactions"], exact: false });
    },
  });
};

export const useDeleteBonLivraison = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bonLivraisonsApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: blKeys.all });
      queryClient.invalidateQueries({ queryKey: ["stock"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["stockTransactions"], exact: false });
    },
  });
};

export const useValidateBonLivraison = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, targetStatus }) => bonLivraisonsApi.validate(id, { targetStatus }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: blKeys.all });
      queryClient.removeQueries({ queryKey: blKeys.one(id) });
      queryClient.invalidateQueries({ queryKey: ["stock"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["stockTransactions"], exact: false });
    },
  });
};

/* ─────── BL Products Hook ─────── */
export const useBLProducts = ({
  depotId,
  priceField,
  search,
  page = 1,
  limit = 50,
  enabled = true,
} = {}) => {
  return useQuery({
    queryKey: blProductKeys.search(depotId, priceField, search, page),
    queryFn: () =>
      blProductsApi.search({
        depotId,
        priceField,
        search: search || undefined,
        page,
        limit,
      }),
    enabled: enabled && !!depotId,
    keepPreviousData: true,
    staleTime: 30_000,
  });
};

/* ─────── Clients Hook — filtered by societeId when depot is selected ─────── */
export const useBLClients = ({ keyword = "", societeId } = {}) => {
  return useQuery({
    queryKey: blClientKeys.all(keyword, societeId),
    queryFn: () => clientsApi.getAll({ keyword, societeId, limit: 100 }),
    keepPreviousData: true,
    staleTime: 60_000,
  });
};

/* ─────── Deliveries ─────── */
export const useDeliveries = (params = {}) => {
  return useQuery({
    queryKey: deliveriesApi.listKey(params),
    queryFn: () => deliveriesApi.getAll(params),
    keepPreviousData: true,
    staleTime: 60_000,
  });
};

// ✅ NEW: Client Advances Hook
export const useClientAdvances = ({ clientId, societeId } = {}) => {
  return useQuery({
    queryKey: blAdvanceKeys.byClient(clientId, societeId),
    queryFn: () => bonLivraisonsApi.getClientAdvances(clientId, societeId),
    enabled: !!clientId && !!societeId,
    staleTime: 30_000,
  });
};

/* ─────── BL Packs Hook ─────── */
export const useBLPacks = ({ search, page = 1, limit = 10, enabled = true } = {}) => {
  return useQuery({
    queryKey: blPacksKeys.list(search, page),
    queryFn: () => packsApi.getAll({ search, page, limit }),
    enabled,
    keepPreviousData: true,
    staleTime: 60_000,
  });
};

// Re-export depot hook alias
export { useDepots } from "../../repositories/hooks/useRepositories";

export const useUpdateBonLivraison = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => bonLivraisonsApi.update(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: blKeys.all });
      queryClient.invalidateQueries({ queryKey: blKeys.one(id) });
      queryClient.invalidateQueries({ queryKey: ["stock"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["stockTransactions"], exact: false });
    },
  });
};

// ✅ Print PDF Hook — preview first, then print/download
export const usePrintBonLivraison = () => {
  return useMutation({
    mutationFn: ({ id, view = false }) => bonLivraisonsApi.printPDF(id, view),
    onSuccess: (blob, { id }) => {
      openPdfPreview({
        blob,
        filename: `bon-livraison-${id}.pdf`,
        title: "Aperçu — Bon de livraison",
      });
    },
  });
};