import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { depotsApi } from "../api/repositories.api";

/**
 * Query keys
 */
export const depotKeys = {
  all: ["depots"],
  one: (id) => ["depot", id],
};

/**
 * GET depots (paginated / filtered)
 */
export const useDepots = ({ pageIndex, pageSize, keyword, societeId } = {}) => {
  return useQuery({
    queryKey: ["depots", pageIndex, pageSize, keyword, societeId],
    queryFn: () =>
      depotsApi.getAll({
        page: pageIndex + 1,
        limit: pageSize,
        keyword,
        societeId,
      }),
    keepPreviousData: true,
  });
};

/**
 * GET depot by id
 */
export const useDepot = (id) => {
  return useQuery({
    queryKey: depotKeys.one(id),
    queryFn: () => depotsApi.getById(id),
    enabled: !!id,
    keepPreviousData: false,
  });
};

/**
 * CREATE depot
 */
export const useCreateDepot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: depotsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: depotKeys.all });
    },
  });
};
/**
 * UPDATE depot
 */
export const useUpdateDepot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, payload }) => depotsApi.update(id, payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: depotKeys.all });
      queryClient.invalidateQueries({ queryKey: depotKeys.one(variables.id) });
    },
  });
};

/**
 * DELETE depot
 */
export const useDeleteDepot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: depotsApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: depotKeys.all });
    },
  });
};
