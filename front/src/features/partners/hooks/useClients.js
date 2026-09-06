import { useQuery, useMutation, useQueryClient } from "@/shared/lib/query";
import { clientsApi } from "../api/clients.api";

// ─── Query Keys ───────────────────────────────────────────────────────────────
export const clientKeys = {
  all: ["clients"],
  one: (id) => ["client", id],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const invalidateAll = (queryClient) =>
  queryClient.invalidateQueries({ queryKey: clientKeys.all });

// ─── Queries ──────────────────────────────────────────────────────────────────
export const useClients = ({ pageIndex, pageSize, keyword }) =>
  useQuery({
    queryKey: [...clientKeys.all, pageIndex, pageSize, keyword],
    queryFn: () =>
      clientsApi.getAll({
        page: pageIndex + 1,
        limit: pageSize,
        keyword,
      }),
    keepPreviousData: true,
    staleTime: 1000 * 60 * 2,
  });

export const useClient = (id) =>
  useQuery({
    queryKey: clientKeys.one(id),
    queryFn: () => clientsApi.getById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  });

// ─── Mutations ────────────────────────────────────────────────────────────────
export const useCreateClient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clientsApi.create,
    onSuccess: () => invalidateAll(queryClient),
  });
};

export const useUpdateClient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => clientsApi.update(id, payload),
    onSuccess: (_, { id }) => {
      invalidateAll(queryClient);
      queryClient.invalidateQueries({ queryKey: clientKeys.one(id) });
    },
  });
};

export const useDeleteClient = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clientsApi.remove,
    onSuccess: () => invalidateAll(queryClient),
  });
};

// ─── CSV ──────────────────────────────────────────────────────────────────────
export const useExportClientsCsv = () =>
  useMutation({ mutationFn: clientsApi.exportCsv });

// Super admin only
export const useImportClientsCsv = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clientsApi.importCsv,
    onSuccess: () => invalidateAll(queryClient),
  });
};

// Normal admin / user
export const useImportClientsCsvSimple = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clientsApi.importCsvSimple,
    onSuccess: () => invalidateAll(queryClient),
  });
};

// ─── XLSX ─────────────────────────────────────────────────────────────────────
export const useExportClientsXlsx = () =>
  useMutation({ mutationFn: clientsApi.exportXlsx });

// Super admin only
export const useImportClientsXlsx = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clientsApi.importXlsx,
    onSuccess: () => invalidateAll(queryClient),
  });
};

// Normal admin / user
export const useImportClientsXlsxSimple = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: clientsApi.importXlsxSimple,
    onSuccess: () => invalidateAll(queryClient),
  });
};