import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { fournisseursApi } from "../api/suppliers.api";

// ─── Query Keys ───────────────────────────────────────────────────────────────
export const fournisseurKeys = {
  all: ["fournisseurs"],
  one: (id) => ["fournisseur", id],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const invalidateAll = (queryClient) =>
  queryClient.invalidateQueries({ queryKey: fournisseurKeys.all });

// ─── Queries ──────────────────────────────────────────────────────────────────
export const useFournisseurs = ({ pageIndex, pageSize, keyword }) =>
  useQuery({
    queryKey: [...fournisseurKeys.all, pageIndex, pageSize, keyword],
    queryFn: () =>
      fournisseursApi.getAll({
        page: pageIndex + 1,
        limit: pageSize,
        keyword,
      }),
    keepPreviousData: true,
    staleTime: 1000 * 60 * 2,
  });

export const useFournisseur = (id) =>
  useQuery({
    queryKey: fournisseurKeys.one(id),
    queryFn: () => fournisseursApi.getById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  });

// ─── Mutations ────────────────────────────────────────────────────────────────
export const useCreateFournisseur = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fournisseursApi.create,
    onSuccess: () => invalidateAll(queryClient),
  });
};

export const useUpdateFournisseur = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => fournisseursApi.update(id, payload),
    onSuccess: (_, { id }) => {
      invalidateAll(queryClient);
      queryClient.invalidateQueries({ queryKey: fournisseurKeys.one(id) });
    },
  });
};

export const useDeleteFournisseur = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fournisseursApi.remove,
    onSuccess: () => invalidateAll(queryClient),
  });
};

// ─── CSV ──────────────────────────────────────────────────────────────────────
export const useExportFournisseursCsv = () =>
  useMutation({ mutationFn: fournisseursApi.exportCsv });

// Super admin only
export const useImportFournisseursCsv = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fournisseursApi.importCsv,
    onSuccess: () => invalidateAll(queryClient),
  });
};

// Normal admin / user
export const useImportFournisseursCsvSimple = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fournisseursApi.importCsvSimple,
    onSuccess: () => invalidateAll(queryClient),
  });
};

// ─── XLSX ─────────────────────────────────────────────────────────────────────
export const useExportFournisseursXlsx = () =>
  useMutation({ mutationFn: fournisseursApi.exportXlsx });

// Super admin only
export const useImportFournisseursXlsx = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fournisseursApi.importXlsx,
    onSuccess: () => invalidateAll(queryClient),
  });
};

// Normal admin / user
export const useImportFournisseursXlsxSimple = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fournisseursApi.importXlsxSimple,
    onSuccess: () => invalidateAll(queryClient),
  });
};