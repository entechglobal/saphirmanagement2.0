import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { User } from "lucide-react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { useClientSituation } from "../hooks/useSituation";
import { useRCClients } from "../../reglement/hooks/useReglementClient";
import { useOperatingHours } from "@/shared/hooks/useOperatingHours";
import { ReusableTable } from "../../../shared/components/ReusableTable";
import { FiltersBar } from "../../../shared/components/FiltersBar";
import { HeaderTable } from "../../../shared/components/HeaderTable";

const fmt = (n) =>
  Number(n ?? 0).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const linkClass =
  "text-[#B12B89] hover:underline font-medium focus:outline-none";

export const SituationClientPage = () => {
  const { t } = useTranslation("situationClient");
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });
  const [selectedClient, setSelectedClient] = useState(null);

  const { startHour, endHour } = useOperatingHours();
  const defaultStart =
    startHour != null
      ? dayjs()
          .startOf("month")
          .hour(startHour)
          .minute(0)
          .second(0)
          .millisecond(0)
      : dayjs().startOf("month");
  const defaultEnd =
    endHour != null
      ? dayjs().endOf("month").hour(endHour).minute(0).second(0).millisecond(0)
      : dayjs().endOf("month");
  const [startDateTime, setStartDateTime] = useState(defaultStart);
  const [endDateTime, setEndDateTime] = useState(defaultEnd);
  const hoursApplied = useRef(false);

  useEffect(() => {
    if (hoursApplied.current || (startHour == null && endHour == null)) return;
    hoursApplied.current = true;
    if (startHour != null)
      setStartDateTime((d) =>
        d.hour(startHour).minute(0).second(0).millisecond(0),
      );
    if (endHour != null)
      setEndDateTime((d) => d.hour(endHour).minute(0).second(0).millisecond(0));
  }, [startHour, endHour]);

  const apiStartDate = startDateTime?.isValid()
    ? startDateTime.format("YYYY-MM-DDTHH:mm:ss")
    : undefined;
  const apiEndDate = endDateTime?.isValid()
    ? endDateTime.format("YYYY-MM-DDTHH:mm:ss")
    : undefined;

  const resetPage = useCallback(
    () => setPagination((p) => ({ ...p, pageIndex: 0 })),
    [],
  );

  const { data: clientsData, isLoading: clientsLoading } = useRCClients({});
  const clientOptions = clientsData?.data ?? [];

  const { data, isLoading, isFetching, isError } = useClientSituation({
    pageIndex: pagination.pageIndex,
    pageSize: pagination.pageSize,
    keyword: globalFilter,
    clientId: selectedClient?.id,
    startDate: apiStartDate,
    endDate: apiEndDate,
  });

  const tableData = data?.data ?? [];
  const summary = data?.summary ?? {};
  const paginationMeta = data?.pagination;
  const results = data?.results;
  const totalRows = paginationMeta
    ? paginationMeta.numberOfPages * paginationMeta.limit
    : 0;

  const datesAreDefault =
    startDateTime?.isSame(defaultStart) && endDateTime?.isSame(defaultEnd);
  const hasActiveFilters = !!(selectedClient || !datesAreDefault || globalFilter);

  const handleReset = useCallback(() => {
    setSelectedClient(null);
    setStartDateTime(defaultStart);
    setEndDateTime(defaultEnd);
    setGlobalFilter("");
    resetPage();
  }, [defaultStart, defaultEnd, resetPage]);

  const columns = useMemo(
    () => [
      {
        accessorKey: "documentNumber",
        header: t("col_document"),
        Cell: ({ row }) => (
          <Link
            to={`/bon-livraisons/${row.original.id}/preview`}
            className={linkClass}
            onClick={(e) => e.stopPropagation()}
          >
            {row.original.documentNumber}
          </Link>
        ),
      },
      {
        accessorKey: "documentDate",
        header: t("col_date"),
        Cell: ({ row }) => (
          <span>
            {row.original.documentDate
              ? dayjs(row.original.documentDate).format("DD/MM/YYYY")
              : "—"}
          </span>
        ),
      },
      {
        accessorKey: "partnerName",
        header: t("col_client"),
      },
      {
        accessorKey: "amountDue",
        header: t("col_amount_due"),
        Cell: ({ row }) => <span>{fmt(row.original.amountDue)}</span>,
      },
      {
        accessorKey: "amountPaid",
        header: t("col_paid"),
        Cell: ({ row }) => <span>{fmt(row.original.amountPaid)}</span>,
      },
      {
        accessorKey: "reste",
        header: t("col_reste"),
        Cell: ({ row }) => (
          <span className="font-semibold text-[#B12B89]">
            {fmt(row.original.reste)}
          </span>
        ),
      },
    ],
    [t],
  );

  return (
    <div className="space-y-4">
      <HeaderTable
        title={t("page_title")}
        subtitle={t("page_subtitle")}
        count={summary.documentCount}
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900/40">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
            {t("summary_docs")}
          </p>
          <p className="mt-1 text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {summary.documentCount ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-700 dark:bg-slate-900/40">
          <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
            {t("summary_paid")}
          </p>
          <p className="mt-1 text-xl font-bold tabular-nums text-slate-900 dark:text-slate-100">
            {fmt(summary.totalPaid)} {t("currency")}
          </p>
        </div>
        <div className="rounded-xl border border-[#C86AAC]/30 bg-[#FDF2F8] px-4 py-3 dark:border-[#C86AAC]/40 dark:bg-[#C86AAC]/10">
          <p className="text-[11px] font-bold uppercase tracking-wide text-[#B12B89]">
            {t("summary_reste")}
          </p>
          <p className="mt-1 text-xl font-bold tabular-nums text-[#B12B89]">
            {fmt(summary.totalReste)} {t("currency")}
          </p>
        </div>
      </div>

      <FiltersBar
        cols={{ xs: "1fr", sm: "repeat(2, 1fr)" }}
        searchValue={globalFilter}
        onSearchChange={(v) => {
          setGlobalFilter(v);
          resetPage();
        }}
        filters={[
          {
            type: "async-select",
            id: "client",
            label: t("filter_client"),
            icon: User,
            options: clientOptions.map((c) => ({ ...c, label: c.name })),
            value: selectedClient,
            onChange: (v) => {
              setSelectedClient(v);
              resetPage();
            },
            loading: clientsLoading,
            getOptionLabel: (o) => o?.label ?? o?.name ?? "",
            allLabel: t("filter_all_clients"),
          },
          {
            type: "date-range",
            id: "dateRange",
            startDateTime,
            endDateTime,
            onStartChange: (v) => {
              setStartDateTime(v);
              if (v && endDateTime && v.isAfter(endDateTime)) setEndDateTime(null);
              resetPage();
            },
            onEndChange: (v) => {
              setEndDateTime(v);
              resetPage();
            },
            startLabel: t("filter_start_date"),
            endLabel: t("filter_end_date"),
          },
        ]}
        hasActiveFilters={hasActiveFilters}
        onReset={handleReset}
        t={t}
      />

      <ReusableTable
        data={tableData}
        columns={columns}
        totalRows={totalRows}
        pagination={pagination}
        paginationMeta={paginationMeta}
        paginationResults={results}
        setPagination={setPagination}
        isLoading={isLoading}
        isFetching={isFetching}
        isError={isError}
        tableId="situation-client-table"
      />
    </div>
  );
};
