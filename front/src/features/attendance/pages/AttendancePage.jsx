import { useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";
import dayjs from "dayjs";
import { Clock, Fingerprint, Settings2, User } from "lucide-react";
import { HeaderTable } from "../../../shared/components/HeaderTable";
import { FiltersBar } from "../../../shared/components/FiltersBar";
import { ReusableTable } from "../../../shared/components/ReusableTable";
import {
  DashboardDateFilter,
  DEFAULT_PRESET,
  getPresetRange,
} from "@/features/dashboard/components/DashboardDateFilter";
import { useAuth } from "@/features/auth";
import {
  hasPermission,
  isAdminUser,
  PERMISSIONS,
} from "@/shared/utils/permissions";
import {
  useAttendance,
  useAttendanceSummary,
  useAttendanceUsers,
} from "../hooks/useAttendance";

const formatDateTime = (val) =>
  val ? dayjs(val).format("DD/MM/YYYY HH:mm:ss") : "—";

const punchTone = (type) => {
  if (type === 0 || type === 5) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300";
  if (type === 1 || type === 4) return "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300";
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
};

const TYPE_FILTERS = ["check_in", "check_out", "break_out", "break_in"];

const formatDuration = (hours) => {
  const total = Math.round((Number(hours) || 0) * 60);
  const sign = total < 0 ? "-" : "";
  const abs = Math.abs(total);
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h && m) return `${sign}${h}h${String(m).padStart(2, "0")}`;
  if (h) return `${sign}${h}h`;
  return `${sign}${m} min`;
};

const formatMoney = (n) =>
  Number(n || 0).toLocaleString("fr-MA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const amountClass = (n) => {
  if (n > 0) return "text-emerald-600 dark:text-emerald-400";
  if (n < 0) return "text-rose-600 dark:text-rose-400";
  return "text-slate-500 dark:text-slate-400";
};

