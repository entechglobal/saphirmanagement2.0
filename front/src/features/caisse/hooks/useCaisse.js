import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { caisseApi } from "../api/caisse.api";

export const caisseKeys = {
  all: ["caisses"],
  one: (id) => ["caisse", id],
  myCaisse: ["my-caisse"],
  transactions: (id) => ["caisse-transactions", id],
  allTransactions: ["all-caisse-transactions"],
  dashboard: (id) => ["caisse-dashboard", id],
};

export const useCaisses = ({ pageIndex = 0, pageSize = 20, keyword, societeId } = {}) => {
  return useQuery({
    queryKey: [...caisseKeys.all, pageIndex, pageSize, keyword, societeId],
    queryFn: () => caisseApi.getAll({ page: pageIndex + 1, limit: pageSize, keyword, societeId }),
    keepPreviousData: true,
    staleTime: 5 * 60 * 1000,
  });
};

export const useMyCaisse = () => {
  return useQuery({
    queryKey: caisseKeys.myCaisse,
    queryFn: caisseApi.getMyCaisse,
    staleTime: Infinity,
  });
};

export const useCaisse = (id) => {
  return useQuery({
    queryKey: caisseKeys.one(id),
    queryFn: () => caisseApi.getById(id),
    enabled: !!id,
  });
};

export const useCreateMyCaisse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => caisseApi.createMyCaisse(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: caisseKeys.all });
      queryClient.invalidateQueries({ queryKey: caisseKeys.myCaisse });
      queryClient.invalidateQueries({ queryKey: caisseKeys.allTransactions });
      queryClient.refetchQueries({ queryKey: caisseKeys.all, type: "active" });
      queryClient.refetchQueries({ queryKey: caisseKeys.allTransactions, type: "active" });
    },
  });
};

export const useCreateCaisse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: caisseApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: caisseKeys.all });
      queryClient.invalidateQueries({ queryKey: caisseKeys.allTransactions });
      queryClient.refetchQueries({ queryKey: caisseKeys.all, type: "active" });
      queryClient.refetchQueries({ queryKey: caisseKeys.allTransactions, type: "active" });
    },
  });
};

export const useUpdateCaisse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => caisseApi.update(id, payload),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: caisseKeys.all });
      queryClient.invalidateQueries({ queryKey: caisseKeys.one(variables.id) });
      queryClient.refetchQueries({ queryKey: caisseKeys.all, type: "active" });
    },
  });
};

export const useDeleteCaisse = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: caisseApi.remove,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: caisseKeys.all });
      queryClient.refetchQueries({ queryKey: caisseKeys.all, type: "active" });
    },
  });
};

export const useCreateCharge = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => caisseApi.createCharge(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: caisseKeys.all });
      queryClient.invalidateQueries({ queryKey: caisseKeys.myCaisse });
      queryClient.invalidateQueries({ queryKey: caisseKeys.allTransactions });
    },
  });
};

export const useTransferableCaisses = ({ societeId, search, excludeCaisseId, enabled = true } = {}) => {
  return useQuery({
    queryKey: ["transferable-caisses", societeId, search, excludeCaisseId],
    queryFn: () =>
      caisseApi.getTransferable({
        societeId: societeId || undefined,
        search: search || undefined,
        excludeCaisseId: excludeCaisseId || undefined,
        limit: 200,
      }),
    enabled,
    keepPreviousData: true,
  });
};

export const useCreateRetrait = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: caisseApi.createRetrait,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: caisseKeys.all });
      queryClient.invalidateQueries({ queryKey: caisseKeys.allTransactions });
    },
  });
};

export const useCreateDepot = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: caisseApi.createDepot,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: caisseKeys.all });
      queryClient.invalidateQueries({ queryKey: caisseKeys.allTransactions });
    },
  });
};

export const useCreateTransfer = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: caisseApi.createTransfer,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: caisseKeys.all });
      queryClient.invalidateQueries({ queryKey: caisseKeys.allTransactions });
      queryClient.invalidateQueries({ queryKey: ["transferable-caisses"] });
    },
  });
};

export const useCreateBankWallet = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: caisseApi.createBankWallet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: caisseKeys.all });
      queryClient.refetchQueries({ queryKey: caisseKeys.all, type: "active" });
    },
  });
};

export const useCreateCoffreWallet = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: caisseApi.createCoffreWallet,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: caisseKeys.all });
      queryClient.refetchQueries({ queryKey: caisseKeys.all, type: "active" });
    },
  });
};

export const useCaisseTransactions = (caisseId, { pageIndex = 0, pageSize = 15, direction, dateFrom, dateTo } = {}) => {
  return useQuery({
    queryKey: [...caisseKeys.transactions(caisseId), pageIndex, pageSize, direction, dateFrom, dateTo],
    queryFn: () =>
      caisseApi.getTransactions(caisseId, {
        page: pageIndex + 1,
        limit: pageSize,
        direction: direction || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
    enabled: !!caisseId,
    keepPreviousData: true,
  });
};

export const useAllCaisseTransactions = ({ pageIndex = 0, pageSize = 20, direction, dateFrom, dateTo, userId, roleId } = {}) => {
  return useQuery({
    queryKey: [...caisseKeys.allTransactions, pageIndex, pageSize, direction, dateFrom, dateTo, userId, roleId],
    queryFn: () =>
      caisseApi.getAllTransactions({
        page: pageIndex + 1,
        limit: pageSize,
        direction: direction || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
        userId: userId || undefined,
        roleId: roleId || undefined,
      }),
    keepPreviousData: true,
    staleTime: 2 * 60 * 1000,
  });
};

export const useCaisseDashboard = (caisseId, { dateFrom, dateTo } = {}) => {
  return useQuery({
    queryKey: [...caisseKeys.dashboard(caisseId), dateFrom, dateTo],
    queryFn: () =>
      caisseApi.getDashboard(caisseId, {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
    enabled: !!caisseId,
  });
};
