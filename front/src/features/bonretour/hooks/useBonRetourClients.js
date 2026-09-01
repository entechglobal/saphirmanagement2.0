import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { bonRetourClientsApi, brProductsApi, brClientsApi } from "../api/bonRetourClients.api.js";
import { packsApi } from "../../saphirmanagement/packs/api/packs.api";
import { openPdfPreview } from "../../../shared/utils/pdfPreviewStore";

/* ─────── Query Keys ─────── */
export const brKeys = {
  all: ["bon-retour-clients"],
  one: (id) => ["bon-retour-client", String(id)],
  nextNumber: (societeId) => ["brc-next-number", societeId],
  bonLivraisonsByClient: (clientId) => ["bl-by-client", clientId],
};

export const brProductKeys = {
  search: (depotId, priceField, search, page) => [
    "br-products",
    depotId,
    priceField,
    search,
    page,
  ],
};

export const brClientKeys = {
  all: (keyword, societeId) => ["br-clients", keyword, societeId],
};

export const brPacksKeys = {
  list: (search, page) => ["br-packs", search, page],
};

/* ─────── Bon Retour Clients Hooks ─────── */
export const useBonRetourClients = ({
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
      "bon-retour-clients",
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
      bonRetourClientsApi.getAll({
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

export const useBonRetourClientById = (id) => {
  return useQuery({
    queryKey: brKeys.one(id),
    queryFn: () => bonRetourClientsApi.getById(id),
    enabled: !!id,
  });
};

export const useNextBRCNumber = (societeId) => {
  return useQuery({
    queryKey: brKeys.nextNumber(societeId),
    queryFn: () => bonRetourClientsApi.getNextNumber(societeId),
    enabled: !!societeId,
    staleTime: 0,
  });
};

export const useBonLivraisonsByClient = (clientId) => {
  return useQuery({
    queryKey: brKeys.bonLivraisonsByClient(clientId),
    queryFn: () => bonRetourClientsApi.getBonLivraisonsByClient(clientId),
    enabled: !!clientId,
    staleTime: 30_000,
  });
};

export const useCreateBonRetourClient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bonRetourClientsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: brKeys.all });
      queryClient.invalidateQueries({ queryKey: ["stock"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["stockTransactions"], exact: false });
    },
  });
};

export const useDeleteBonRetourClient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: bonRetourClientsApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: brKeys.all });
      queryClient.invalidateQueries({ queryKey: ["stock"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["stockTransactions"], exact: false });
    },
  });
};

export const useValidateBonRetourClient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, targetStatus }) => bonRetourClientsApi.validate(id, { targetStatus }),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: brKeys.all });
      queryClient.removeQueries({ queryKey: brKeys.one(id) });
      queryClient.invalidateQueries({ queryKey: ["stock"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["stockTransactions"], exact: false });
    },
  });
};

export const useUpdateBonRetourClient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => bonRetourClientsApi.update(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: brKeys.all });
      queryClient.invalidateQueries({ queryKey: brKeys.one(id) });
      queryClient.invalidateQueries({ queryKey: ["stock"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["stockTransactions"], exact: false });
    },
  });
};

export const usePrintBonRetourClient = () => {
  return useMutation({
    mutationFn: ({ id, view = false }) => bonRetourClientsApi.printPDF(id, view),
    onSuccess: (blob, { id }) => {
      openPdfPreview({
        blob,
        filename: `bon-retour-client-${id}.pdf`,
        title: "Aperçu — Bon de retour client",
      });
    },
  });
};

/* ─────── BR Products Hook ─────── */
export const useBRProducts = ({
  depotId,
  priceField,
  search,
  page = 1,
  limit = 50,
  enabled = true,
} = {}) => {
  return useQuery({
    queryKey: brProductKeys.search(depotId, priceField, search, page),
    queryFn: () =>
      brProductsApi.search({
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

/* ─────── Clients Hook ─────── */
export const useBRClients = ({ keyword = "", societeId } = {}) => {
  return useQuery({
    queryKey: brClientKeys.all(keyword, societeId),
    queryFn: () => brClientsApi.getAll({ keyword, societeId, limit: 100 }),
    keepPreviousData: true,
    staleTime: 60_000,
  });
};

/* ─────── BR Packs Hook ─────── */
export const useBRPacks = ({ search, page = 1, limit = 10, enabled = true } = {}) => {
  return useQuery({
    queryKey: brPacksKeys.list(search, page),
    queryFn: () => packsApi.getAll({ search, page, limit }),
    enabled,
    keepPreviousData: true,
    staleTime: 60_000,
  });
};

export { useDepots } from "../../repositories/hooks/useRepositories";
