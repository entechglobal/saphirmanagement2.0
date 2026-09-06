import { useQuery, useMutation, useQueryClient } from "@/shared/lib/query";
import { deliveryShiftsApi } from "../api/shifts.api";

export const shiftKeys = {
  all: ["delivery-shifts"],
  list: (p) => ["delivery-shifts", "list", p],
  detail: (id) => ["delivery-shifts", "detail", id],
  myActive: ["delivery-shifts", "my-active"],
};

export const useMyActiveShift = (enabled = true) =>
  useQuery({
    queryKey: shiftKeys.myActive,
    queryFn: () => deliveryShiftsApi.getMyActive(),
    enabled,
    refetchInterval: 60_000,
  });

export const useDeliveryShifts = ({
  pageIndex = 0,
  pageSize = 20,
  status,
  search,
  userId,
  dateFrom,
  dateTo,
} = {}) =>
  useQuery({
    queryKey: shiftKeys.list({
      pageIndex,
      pageSize,
      status,
      search,
      userId,
      dateFrom,
      dateTo,
    }),
    queryFn: () =>
      deliveryShiftsApi.getAll({
        page: pageIndex + 1,
        limit: pageSize,
        status: status || undefined,
        search: search || undefined,
        userId: userId || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
    keepPreviousData: true,
  });

export const useDeliveryShift = (id) =>
  useQuery({
    queryKey: shiftKeys.detail(id),
    queryFn: () => deliveryShiftsApi.getById(id),
    enabled: !!id,
  });

export const useStartShift = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => deliveryShiftsApi.start(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: shiftKeys.all });
      qc.invalidateQueries({ queryKey: shiftKeys.myActive });
    },
  });
};

export const useCloseShift = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => deliveryShiftsApi.close(id),
    onSuccess: (_data, id) => {
      qc.invalidateQueries({ queryKey: shiftKeys.all });
      qc.invalidateQueries({ queryKey: shiftKeys.myActive });
      qc.invalidateQueries({ queryKey: shiftKeys.detail(id) });
    },
  });
};

export const useRemitShift = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => deliveryShiftsApi.remit(id, payload),
    onSuccess: (_data, { id }) => {
      qc.invalidateQueries({ queryKey: shiftKeys.all });
      qc.invalidateQueries({ queryKey: shiftKeys.detail(id) });
      qc.invalidateQueries({ queryKey: ["caisse"] });
    },
  });
};
