import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { systemSettingsAPI } from "../api/systemSettings.api";

export const useSystemSettings = () =>
  useQuery({
    queryKey: ["system-settings"],
    queryFn: () => systemSettingsAPI.getSettings().then((r) => r.data.data),
    staleTime: 30_000,
  });

export const useSettingsHistory = (params = {}) =>
  useQuery({
    queryKey: ["settings-history", params],
    queryFn: () => systemSettingsAPI.getHistory(params).then((r) => r.data),
  });

export const useUpdateAllowNegativeStock = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) =>
      systemSettingsAPI.updateAllowNegativeStock(payload).then((r) => r.data),
    onSuccess: (res) => {
      if (res.success) {
        qc.invalidateQueries({ queryKey: ["system-settings"] });
        qc.invalidateQueries({ queryKey: ["settings-history"] });
      }
    },
  });
};

export const useUpdateHourRange = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) =>
      systemSettingsAPI.updateHourRange(payload).then((r) => r.data),
    onSuccess: (res) => {
      if (res.success) {
        qc.invalidateQueries({ queryKey: ["system-settings"] });
        qc.invalidateQueries({ queryKey: ["settings-history"] });
      }
    },
  });
};
