import { useMemo, useState, useCallback } from "react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { Fingerprint } from "lucide-react";
import { HeaderTable } from "../../../shared/components/HeaderTable";
import { FiltersBar } from "../../../shared/components/FiltersBar";
import { ReusableTable } from "../../../shared/components/ReusableTable";
import { useAttendance, useAttendanceStats } from "../hooks/useAttendance";

const formatDateTime = (val) =>
  val ? dayjs(val).format("DD/MM/YYYY HH:mm:ss") : "—";

const punchTone = (type) => {
  if (type === 0) return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300";
  if (type === 1) return "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300";
  return "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
};

export const AttendancePage = () => {
  const { t } = useTranslation("attendance");
  const [globalFilter, setGlobalFilter] = useState("");
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 20 });

  const resetPage = useCallback(
    () => setPagination((p) => ({ ...p, pageIndex: 0 })),
    [],
  );

  const dateFromIso = dateFrom ? dayjs(dateFrom).toISOString() : undefined;
  const dateToIso = dateTo ? dayjs(dateTo).toISOString() : undefined;

  const { data, isLoading, isFetching, isError } = useAttendance({
    pageIndex: pagination.pageIndex,
    pageSize: pagination.pageSize,
    search: globalFilter,
    dateFrom: dateFromIso,
    dateTo: dateToIso,
  });

  const { data: statsData } = useAttendanceStats({
    dateFrom: dateFromIso,
    dateTo: dateToIso,
  });

  const tableData = data?.data ?? [];
  const paginationMeta = data?.pagination
    ? {
        currentPage: data.pagination.page,
        limit: data.pagination.limit,
        numberOfPages: data.pagination.totalPages,
      }
    : null;
  const totalRows = data?.pagination?.total ?? 0;
  const todayCount = statsData?.data?.today ?? 0;

  const columns = useMemo(
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

  const filters = useMemo(
    () => [
      {
        type: "date-range",
        id: "dates",
        startDateTime: dateFrom,
        endDateTime: dateTo,
        onStartChange: (v) => {
          setDateFrom(v);
          resetPage();
        },
        onEndChange: (v) => {
          setDateTo(v);
          resetPage();
        },
        startLabel: t("filters.from"),
        endLabel: t("filters.to"),
        colSpan: 2,
      },
    ],
    [t, dateFrom, dateTo, resetPage],
  );

  return (
    <div className="p-4 md:p-8 min-h-screen transition-colors duration-300 space-y-4">
      <div className="rounded-xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-[#141414]">
        <div className="flex items-start gap-3">
          <Fingerprint className="mt-0.5 h-5 w-5 text-teal-600" />
          <div>
            <p className="font-medium text-slate-900 dark:text-slate-100">
              {t("banner.title")}
            </p>
            <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">
              {t("banner.desc")}
            </p>
          </div>
          <div className="ms-auto text-right">
            <p className="text-[11px] uppercase tracking-wide text-slate-400">
              {t("stats.today")}
            </p>
            <p className="text-lg font-semibold tabular-nums text-slate-900 dark:text-slate-100">
              {todayCount}
            </p>
          </div>
        </div>
      </div>

      <HeaderTable title={t("title")} subtitle={t("subtitle")} count={totalRows} />

      <FiltersBar
        filters={filters}
        hasActiveFilters={!!dateFrom || !!dateTo || !!globalFilter}
        onReset={() => {
          setDateFrom(null);
          setDateTo(null);
          setGlobalFilter("");
          resetPage();
        }}
        t={t}
      />

      <ReusableTable
        data={tableData}
        columns={columns}
        totalRows={totalRows}
        pagination={pagination}
        paginationMeta={paginationMeta}
        paginationResults={data?.results}
        setPagination={setPagination}
        globalFilter={globalFilter}
        setGlobalFilter={(v) => {
          setGlobalFilter(v);
          resetPage();
        }}
        isLoading={isLoading}
        isFetching={isFetching}
        isError={isError}
        tableId="attendance-table"
      />
    </div>
  );
};
