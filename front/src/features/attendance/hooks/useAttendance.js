import { useQuery } from "@tanstack/react-query";
import { attendanceApi } from "../api/attendance.api";

export const attendanceKeys = {
  all: ["attendance"],
  list: (p) => ["attendance", "list", p],
  stats: (p) => ["attendance", "stats", p],
};

export const useAttendance = ({
  pageIndex = 0,
  pageSize = 20,
  userId,
  search,
  dateFrom,
  dateTo,
} = {}) =>
  useQuery({
    queryKey: attendanceKeys.list({
      pageIndex,
      pageSize,
      userId,
      search,
      dateFrom,
      dateTo,
    }),
    queryFn: () =>
      attendanceApi.getAll({
        page: pageIndex + 1,
        limit: pageSize,
        userId: userId || undefined,
        search: search || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
    keepPreviousData: true,
  });

export const useAttendanceStats = (params = {}) =>
  useQuery({
    queryKey: attendanceKeys.stats(params),
    queryFn: () => attendanceApi.getStats(params),
  });