export const AttendancePage = () => {
  const { t } = useTranslation("attendance");
  const { user } = useAuth();
  const canOpenSettings =
    isAdminUser(user) || hasPermission(user, PERMISSIONS.MANAGE_SETTINGS);
  const [view, setView] = useState("punches");
  const [globalFilter, setGlobalFilter] = useState("");
  const [startDateTime, setStartDateTime] = useState(
    () => getPresetRange(DEFAULT_PRESET)[0],
  );
  const [endDateTime, setEndDateTime] = useState(
    () => getPresetRange(DEFAULT_PRESET)[1],
  );
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedType, setSelectedType] = useState(null);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });

  const resetPage = useCallback(
    () => setPagination((p) => ({ ...p, pageIndex: 0 })),
    [],
  );

  const dateFromIso = startDateTime?.isValid()
    ? startDateTime.toISOString()
    : undefined;
  const dateToIso = endDateTime?.isValid()
    ? endDateTime.toISOString()
    : undefined;
  const userId = selectedUser?.id || undefined;
  const punchType = selectedType?.value || undefined;
  const isComparison = view === "comparison";

  const { data, isLoading, isFetching, isError } = useAttendance({
    pageIndex: pagination.pageIndex,
    pageSize: pagination.pageSize,
    search: globalFilter,
    dateFrom: dateFromIso,
    dateTo: dateToIso,
    userId,
    punchType,
    enabled: !isComparison,
  });

  const {
    data: summaryData,
    isLoading: summaryLoading,
    isFetching: summaryFetching,
    isError: summaryError,
  } = useAttendanceSummary({
    pageIndex: pagination.pageIndex,
    pageSize: pagination.pageSize,
    search: globalFilter,
    dateFrom: dateFromIso,
    dateTo: dateToIso,
    userId,
    enabled: isComparison,
  });

  const { data: usersData, isLoading: usersLoading } = useAttendanceUsers();
  const userOptions = usersData?.data ?? [];

  const tableData = isComparison
    ? summaryData?.data ?? []
    : data?.data ?? [];
  const activePagination = isComparison ? summaryData?.pagination : data?.pagination;
  const paginationMeta = activePagination
    ? {
        currentPage: activePagination.page,
        limit: activePagination.limit,
        numberOfPages: activePagination.totalPages,
      }
    : null;
  const totalRows = activePagination?.total ?? 0;
  const totals = summaryData?.totals;
  const settings = summaryData?.settings;

  const typeOptions = useMemo(
    () =>
      TYPE_FILTERS.map((value) => ({
        value,
        label: t(`filters.types.${value}`),
      })),
    [t],
  );

  const punchColumns = useMemo(
    () => [
      { accessorKey: "id", header: t("table.id"), size: 70 },
      {
        id: "user",
        header: t("table.user"),
        Cell: ({ row }) => row.original.user?.name || "—",
      },
      {
        id: "email",
        header: t("table.email"),
        Cell: ({ row }) => (
          <span className="text-slate-500 dark:text-slate-400">
            {row.original.user?.email || "—"}
          </span>
        ),
      },
      {
        accessorKey: "punchTime",
        header: t("table.punchTime"),
        Cell: ({ cell }) => formatDateTime(cell.getValue()),
      },
      {
        accessorKey: "punchType",
        header: t("table.type"),
        Cell: ({ row }) => {
          const type = row.original.punchType;
          const label = t(`punchType.${type}`, {
            defaultValue: row.original.punchTypeLabel || type,
          });
          return (
            <span
              className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${punchTone(type)}`}
            >
              {label}
            </span>
          );
        },
      },
      {
        accessorKey: "deviceUserId",
        header: t("table.deviceUser"),
      },
      {
        accessorKey: "deviceIp",
        header: t("table.device"),
        Cell: ({ cell }) => cell.getValue() || "—",
      },
    ],
    [t],
  );

  const summaryColumns = useMemo(
    () => [
      {
        id: "user",
        header: t("table.user"),
        Cell: ({ row }) => (
          <div>
            <p className="font-medium">{row.original.name || "—"}</p>
            <p className="text-xs text-slate-400">{row.original.email || ""}</p>
          </div>
        ),
      },
      {
        accessorKey: "days",
        header: t("summary.days"),
        size: 80,
      },
      {
        id: "expected",
        header: t("summary.expected"),
        Cell: ({ row }) => formatDuration(row.original.expectedHours),
      },
      {
        id: "worked",
        header: t("summary.worked"),
        Cell: ({ row }) => formatDuration(row.original.workedHours),
      },
      {
        id: "late",
        header: t("summary.late"),
        Cell: ({ row }) => (
          <span className={row.original.lateMinutes > 0 ? "text-rose-600 dark:text-rose-400" : ""}>
            {formatDuration(row.original.lateHours)}
          </span>
        ),
      },
      {
        id: "overtime",
        header: t("summary.overtime"),
        Cell: ({ row }) => (
          <span className={row.original.overtimeMinutes > 0 ? "text-emerald-600 dark:text-emerald-400" : ""}>
            {formatDuration(row.original.overtimeHours)}
          </span>
        ),
      },
      {
        id: "netAmount",
        header: t("summary.amount"),
        Cell: ({ row }) => (
          <span className={`font-semibold tabular-nums ${amountClass(row.original.netAmount)}`}>
            {row.original.netAmount > 0 ? "+" : ""}
            {formatMoney(row.original.netAmount)} DH
          </span>
        ),
      },
    ],
    [t],
  );

  const [defaultFrom, defaultTo] = getPresetRange(DEFAULT_PRESET);
  const isDefaultPeriod =
    startDateTime?.isSame(defaultFrom, "day") &&
    endDateTime?.isSame(defaultTo, "day");
  const hasActiveFilters = !!(
    selectedUser ||
    selectedType ||
    globalFilter ||
    !isDefaultPeriod
  );

  const filters = useMemo(() => {
    const list = [
      {
        type: "async-select",
        id: "user",
        label: t("filters.user"),
        icon: User,
        options: userOptions,
        value: selectedUser,
        onChange: (next) => {
          setSelectedUser(next);
          resetPage();
        },
        loading: usersLoading,
        getOptionLabel: (o) => o?.name ?? "",
        searchable: true,
      },
    ];
    if (!isComparison) {
      list.push({
        type: "select",
        id: "type",
        label: t("filters.type"),
        options: typeOptions,
        value: selectedType,
        onChange: (next) => {
          setSelectedType(next);
          resetPage();
        },
      });
    }
    return list;
  }, [
    t,
    userOptions,
    selectedUser,
    selectedType,
    typeOptions,
    usersLoading,
    resetPage,
    isComparison,
  ]);

  const handleDateChange = (from, to) => {
    setStartDateTime(from);
    setEndDateTime(to);
    resetPage();
  };

  const handleReset = () => {
    const [from, to] = getPresetRange(DEFAULT_PRESET);
    setStartDateTime(from);
    setEndDateTime(to);
    setSelectedUser(null);
    setSelectedType(null);
    setGlobalFilter("");
    resetPage();
  };

  const handleViewChange = (next) => {
    setView(next);
    resetPage();
  };

  return (
    <div className="p-4 md:p-8 min-h-screen transition-colors duration-300 space-y-4">
      <HeaderTable
        title={t("title")}
        subtitle={t("subtitle")}
        count={totalRows}
        rightContent={
          canOpenSettings ? (
            <Link
              to="/settings?tab=attendance"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[13px] font-semibold text-slate-600 hover:bg-slate-50 dark:border-[#2e2e2e] dark:text-slate-300 dark:hover:bg-[#222222]"
            >
              <Settings2 className="h-4 w-4" />
              {t("summary.open_settings")}
            </Link>
          ) : null
        }
      />

      <div className="inline-flex items-center gap-0.5 rounded-xl bg-slate-100 p-1 dark:bg-[#222222]">
        {[
          { id: "punches", label: t("views.punches"), icon: Fingerprint },
          { id: "comparison", label: t("views.comparison"), icon: Clock },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => handleViewChange(id)}
            className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              view === id
                ? "bg-white text-[#B12B89] shadow-sm dark:bg-[#2e2e2e]"
                : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
            }`}
          >
            <Icon size={13} />
            {label}
          </button>
        ))}
      </div>

      <DashboardDateFilter
        from={startDateTime}
        to={endDateTime}
        onChange={handleDateChange}
      />

      {isComparison && settings && (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {t("summary.schedule_hint", {
            morningStart: settings.morningStart,
            morningEnd: settings.morningEnd,
            afternoonStart: settings.afternoonStart,
            afternoonEnd: settings.afternoonEnd,
            hours: settings.blockHours,
            amount: formatMoney(settings.amount),
          })}
        </p>
      )}

      {isComparison && totals && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-slate-200 px-4 py-3 dark:border-[#2e2e2e]">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {t("summary.late")}
            </p>
            <p className="mt-1 text-lg font-bold text-rose-600 dark:text-rose-400">
              {formatDuration(totals.lateHours)}
            </p>
            <p className="text-xs text-rose-500">{formatMoney(totals.lateAmount)} DH</p>
          </div>
          <div className="rounded-xl border border-slate-200 px-4 py-3 dark:border-[#2e2e2e]">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {t("summary.overtime")}
            </p>
            <p className="mt-1 text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {formatDuration(totals.overtimeHours)}
            </p>
            <p className="text-xs text-emerald-600">{formatMoney(totals.overtimeAmount)} DH</p>
          </div>
          <div className="rounded-xl border border-slate-200 px-4 py-3 dark:border-[#2e2e2e]">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
              {t("summary.net")}
            </p>
            <p className={`mt-1 text-lg font-bold ${amountClass(totals.netAmount)}`}>
              {totals.netAmount > 0 ? "+" : ""}
              {formatMoney(totals.netAmount)} DH
            </p>
            <p className="text-xs text-slate-400">
              {t("summary.users_days", { users: totals.users, days: totals.days })}
            </p>
          </div>
        </div>
      )}

      <FiltersBar
        filters={filters}
        cols={{ xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }}
        hasActiveFilters={hasActiveFilters}
        onReset={handleReset}
        t={t}
      />

      <ReusableTable
        data={tableData}
        columns={isComparison ? summaryColumns : punchColumns}
        totalRows={totalRows}
        pagination={pagination}
        paginationMeta={paginationMeta}
        paginationResults={isComparison ? summaryData?.results : data?.results}
        setPagination={setPagination}
        globalFilter={globalFilter}
        setGlobalFilter={(v) => {
          setGlobalFilter(v);
          resetPage();
        }}
        isLoading={isComparison ? summaryLoading : isLoading}
        isFetching={isComparison ? summaryFetching : isFetching}
        isError={isComparison ? summaryError : isError}
        tableId={isComparison ? "attendance-summary-table" : "attendance-table"}
      />
    </div>
  );
};
