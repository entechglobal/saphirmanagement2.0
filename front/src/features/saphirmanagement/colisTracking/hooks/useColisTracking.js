import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { colisTrackingApi } from "../api/colisTracking.api";

export const colisTrackingKeys = {
  all: ["colis-tracking"],
  list: (page, limit, search) => ["colis-tracking", { page, limit, search }],
};

export const useColisTracking = ({ pageIndex = 0, pageSize = 20, search = "" } = {}) => {
  const page = pageIndex + 1;

  return useQuery({
    queryKey: colisTrackingKeys.list(page, pageSize, search),
    queryFn: () => colisTrackingApi.getAll({ page, limit: pageSize, search }),
    keepPreviousData: true,
  });
};

export const useReceiveColis = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ colisTrackingNumber }) =>
      colisTrackingApi.receive({ colisTrackingNumber }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: colisTrackingKeys.all });
    },
  });
};
