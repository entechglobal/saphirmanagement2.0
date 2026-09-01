import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { familiesApi } from "../api/families.api";

// ─── Query Keys ───────────────────────────────────────────────────────────────
export const familyKeys = {
  all: ["families"],
  one: (id) => ["family", id],
};

// ─── Queries ──────────────────────────────────────────────────────────────────
export const useFamilies = ({ pageIndex, pageSize, keyword }) =>
  useQuery({
    queryKey: [...familyKeys.all, pageIndex, pageSize, keyword],
    queryFn: () =>
      familiesApi.getAll({
        page: pageIndex + 1,
        limit: pageSize,
        keyword,
      }),
    keepPreviousData: true,
    staleTime: 1000 * 60 * 2,
  });

export const useFamily = (id) =>
  useQuery({
    queryKey: familyKeys.one(id),
    queryFn: () => familiesApi.getById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  });

// ─── Mutations ────────────────────────────────────────────────────────────────
const invalidateAll = (queryClient) =>
  queryClient.invalidateQueries({ queryKey: familyKeys.all });

export const useCreateFamily = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: familiesApi.create,
    onSuccess: () => invalidateAll(queryClient),
  });
};

export const useUpdateFamily = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => familiesApi.update(id, payload),
    onSuccess: (_, { id }) => {
      invalidateAll(queryClient);
      queryClient.invalidateQueries({ queryKey: familyKeys.one(id) });
    },
  });
};

export const useDeleteFamily = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: familiesApi.remove,
    onSuccess: () => invalidateAll(queryClient),
  });
};

// ─── CSV ──────────────────────────────────────────────────────────────────────
export const useExportFamiliesCsv = () =>
  useMutation({ mutationFn: familiesApi.exportCsv });

export const useImportFamiliesCsv = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: familiesApi.importCsv,
    onSuccess: () => invalidateAll(queryClient),
  });
};

// ─── XLSX ─────────────────────────────────────────────────────────────────────
export const useExportFamiliesXlsx = () =>
  useMutation({ mutationFn: familiesApi.exportXlsx });

export const useImportFamiliesXlsx = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: familiesApi.importXlsx,
    onSuccess: () => invalidateAll(queryClient),
  });
};