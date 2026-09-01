import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  inventoriesApi,
  articlesApi,
  depotsApi,
  familiesApi,
} from "../api/inventories.api";

/* ─────── Inventory Keys ─────── */
export const inventoryKeys = {
  all: ["inventories"],
  one: (id) => ["inventory", id],
};

export const articleKeys = {
  all: ["articles"],
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

/* ─────── Inventory Hooks ─────── */
export const useInventories = ({
  pageIndex = 0,
  pageSize = 5,
  keyword = "",
  societeId,
  depotId,
} = {}) => {
  return useQuery({
    queryKey: ["inventories", pageIndex, pageSize, keyword, societeId, depotId],
    queryFn: () =>
      inventoriesApi.getAll({
        page: pageIndex + 1,
        limit: pageSize,
        keyword,
        societeId,
        depotId,
      }),
    keepPreviousData: true,
  });
};

export const useInventoryById = (id) => {
  return useQuery({
    queryKey: inventoryKeys.one(id),
    queryFn: () => inventoriesApi.getById(id),
    enabled: !!id,
    keepPreviousData: false,
  });
};

export const useAddInventoryLines = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, lines }) => inventoriesApi.appendLines(id, { lines }),

    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.one(variables.id) });
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      queryClient.invalidateQueries({ queryKey: ["stock"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["stockTransactions"], exact: false });
    },
  });
};

export const useCreateInventory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: inventoriesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
      queryClient.invalidateQueries({ queryKey: ["stock"], exact: false });
      queryClient.invalidateQueries({ queryKey: ["stockTransactions"], exact: false });
    },
  });
};

export const useDeleteInventory = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: inventoriesApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: inventoryKeys.all });
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
        limit: 100, // Increased to get all families
        page: 1,
      }),
  });
};
