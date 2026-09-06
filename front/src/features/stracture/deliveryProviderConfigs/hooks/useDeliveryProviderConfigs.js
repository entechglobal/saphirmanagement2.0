import { useQuery, useMutation, useQueryClient } from "@/shared/lib/query";
import { deliveryProviderConfigsApi } from "../api/deliveryProviderConfigs.api";

export const deliveryProviderConfigKeys = {
  all: ["delivery-provider-configs"],
  one: (id) => ["delivery-provider-config", id],
};

const invalidateAll = (queryClient) =>
  queryClient.invalidateQueries({ queryKey: deliveryProviderConfigKeys.all });

export const useDeliveryProviderConfigs = ({
  pageIndex = 0,
  pageSize = 10,
  provider,
  societeId,
  enabled = true,
} = {}) =>
  useQuery({
    queryKey: [
      ...deliveryProviderConfigKeys.all,
      pageIndex,
      pageSize,
      provider,
      societeId,
    ],
    queryFn: () =>
      deliveryProviderConfigsApi.getAll({
        page: pageIndex + 1,
        limit: pageSize,
        provider,
        societeId,
      }),
    enabled,
    keepPreviousData: true,
    staleTime: 1000 * 60 * 2,
  });

export const useDeliveryProviderConfig = (id) =>
  useQuery({
    queryKey: deliveryProviderConfigKeys.one(id),
    queryFn: () => deliveryProviderConfigsApi.getById(id),
    enabled: !!id,
    staleTime: 1000 * 60 * 2,
  });

export const useCreateDeliveryProviderConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deliveryProviderConfigsApi.create,
    onSuccess: () => invalidateAll(queryClient),
  });
};

export const useUpdateDeliveryProviderConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) =>
      deliveryProviderConfigsApi.update(id, payload),
    onSuccess: (_, { id }) => {
      invalidateAll(queryClient);
      queryClient.invalidateQueries({
        queryKey: deliveryProviderConfigKeys.one(id),
      });
    },
  });
};

export const useDeleteDeliveryProviderConfig = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: deliveryProviderConfigsApi.remove,
    onSuccess: () => invalidateAll(queryClient),
  });
};
