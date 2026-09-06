import { useQuery, useMutation, useQueryClient } from "@/shared/lib/query";
import { banquesApi } from "../api/banques.api";

// ─── Query Keys ───────────────────────────────────────────────────────────────
export const banqueKeys = {
  all: ["banques"],
  one: (id) => ["banque", id],
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
const invalidateAll = (queryClient) =>
  queryClient.invalidateQueries({ queryKey: banqueKeys.all });

// ─── Queries ──────────────────────────────────────────────────────────────────
export const useBanques = ({ pageIndex = 0, pageSize = 10, keyword = "" } = {}) =>
  useQuery({
    queryKey: [...banqueKeys.all, pageIndex, pageSize, keyword],
    queryFn: () =>
      banquesApi.getAll({ page: pageIndex + 1, limit: pageSize, keyword }),
    keepPreviousData: true,
    staleTime: 1000 * 60 * 2,
  });

export const useBanque = (id) =>
  useQuery({
    queryKey: banqueKeys.one(id),
    queryFn: () => banquesApi.getById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  });

// ─── Mutations ────────────────────────────────────────────────────────────────
export const useCreateBanque = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: banquesApi.create,
    onSuccess: () => invalidateAll(queryClient),
  });
};

export const useUpdateBanque = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => banquesApi.update(id, payload),
    onSuccess: (_, { id }) => {
      invalidateAll(queryClient);
      queryClient.invalidateQueries({ queryKey: banqueKeys.one(id) });
    },
  });
};

export const useDeleteBanque = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: banquesApi.remove,
    onSuccess: () => invalidateAll(queryClient),
  });
};