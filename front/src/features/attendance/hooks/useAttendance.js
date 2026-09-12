import { useQuery } from "@/shared/lib/query";
import { attendanceApi } from "../api/attendance.api";

export const attendanceKeys = {
  all: ["attendance"],
  list: (p) => ["attendance", "list", p],
  users: ["attendance", "users"],
  settings: (societeId) => ["attendance", "settings", societeId ?? "me"],
  summary: (p) => ["attendance", "summary", p],
};

export const useAttendance = ({
  pageIndex = 0,
  pageSize = 20,
  userId,
  punchType,
  search,
  dateFrom,
  dateTo,
  enabled = true,
} = {}) =>
  useQuery({
    queryKey: attendanceKeys.list({
      pageIndex,
      pageSize,
      userId,
      punchType,
      search,
      dateFrom,
      dateTo,
    }),
    queryFn: () =>
      attendanceApi.getAll({
        page: pageIndex + 1,
        limit: pageSize,
        userId: userId || undefined,
        punchType: punchType || undefined,
        search: search || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
    keepPreviousData: true,
    enabled,
  });

export const useAttendanceUsers = () =>
  useQuery({
    queryKey: attendanceKeys.users,
    queryFn: () => attendanceApi.getUsers(),
  });

export const useAttendanceSummary = ({
  pageIndex = 0,
  pageSize = 20,
  userId,
  search,
  dateFrom,
  dateTo,
  enabled = true,
} = {}) =>
  useQuery({
    queryKey: attendanceKeys.summary({
      pageIndex,
      pageSize,
      userId,
      search,
      dateFrom,
      dateTo,
    }),
    queryFn: () =>
      attendanceApi.getSummary({
        page: pageIndex + 1,
        limit: pageSize,
        userId: userId || undefined,
        search: search || undefined,
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      }),
    keepPreviousData: true,
    enabled,
  });
