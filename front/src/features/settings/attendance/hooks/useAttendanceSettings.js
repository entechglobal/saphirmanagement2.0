import { useMutation, useQuery, useQueryClient } from "@/shared/lib/query";
import { attendanceApi } from "@/features/attendance/api/attendance.api";
import { attendanceKeys } from "@/features/attendance/hooks/useAttendance";

export const useAttendanceSettings = (societeId, options = {}) => {
  const { enabled = true } = options;
  const hasSociete = societeId != null && societeId !== "";

  return useQuery({
    queryKey: attendanceKeys.settings(societeId),
    queryFn: () => attendanceApi.getSettings(societeId),
    enabled: enabled && hasSociete,
    staleTime: 30_000,
  });
};

export const useUpdateAttendanceSettings = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => attendanceApi.updateSettings(payload),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: attendanceKeys.all });
      if (variables?.societeId) {
        queryClient.invalidateQueries({
          queryKey: attendanceKeys.settings(variables.societeId),
        });
      }
    },
  });
};
