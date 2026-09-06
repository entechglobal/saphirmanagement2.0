import { useQuery, useMutation, useQueryClient } from "@/shared/lib/query";
import { caisseLabelApi } from "../api/caisseLabel.api";

export const caisseLabelKeys = {
  all: ["caisse-labels"],
  one: (id) => ["caisse-label", id],
};

export const useCaisseLabels = ({ pageIndex = 0, pageSize = 20, keyword, active, enabled = true } = {}) => {
  return useQuery({
    queryKey: [...caisseLabelKeys.all, pageIndex, pageSize, keyword, active],
    queryFn: () =>
      caisseLabelApi.getAll({
        page: pageIndex + 1,
        limit: pageSize,
        search: keyword || undefined,
        active: active !== undefined ? active : undefined,
      }),
    keepPreviousData: true,
    enabled,
  });
};

export const useCaisseLabel = (id) => {
  return useQuery({
    queryKey: caisseLabelKeys.one(id),
    queryFn: () => caisseLabelApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateCaisseLabel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: caisseLabelApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: caisseLabelKeys.all });
    },
  });
};

export const useUpdateCaisseLabel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => caisseLabelApi.update(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: caisseLabelKeys.all });
      queryClient.invalidateQueries({ queryKey: caisseLabelKeys.one(variables.id) });
    },
  });
};

export const useDeleteCaisseLabel = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: caisseLabelApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: caisseLabelKeys.all });
    },
  });
};
