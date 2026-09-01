import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { societesApi } from "../api/societes.api";
import { useAuth } from "../../auth/hooks/useAuth";

/**
 * Query keys
 */
export const societeKeys = {
  all: ["societes"],
  one: (id) => ["societe", id],
};

/**
 * GET societes (paginated / filtered)
 */
export const useSocietes = ({ pageIndex, pageSize, keyword, enabled: enabledProp = true } = {}) => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "SUPERADMIN" || user?.isSuperAdmin;

  return useQuery({
    queryKey: ["societes", pageIndex, pageSize, keyword],
    queryFn: () =>
      societesApi.getAll({
        page: pageIndex + 1,
        limit: pageSize,
        keyword,
      }),
    keepPreviousData: true,
    enabled: enabledProp && !!user && isSuperAdmin,
  });
};

/**
 * GET societe by id
 */
export const useSociete = (id, options = {}) => {
  const { enabled = true, ...rest } = options;
  const numericId = id != null && id !== "" ? Number(id) : NaN;
  const validId = Number.isFinite(numericId) && numericId > 0 ? numericId : null;

  return useQuery({
    queryKey: societeKeys.one(validId),
    queryFn: () => societesApi.getById(validId),
    enabled: !!validId && enabled,
    ...rest,
  });
};

/**
 * CREATE societe
 */
export const useCreateSociete = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: societesApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: societeKeys.all });
    },
  });
};

/**
 * UPDATE societe
 */
export const useUpdateSociete = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }) => societesApi.update(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: societeKeys.all });
      queryClient.invalidateQueries({
        queryKey: societeKeys.one(variables.id),
      });
    },
  });
};

/**
 * DELETE societe
 */
export const useDeleteSociete = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: societesApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: societeKeys.all });
    },
  });
};
