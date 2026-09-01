import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import dayjs from "dayjs";
import { Box, Alert } from "@mui/material";
import {
  Warehouse,
  Building2,
  Layers,
  FileText,
  ArrowUpDown,
  Info,
  UserCheck,
  Truck,
} from "lucide-react";
import { useTranslation } from "react-i18next";

/* ---------- Hooks ----------- */
import {
  useStockTransactions,
  useUnifiedProducts,
  usePrintStockTransactions,
} from "../hooks/useStockTransactions";
import { useFamilies } from "../../products/hooks/useFamilies";
import { useDepots } from "../../repositories/hooks/useRepositories";
import { useClients } from "../../partners/hooks/useClients";
import { useFournisseurs } from "../../partners/hooks/useSuppliers";
import { useSocietes } from "../../societes/hooks/useSocietes";
import { useAuth } from "../../auth/hooks/useAuth";
import { useOperatingHours } from "@/shared/hooks/useOperatingHours";

/* ---------- Shared Components ---------- */
import { ReusableTable } from "../../../shared/components/ReusableTable";
import { FiltersBar } from "../../../shared/components/FiltersBar";
import { HeaderTable } from "../../../shared/components/HeaderTable";

// ─── TransactionsPage ─────────────────────────────────────────────────────────
export const TransactionsPage = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.isSuperAdmin ?? false;
  const { t } = useTranslation("transactions");

  /* ── Pagination / search ── */
  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  /* ── Static filters ── */
  const [documentType, setDocumentType] = useState(null);
  const [movement, setMovement] = useState(null);

  /* ── Date range (Dayjs) ── */
  const { startHour, endHour } = useOperatingHours();
  const defaultStart = startHour != null
    ? dayjs().startOf("day").hour(startHour).minute(0).second(0).millisecond(0)
    : dayjs().startOf("day").add(5, "hour");
  const defaultEnd = endHour != null
    ? dayjs().startOf("day").hour(endHour).minute(0).second(0).millisecond(0)
    : defaultStart.add(24, "hour");
  const [startDateTime, setStartDateTime] = useState(defaultStart);
  const [endDateTime, setEndDateTime] = useState(defaultEnd);

  const _hoursApplied = useRef(false);
  useEffect(() => {
    if (_hoursApplied.current || (startHour == null && endHour == null)) return;
    _hoursApplied.current = true;
    if (startHour != null) setStartDateTime(dayjs().startOf("day").hour(startHour).minute(0).second(0).millisecond(0));
    if (endHour != null) setEndDateTime(dayjs().startOf("day").hour(endHour).minute(0).second(0).millisecond(0));
  }, [startHour, endHour]);

  // Convert Dayjs → local datetime string for the API (no UTC conversion)
  const apiStartDate = startDateTime?.isValid() ? startDateTime.format("YYYY-MM-DDTHH:mm:ss") : undefined;
  const apiEndDate = endDateTime?.isValid() ? endDateTime.format("YYYY-MM-DDTHH:mm:ss") : undefined;

  useEffect(() => {
    console.log("[TransactionsPage] Time filter changed:", {
      startDateTime: startDateTime?.format("DD/MM/YYYY HH:mm:ss") ?? null,
      endDateTime: endDateTime?.format("DD/MM/YYYY HH:mm:ss") ?? null,
      apiStartDate: apiStartDate ?? null,
      apiEndDate: apiEndDate ?? null,
    });
  }, [apiStartDate, apiEndDate]);

  /* ── Product selector ── */
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [productKeyword, setProductKeyword] = useState("");

  /* ── Async filter state ── */
  const [selectedDepot, setSelectedDepot] = useState(null);
  const [selectedFamily, setSelectedFamily] = useState(null);
  const [selectedSociete, setSelectedSociete] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedFournisseur, setSelectedFournisseur] = useState(null);

  const [depotKeyword, setDepotKeyword] = useState("");
  const [familyKeyword, setFamilyKeyword] = useState("");
  const [societeKeyword, setSocieteKeyword] = useState("");
  const [clientKeyword, setClientKeyword] = useState("");
  const [fournisseurKeyword, setFournisseurKeyword] = useState("");

  /* ── Filter data fetches ── */
  const { data: depotData, isLoading: depotLoading } = useDepots({ pageIndex: 0, pageSize: 10000, keyword: depotKeyword, societeId: selectedSociete?.id });
  const { data: familyData, isLoading: familyLoading } = useFamilies({ pageIndex: 0, pageSize: 10000, keyword: familyKeyword });
  const { data: societesData, isLoading: societeLoading } = useSocietes(isSuperAdmin ? { pageIndex: 0, pageSize: 10000, keyword: societeKeyword } : undefined);
  const { data: productsData, isLoading: productLoading } = useUnifiedProducts({ keyword: productKeyword, familyId: selectedFamily?.id });
  const { data: clientsData, isLoading: clientLoading } = useClients({ pageIndex: 0, pageSize: 10000, keyword: clientKeyword });
  const { data: fournisseursData, isLoading: fournisseurLoading } = useFournisseurs({ pageIndex: 0, pageSize: 10000, keyword: fournisseurKeyword });

  const depotOptions = depotData?.data ?? [];
  const familyOptions = familyData?.data ?? [];
  const societeOptions = societesData?.data ?? [];
  const productOptions = productsData?.data ?? [];
  const clientOptions = clientsData?.data ?? [];
  const fournisseurOptions = fournisseursData?.data ?? [];

  /* ── Derived IDs ── */
  const articleId = selectedProduct?.type === "article" ? selectedProduct.id : undefined;
  const variantId = selectedProduct?.type === "variant" ? selectedProduct.id : undefined;

  /* ── Main data fetch ── */
  const { data, isLoading, isFetching, isError } = useStockTransactions({
    pageIndex: pagination.pageIndex,
    pageSize: pagination.pageSize,
    depotId: selectedDepot?.id,
    documentType: documentType?.value,
    movement: movement?.value,
    startDate: apiStartDate,
    endDate: apiEndDate,
    familyId: selectedFamily?.id,
    societeId: isSuperAdmin ? selectedSociete?.id : undefined,
    clientId: selectedClient?.id,
    fournisseurId: selectedFournisseur?.id,
    articleId,
    variantId,
  });

  const tableData = data?.data ?? [];
  const paginationMeta = data?.pagination;
  const results = data?.results;
  const summary = data?.summary;
  const totalRows = paginationMeta ? paginationMeta.numberOfPages * paginationMeta.limit : 0;

  /* ── Active filters ── */

  const datesAreDefault =
    startDateTime?.isSame(defaultStart) && endDateTime?.isSame(defaultEnd);

  const hasActiveFilters = !!(
    documentType || movement || !datesAreDefault ||
    selectedProduct || selectedDepot || selectedFamily ||
    selectedSociete || selectedClient || selectedFournisseur ||
    globalFilter
  );

  /* ── Stable callbacks ── */
  const resetPage = useCallback(() => setPagination((p) => ({ ...p, pageIndex: 0 })), []);

  const handleReset = useCallback(() => {
    setDocumentType(null);
    setMovement(null);
    setStartDateTime(defaultStart);
    setEndDateTime(defaultEnd);
    setSelectedProduct(null);
    setSelectedDepot(null);
    setSelectedFamily(null);
    setSelectedSociete(null);
    setSelectedClient(null);
    setSelectedFournisseur(null);
    setGlobalFilter("");
    setPagination((p) => ({ ...p, pageIndex: 0 }));
  }, []);

  const handleDocumentTypeChange = useCallback((val) => { setDocumentType(val); resetPage(); }, [resetPage]);
  const handleMovementChange = useCallback((val) => { setMovement(val); resetPage(); }, [resetPage]);

  const handleStartDateTimeChange = useCallback((val) => {
    setStartDateTime(val);
    // If new start is after current end, clear the end
    if (val && endDateTime && val.isAfter(endDateTime)) setEndDateTime(null);
    resetPage();
  }, [endDateTime, resetPage]);

  const handleEndDateTimeChange = useCallback((val) => {
    setEndDateTime(val);
    resetPage();
  }, [resetPage]);

  const handleDepotChange = useCallback((val) => { setSelectedDepot(val); resetPage(); }, [resetPage]);
  const handleSocieteChange = useCallback((val) => { setSelectedSociete(val); resetPage(); }, [resetPage]);
  const handleProductChange = useCallback((val) => { setSelectedProduct(val); resetPage(); }, [resetPage]);

  const handleFamilyChange = useCallback((val) => {
    setSelectedFamily(val);
    setSelectedProduct(null);
    resetPage();
  }, [resetPage]);

  const handleClientChange = useCallback((val) => {
    setSelectedClient(val);
    if (val) setSelectedFournisseur(null);
    resetPage();
  }, [resetPage]);

  const handleFournisseurChange = useCallback((val) => {
    setSelectedFournisseur(val);
    if (val) setSelectedClient(null);
    resetPage();
  }, [resetPage]);

  /* ── Print ── */
  const { mutate: printPdf, isPending: isPrinting } = usePrintStockTransactions();

  const handlePrint = useCallback(() => {
    printPdf({
      depotId: selectedDepot?.id,
      documentType: documentType?.value,
      movement: movement?.value,
      startDate: apiStartDate,
      endDate: apiEndDate,
      familyId: selectedFamily?.id,
      societeId: isSuperAdmin ? selectedSociete?.id : undefined,
      clientId: selectedClient?.id,
      fournisseurId: selectedFournisseur?.id,
      articleId,
      variantId,
    });
  }, [printPdf, selectedDepot, documentType, movement, apiStartDate, apiEndDate, selectedFamily, selectedSociete, selectedClient, selectedFournisseur, isSuperAdmin, articleId, variantId]);

  /* ── Table columns ── */
  const columns = useMemo(
    () => [
      {
        accessorKey: "id",
        header: t("id"),
        size: 60,
        Cell: ({ cell }) => (
          <span className="text-xs text-slate-400 font-mono">#{cell.getValue()}</span>
        ),
      },
      {
        accessorKey: "referenceDocument.number",
        header: t("reference"),
        Cell: ({ cell }) => (
          <span className="font-mono text-xs font-semibold text-blue-700 dark:text-blue-400">
            {cell.getValue() || "—"}
          </span>
        ),
      },
      {
        accessorKey: "typeLabel",
        header: t("type"),
        Cell: ({ row }) => {
          const label = row.original.typeLabel;
          const color = row.original.color;
          return (
            <span
              className="px-2 py-0.5 rounded border text-[10px] font-bold uppercase tracking-tight"
              style={{
                backgroundColor: `${color}15`,
                color: color,
                borderColor: `${color}40`
              }}
            >
              {label || "—"}
            </span>
          );
        },
      },
      {
        accessorKey: "createdAt",
        header: t("date"),
        Cell: ({ cell }) => {
          const raw = cell.getValue();
          if (!raw) return <span className="text-slate-400">—</span>;

          // Split "13/04/2026 11:00" into ["13/04/2026", "11:00"]
          const parts = String(raw).split(' ');
          const datePart = parts[0];
          const timePart = parts[1] || "";

          return (
            <div className="flex flex-col leading-tight">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-200 tabular-nums">
                {datePart}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 tabular-nums">
                {timePart}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: "depot.name",
        header: t("depot"),
        Cell: ({ row }) => {
          const name = row.original.depot?.name;
          const code = row.original.depot?.code;
          return (
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{name || "—"}</span>
              {code && <span className="text-[10px] text-slate-400 font-mono">{code}</span>}
            </div>
          );
        },
      },
      {
        accessorKey: "productName",
        header: t("product"),
        Cell: ({ row }) => {
          const name = row.original.productName;
          const barcode = row.original.barcode;
          const family = row.original.family?.name;
          return (
            <div className="flex flex-col gap-0.5 max-w-[200px]">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">{name || "—"}</span>
              <div className="flex items-center gap-2">
                {barcode && <span className="text-[10px] text-slate-400 font-mono">{barcode}</span>}
                {family && <span className="text-[10px] text-slate-400">• {family}</span>}
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "clientOrFournisseur.name",
        header: t("client_supplier"),
        Cell: ({ row }) => {
          const name = row.original.clientOrFournisseur?.name;
          const type = row.original.clientOrFournisseur?.type;
          return (
            <div className="flex flex-col gap-0.5">
              <span className="text-xs text-slate-600 dark:text-slate-300">{name || "—"}</span>
              {type && (
                <span className={`text-[10px] font-medium ${type === 'client' ? 'text-blue-500' : 'text-orange-500'}`}>
                  {type === 'client' ? t("client") : t("supplier")}
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "nature",
        header: t("nature"),
        Cell: ({ cell }) => {
          const val = cell.getValue();
          const colorClass = val === "ENTREE"
            ? "bg-emerald-100 text-emerald-700"
            : "bg-red-100 text-red-700";
          return (
            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colorClass}`}>
              {val === "ENTREE" ? t("incoming") : val === "SORTIE" ? t("outgoing") : val || "—"}
            </span>
          );
        },
      },
      {
        accessorKey: "quantity",
        header: t("quantity"),
        Cell: ({ row }) => {
          const val = row.original.quantity;
          const unit = row.original.unitSymbol;
          return (
            <div className="flex items-center gap-1">
              <span className={`font-bold tabular-nums text-sm ${val > 0 ? "text-emerald-600" : "text-red-500"}`}>
                {val > 0 ? `+${val}` : val}
              </span>
              {unit && <span className="text-[10px] text-slate-400">{unit}</span>}
            </div>
          );
        },
      },
      {
        accessorKey: "unitPrice",
        header: t("unit_price"),
        Cell: ({ cell }) => {
          const val = cell.getValue();
          return (
            <span className="text-xs text-slate-600 tabular-nums">
              {val != null ? `${val.toLocaleString()} MAD` : "—"}
            </span>
          );
        },
      },
      {
        accessorKey: "totalValue",
        header: t("total_value"),
        Cell: ({ cell }) => {
          const val = cell.getValue();
          return (
            <span className={`text-xs font-semibold tabular-nums ${val < 0 ? "text-red-500" : "text-emerald-600"}`}>
              {val != null ? `${val.toLocaleString()} MAD` : "—"}
            </span>
          );
        },
      },
      {
        accessorKey: "cumul",
        header: t("cumul"),
        Cell: ({ cell }) => {
          const val = cell.getValue();
          return (
            <span className={`px-2 py-1 rounded-md text-xs font-bold ${val < 0
              ? "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20"
              : "bg-slate-100 text-slate-700"
              }`}>
              {val ?? "—"}
            </span>
          );
        },
      },
      {
        accessorKey: "createdBy.name",
        header: t("created_by"),
        Cell: ({ row }) => {
          const name = row.original.createdBy?.name;
          return (
            <span className="text-xs font-medium text-slate-700 dark:text-slate-200">
              {name || "—"}
            </span>
          );
        },
      },
      {
        accessorKey: "reason",
        header: t("reason"),
        Cell: ({ cell }) => (
          <span className="text-xs text-slate-500 italic max-w-[180px] truncate block">
            {cell.getValue() || "—"}
          </span>
        ),
      },
    ],
    [t]
  );

  return (
    <div className="p-4 md:p-8 min-h-screen transition-colors duration-300">
      <HeaderTable
        title={t("title")}
        icon={<FileText className="w-6 h-6 text-[#B12B89]" />}
      />

      {/* ── Filters Bar ── */}
      <FiltersBar
        rows={[
          {
            cols: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
            filters: [
              {
                type: "select",
                id: "docType",
                label: t("document_type"),
                icon: FileText,
                options: [
                  { value: "BON_RECEPTION", label: t("receipt_note") },
                  { value: "BON_LIVRAISON", label: t("delivery_note") },
                  { value: "BON_RETOUR_CLIENT", label: t("client_return") },
                  { value: "BON_RETOUR_FOURNISSEUR", label: t("supplier_return") },
                  { value: "TRANSFER", label: t("transfer") },
                  { value: "INVENTORY", label: t("inventory") },
                ],
                value: documentType,
                onChange: handleDocumentTypeChange,
              },
              {
                type: "select",
                id: "movement",
                label: t("movement"),
                icon: ArrowUpDown,
                options: [
                  { value: "ENTREE", label: t("incoming") },
                  { value: "SORTIE", label: t("outgoing") },
                ],
                value: movement,
                onChange: handleMovementChange,
              },
              {
                type: "date-range",
                id: "dateRange",
                startDateTime,
                endDateTime,
                onStartChange: handleStartDateTimeChange,
                onEndChange: handleEndDateTimeChange,
                colSpan: { xs: "span 1", sm: "span 2", md: "span 2" },
              },
            ],
          },
          {
            cols: {
              xs: "1fr",
              sm: "repeat(2, 1fr)",
              md: isSuperAdmin ? "repeat(4, 1fr)" : "repeat(3, 1fr)",
            },
            filters: [
              ...(isSuperAdmin
                ? [{
                    type: "async-select",
                    id: "societe",
                    label: t("company"),
                    icon: Building2,
                    options: societeOptions,
                    value: selectedSociete,
                    onChange: handleSocieteChange,
                    loading: societeLoading,
                    getOptionLabel: (o) => o?.raisonSocial ?? "",
                    onInputChange: setSocieteKeyword,
                  }]
                : []),
              {
                type: "async-select",
                id: "depot",
                label: t("depot"),
                icon: Warehouse,
                options: depotOptions,
                value: selectedDepot,
                onChange: handleDepotChange,
                loading: depotLoading,
                getOptionLabel: (o) => o?.name ?? "",
                onInputChange: setDepotKeyword,
              },
              {
                type: "async-select",
                id: "family",
                label: t("family"),
                icon: Layers,
                options: familyOptions,
                value: selectedFamily,
                onChange: handleFamilyChange,
                loading: familyLoading,
                getOptionLabel: (o) => o?.name ?? "",
                onInputChange: setFamilyKeyword,
              },
              {
                type: "product-select",
                id: "product",
                options: productOptions,
                value: selectedProduct,
                onChange: handleProductChange,
                loading: productLoading,
                onInputChange: setProductKeyword,
              },
            ],
          },
          {
            divider: true,
            cols: { xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
            filters: [
              {
                type: "async-select",
                id: "client",
                label: t("client"),
                icon: UserCheck,
                options: clientOptions,
                value: selectedClient,
                onChange: handleClientChange,
                loading: clientLoading,
                getOptionLabel: (o) => o?.name ?? o?.raisonSocial ?? "",
                onInputChange: setClientKeyword,
              },
              {
                type: "async-select",
                id: "fournisseur",
                label: t("supplier"),
                icon: Truck,
                options: fournisseurOptions,
                value: selectedFournisseur,
                onChange: handleFournisseurChange,
                loading: fournisseurLoading,
                getOptionLabel: (o) => o?.name ?? o?.raisonSocial ?? "",
                onInputChange: setFournisseurKeyword,
              },
              { type: "spacer", id: "s1" },
              { type: "spacer", id: "s2" },
            ],
          },
        ]}
        hasActiveFilters={hasActiveFilters}
        onReset={handleReset}
        t={t}
      />

      {/* ── Prompt when no product selected ── */}
      {!selectedProduct && (
        <Alert
          severity="info"
          icon={<Info className="w-5 h-5" />}
          sx={{ mb: 2, borderRadius: 1 }}
        >
          {t("select_product_prompt")}
        </Alert>
      )}

      {/* ── Summary Strip ── */}
      {selectedProduct && summary && (
        <Box
          sx={{
            display: "flex",
            flexWrap: "wrap",
            gap: 1.5,
            mb: 1.5,
            p: "10px 16px",
            borderRadius: 1,
            border: "1px solid",
            borderColor: "divider",
            bgcolor: "background.paper",
          }}
        >
          {[
            { label: t("total_transactions"), value: summary.totalTransactions, color: "text-slate-700" },
            { label: t("total_incoming"), value: summary.totalEntree, color: "text-emerald-600" },
            { label: t("total_outgoing"), value: summary.totalSortie, color: "text-red-500" },
            // { label: t("total_value"), value: `${summary.totalValue?.toLocaleString()} MAD`, color: "text-[#B12B89]" },
            {
              label: t("final_cumul"),
              value: summary.finalCumul,
              color: summary.finalCumul < 0 ? "text-red-600" : "text-emerald-700",
            },
          ].map(({ label, value, color }) => (
            <Box
              key={label}
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                px: 2,
                borderRight: "1px solid",
                borderColor: "divider",
                "&:last-child": { borderRight: "none" },
              }}
            >
              <span className="text-[10px] text-slate-400 uppercase font-semibold tracking-wider">{label}</span>
              <span className={`text-base font-bold ${color}`}>{value}</span>
            </Box>
          ))}
        </Box>
      )}

      {/* ── Table ── */}
      <ReusableTable
        data={tableData}
        columns={columns}
        totalRows={totalRows}
        pagination={pagination}
        paginationMeta={paginationMeta}
        paginationResults={results}
        setPagination={setPagination}
        isLoading={isLoading && !!selectedProduct}
        isFetching={isFetching}
        isError={isError}
        enableRowActions={false}
        tableId="stock-transactions-table"
        onPrint={handlePrint}
        isPrinting={isPrinting}
        printBttnLabel={t("print_pdf")}
        printDisabled={!selectedProduct}
      />
    </div>
  );
};