import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  transfersApi,
  articlesApi,
  depotsApi,
  familiesApi,
} from "../api/transfers.api.js";

/* ─────── Query Keys ─────── */
export const transferKeys = {
  all: ["transfers"],
  one: (id) => ["transfer", String(id)],
};

export const articleKeys = {
  unified: (depotId, familyId, page, search) => [
    "articles-unified",
    depotId,
    familyId,
    page,
    search,
  ],
};

export const depotKeys = {
  all: ["depots"],
};

export const familyKeys = {
  all: ["families"],
};

/* ─────── Transfer Hooks ─────── */
export const useTransfers = ({
  pageIndex = 0,
  pageSize = 5,
  keyword = "",
  societeId,
  sourceDepotId,
  destinationDepotId,
  status,
} = {}) => {
  return useQuery({
    queryKey: [
      "transfers",
      pageIndex,
      pageSize,
      keyword,
      societeId,
      sourceDepotId,
      destinationDepotId,
      status,
    ],
    queryFn: () =>
      transfersApi.getAll({
        page: pageIndex + 1,
        limit: pageSize,
        keyword,
        societeId,
        sourceDepotId,
        destinationDepotId,
        status,
      }),
    keepPreviousData: true,
  });
};

export const useTransferById = (id) => {
  return useQuery({
    queryKey: transferKeys.one(id),
    queryFn: () => transfersApi.getById(id),
    enabled: !!id,
    keepPreviousData: false,
  });
};

export const useCreateTransfer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: transfersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transferKeys.all });
      queryClient.invalidateQueries({ queryKey: ["stock"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["stockTransactions"], exact: false });
    },
  });
};

export const useAddTransferLines = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, lines }) => transfersApi.appendLines(id, { lines }),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: transferKeys.one(variables.id) });
      queryClient.invalidateQueries({ queryKey: transferKeys.all });
      queryClient.invalidateQueries({ queryKey: ["stock"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["stockTransactions"], exact: false });
    },
  });
};

export const useDeleteTransfer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: transfersApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transferKeys.all });
      queryClient.invalidateQueries({ queryKey: ["stock"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["stockTransactions"], exact: false });
    },
  });
};

export const useValidateTransfer = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id) => transfersApi.validate(id),

    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: transferKeys.all });
      queryClient.invalidateQueries({ queryKey: transferKeys.one(id) });
      queryClient.invalidateQueries({ queryKey: ["stock"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["stockTransactions"], exact: false });
    },
  });
};
/* ─────── Articles Hooks ─────── */
export const useArticlesUnified = ({
  depotId,
  familyId,
  page,
  limit,
  search,
  enabled = true,
} = {}) => {
  return useQuery({
    queryKey: articleKeys.unified(depotId, familyId, page, search),
    queryFn: () =>
      articlesApi.getUnified({
        depotId,
        familyId,
        page,
        limit,
        search,
      }),
    enabled: enabled && !!depotId,
    keepPreviousData: true,
    staleTime: 30_000,
  });
};

/* ─────── Depots Hooks ─────── */
export const useDepots = () => {
  return useQuery({
    queryKey: depotKeys.all,
    queryFn: () =>
      depotsApi.getAll({
        limit: 100,
        page: 1,
      }),
  });
};

/* ─────── Families Hooks ─────── */
export const useFamilies = () => {
  return useQuery({
    queryKey: familyKeys.all,
    queryFn: () =>
      familiesApi.getAll({
        limit: 100,
        page: 1,
      }),
  });
};