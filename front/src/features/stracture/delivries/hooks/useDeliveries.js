import { useQuery, useMutation, useQueryClient } from "@/shared/lib/query";
import { deliveriesApi, societesApi } from "../api/deliveries.api";

export const deliveryKeys = {
  all: ["deliveries"],
  one: (id) => ["delivery", id],
};

export const useSocietes = ({ limit = 100 } = {}) => {
  return useQuery({
    queryKey: ["societes", limit],
    queryFn: () => societesApi.getAll({ limit }),
    staleTime: 60_000,
  });
};

export const useDeliveriesList = ({
  pageIndex = 0,
  pageSize = 10,
  keyword = "",
  societeId,
} = {}) => {
  return useQuery({
    queryKey: ["deliveries", pageIndex, pageSize, keyword, societeId],
    queryFn: () =>
      deliveriesApi.getAll({
        page: pageIndex + 1,
        limit: pageSize,
        keyword,
        societeId,
      }),
    keepPreviousData: true,
  });
};

export const useDelivery = (id) => {
  return useQuery({
    queryKey: deliveryKeys.one(id),
    queryFn: () => deliveriesApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateDelivery = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ societeId, payload }) =>
      deliveriesApi.create({ societeId, payload }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deliveryKeys.all });
    },
  });
};

export const useUpdateDelivery = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => deliveriesApi.update(id, payload),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: deliveryKeys.all });
      queryClient.invalidateQueries({ queryKey: deliveryKeys.one(id) });
    },
  });
};

export const useDeleteDelivery = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deliveriesApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deliveryKeys.all });
    },
  });
};

export const useToggleDeliveryActive = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id) => deliveriesApi.toggleActive(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: deliveryKeys.all });
    },
  });
};
