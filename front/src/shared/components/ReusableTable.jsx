import { useRef, useState, useMemo, useEffect } from "react";
import {
  useLegacyTable,
  getCoreRowModel,
  getSortedRowModel,
} from "@tanstack/react-table/legacy";
import { flexRender } from "@tanstack/react-table";
import { useTranslation } from "react-i18next";
import {
  Search,
  ChevronDown,
  Columns3,
  Eye,
  Pencil,
  Trash2,
  Download,
  Printer,
  Loader2,
  ChevronsLeft,
  ChevronsRight,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Inbox,
} from "lucide-react";
import { BsFiletypeXlsx, BsFiletypeCsv } from "react-icons/bs";

// ─── helpers ──────────────────────────────────────────────────────────────────

const getNested = (obj, path) => {
  if (!path || obj == null) return undefined;
  if (!path.includes(".")) return obj[path];
  return path.split(".").reduce((acc, key) => (acc == null ? undefined : acc[key]), obj);
};

/** Convert MRT-style column defs (`Cell`, dotted accessorKey) → TanStack columns */
const normalizeColumns = (columns = []) =>
  columns.map((col, index) => {
    const {
      Cell,
      cell,
      accessorKey,
      accessorFn,
      header,
      id,
      size,
      enableSorting,
      enableHiding,
      mobileHidden,
      ...rest
    } = col;

    const needsNested = typeof accessorKey === "string" && accessorKey.includes(".");
    const columnId = id ?? accessorKey ?? `col_${index}`;

    return {
      ...rest,
      id: columnId,
      accessorKey: needsNested || accessorFn ? undefined : accessorKey,
      accessorFn:
        accessorFn ??
        (needsNested ? (row) => getNested(row, accessorKey) : undefined),
      header: header ?? columnId,
      size: size ?? 150,
      enableSorting: enableSorting !== false,
      enableHiding: enableHiding !== false,
      meta: {
        ...(rest.meta || {}),
        mobileHidden,
        size,
        hasExplicitSize: size != null,
      },
      ...(Cell || cell
        ? {
            cell: Cell
              ? (ctx) =>
                  Cell({
                    cell: ctx.cell,
                    row: ctx.row,
                    column: ctx.column,
                    table: ctx.table,
                    getValue: () => ctx.cell.getValue(),
                    renderValue: () => ctx.cell.renderValue(),
                  })
              : cell,
          }
        : {}),
    };
  });

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

// ─── Empty state ──────────────────────────────────────────────────────────────

const EmptyState = ({ compact = false }) => {
  const { t } = useTranslation("common");
  return (
    <div
      className={`flex flex-col items-center justify-center px-4 text-center ${
        compact ? "py-10" : "py-14"
      }`}
    >
      <div className="mb-3 flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
        <Inbox className="h-5 w-5" strokeWidth={1.75} />
      </div>
      <p className="mb-1 text-[15px] font-semibold text-slate-800 dark:text-slate-100">
        {t("empty_title", "No results found")}
      </p>
      <p className="max-w-sm text-[13px] leading-5 text-slate-500 dark:text-slate-400">
        {t("empty_description", "Try adjusting your search or filters.")}
      </p>
    </div>
  );
};

// ─── Toolbar search ───────────────────────────────────────────────────────────

const TableSearchField = ({ value, onChange, placeholder }) => (
  <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/80 px-3 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-colors focus-within:border-[#B12B89] focus-within:bg-white dark:border-slate-700 dark:bg-slate-800/50 dark:focus-within:border-[#B12B89] dark:focus-within:bg-slate-800">
    <Search className="h-4 w-4 flex-shrink-0 text-slate-400" strokeWidth={2} />
    <input
      type="search"
      value={value ?? ""}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="min-w-0 flex-1 bg-transparent text-[13px] text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100 dark:placeholder:text-slate-500"
    />
  </label>
);

// ─── Actions menu (More) ──────────────────────────────────────────────────────

const TableActionsMenu = ({
  onImport,
  onImportClick,
  importBttnLabel,
  fileInputRef,
  onFileChange,
  onExportCsv,
  onExportXlsx,
  csvLabel,
  xlsxLabel,
  onPrint,
  isPrinting,
  printBttnLabel,
  printDisabled,
}) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const { t } = useTranslation("common");

  const hasActions =
    onImport || onImportClick || onExportCsv || onExportXlsx || onPrint;

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (!hasActions) return null;

  const itemClass =
    "flex w-full items-center gap-2.5 px-3 py-2 text-start text-[13px] text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800";

  return (
    <div className="relative flex-shrink-0" ref={rootRef}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50/80 px-3 text-[13px] font-medium text-slate-600 shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-colors hover:border-slate-300 hover:bg-white hover:text-slate-900 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:bg-slate-800 dark:hover:text-white"
      >
        <ChevronDown className="h-4 w-4" strokeWidth={2} />
        {t("more", "More")}
      </button>

      {open && (
        <div className="absolute end-0 top-[calc(100%+6px)] z-30 min-w-[200px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          {onImport && (
            <button
              type="button"
              className={itemClass}
              onClick={() => {
                fileInputRef.current?.click();
                setOpen(false);
              }}
            >
              <Download className="h-4 w-4 text-slate-400" />
              {importBttnLabel}
            </button>
          )}
          {onImportClick && (
            <button
              type="button"
              className={itemClass}
              onClick={() => {
                onImportClick();
                setOpen(false);
              }}
            >
              <Download className="h-4 w-4 text-slate-400" />
              {importBttnLabel}
            </button>
          )}
          {onExportXlsx && (
            <button
              type="button"
              className={itemClass}
              onClick={() => {
                onExportXlsx();
                setOpen(false);
              }}
            >
              <BsFiletypeXlsx size={16} color="#1993C7" />
              {xlsxLabel}
            </button>
          )}
          {onExportCsv && (
            <button
              type="button"
              className={itemClass}
              onClick={() => {
                onExportCsv();
                setOpen(false);
              }}
            >
              <BsFiletypeCsv size={16} color="#1C955F" />
              {csvLabel}
            </button>
          )}
          {onPrint && (
            <button
              type="button"
              disabled={isPrinting || printDisabled}
              className={`${itemClass} disabled:cursor-not-allowed disabled:opacity-40`}
              onClick={() => {
                if (!printDisabled) onPrint();
                setOpen(false);
              }}
            >
              {isPrinting ? (
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
              ) : (
                <Printer className="h-4 w-4 text-slate-400" />
              )}
              {isPrinting ? "…" : printBttnLabel}
            </button>
          )}
        </div>
      )}

      {onImport && (
        <input
          type="file"
          ref={fileInputRef}
          accept=".csv,.xlsx"
          hidden
          onChange={onFileChange}
        />
      )}
    </div>
  );
};

// ─── Column visibility ────────────────────────────────────────────────────────

const ColumnsMenu = ({ table }) => {
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);
  const { t } = useTranslation("common");

  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const hideable = table.getAllLeafColumns().filter((c) => c.getCanHide());

  if (hideable.length === 0) return null;

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        title={t("columns", "Columns")}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100"
      >
        <Columns3 className="h-4 w-4" strokeWidth={1.75} />
      </button>

      {open && (
        <div className="absolute end-0 top-[calc(100%+6px)] z-30 max-h-72 min-w-[220px] overflow-y-auto rounded-xl border border-slate-200 bg-white py-1.5 shadow-xl dark:border-slate-700 dark:bg-slate-900">
          <p className="px-3 pb-1.5 pt-1 text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {t("columns", "Columns")}
          </p>
          {hideable.map((column) => {
            const label =
              typeof column.columnDef.header === "string"
                ? column.columnDef.header
                : column.id;
            return (
              <label
                key={column.id}
                className="flex cursor-pointer items-center gap-2.5 px-3 py-1.5 text-[13px] text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
              >
                <input
                  type="checkbox"
                  checked={column.getIsVisible()}
                  onChange={column.getToggleVisibilityHandler()}
                  className="h-3.5 w-3.5 rounded border-slate-300 text-[#B12B89] focus:ring-[#B12B89]"
                />
                <span className="truncate">{label}</span>
              </label>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ─── Pagination ───────────────────────────────────────────────────────────────

const TablePagination = ({
  pageIndex,
  pageSize,
  totalRows,
  setPagination,
  paginationMeta,
  paginationResults,
  t,
}) => {
  const pageCount = Math.max(1, Math.ceil((totalRows || 0) / (pageSize || 1)));
  const current = (paginationMeta?.currentPage ?? paginationMeta?.page ?? pageIndex + 1) || 1;
  const totalPages = paginationMeta?.numberOfPages ?? paginationMeta?.totalPages ?? pageCount;

  const canPrev = pageIndex > 0;
  const canNext = pageIndex + 1 < pageCount;

  const btn =
    "inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:pointer-events-none disabled:opacity-35 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-100";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 bg-white px-3 py-2 dark:border-slate-700 dark:bg-slate-900">
      <div className="hidden items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400 md:flex">
        {paginationMeta ? (
          <>
            <span>
              {t("page")} {current} {t("of")} {totalPages}
            </span>
            {paginationResults != null && (
              <>
                <span>·</span>
                <span>
                  {paginationResults} {t("results")}
                </span>
              </>
            )}
          </>
        ) : (
          <span>
            {totalRows} {t("results")}
          </span>
        )}
      </div>

      <div className="ms-auto flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-[12px] text-slate-500 dark:text-slate-400">
          <span className="hidden sm:inline">{t("rows_per_page", "Rows")}</span>
          <select
            value={pageSize}
            onChange={(e) =>
              setPagination({ pageIndex: 0, pageSize: Number(e.target.value) })
            }
            className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[12px] text-slate-700 outline-none focus:border-[#B12B89] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <div className="flex items-center gap-0.5">
          <button
            type="button"
            className={btn}
            disabled={!canPrev}
            onClick={() => setPagination((p) => ({ ...p, pageIndex: 0 }))}
            aria-label="First page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={btn}
            disabled={!canPrev}
            onClick={() =>
              setPagination((p) => ({ ...p, pageIndex: Math.max(0, p.pageIndex - 1) }))
            }
            aria-label="Previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="min-w-[4.5rem] px-1 text-center text-[12px] font-medium tabular-nums text-slate-600 dark:text-slate-300">
            {pageIndex + 1} / {pageCount}
          </span>
          <button
            type="button"
            className={btn}
            disabled={!canNext}
            onClick={() =>
              setPagination((p) => ({
                ...p,
                pageIndex: Math.min(pageCount - 1, p.pageIndex + 1),
              }))
            }
            aria-label="Next page"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            className={btn}
            disabled={!canNext}
            onClick={() => setPagination((p) => ({ ...p, pageIndex: pageCount - 1 }))}
            aria-label="Last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

// ─── Mobile cards ─────────────────────────────────────────────────────────────

const MobileRowCard = ({ row, columns, onEdit, onDelete, onShow, onPreview }) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const visibleCols = columns.filter((c) => !c.meta?.mobileHidden && !c.mobileHidden);
  const [titleCol, ...detailCols] = visibleCols;
  const hasActions = onEdit || onDelete || onShow || onPreview;

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [menuOpen]);

  const renderValue = (col) => {
    if (col.Cell) {
      return col.Cell({
        cell: { getValue: () => getNested(row, col.accessorKey) },
        row: { original: row },
      });
    }
    const val = col.accessorKey ? getNested(row, col.accessorKey) : null;
    if (val == null || val === "") return "—";
    return String(val);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-[0_1px_2px_rgba(16,24,40,0.04)] dark:border-slate-700 dark:bg-slate-900">
      {titleCol && (
        <div className="mb-2 flex items-start justify-between gap-2">
          <div className="min-w-0 text-[14px] font-semibold text-slate-900 dark:text-slate-100">
            {renderValue(titleCol)}
          </div>
          {hasActions && (
            <div className="relative flex-shrink-0" ref={menuRef}>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuOpen((v) => !v);
                }}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800"
              >
                <ChevronDown className="h-4 w-4" />
              </button>
              {menuOpen && (
                <div className="absolute end-0 top-full z-20 mt-1 min-w-[150px] overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
                  {onShow && (
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-[13px] hover:bg-slate-50 dark:hover:bg-slate-800"
                      onClick={() => {
                        onShow(row);
                        setMenuOpen(false);
                      }}
                    >
                      <Eye className="h-4 w-4 text-[#B12B89]" /> Voir
                    </button>
                  )}
                  {onEdit && (
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-[13px] hover:bg-slate-50 dark:hover:bg-slate-800"
                      onClick={() => {
                        onEdit(row);
                        setMenuOpen(false);
                      }}
                    >
                      <Pencil className="h-4 w-4" /> Modifier
                    </button>
                  )}
                  {onPreview && (
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-[13px] hover:bg-slate-50 dark:hover:bg-slate-800"
                      onClick={() => {
                        onPreview(row);
                        setMenuOpen(false);
                      }}
                    >
                      <Printer className="h-4 w-4 text-[#B12B89]" /> Aperçu
                    </button>
                  )}
                  {onDelete && (
                    <button
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-[13px] text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                      onClick={() => {
                        onDelete(row);
                        setMenuOpen(false);
                      }}
                    >
                      <Trash2 className="h-4 w-4" /> Supprimer
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-x-3 gap-y-2 border-t border-slate-100 pt-2 dark:border-slate-800">
        {detailCols.map((col) => (
          <div key={col.accessorKey || col.id} className="min-w-0">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
              {typeof col.header === "string" ? col.header : col.id}
            </p>
            <div className="truncate text-[13px] text-slate-800 dark:text-slate-200">
              {renderValue(col)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─── Main component ───────────────────────────────────────────────────────────

export const ReusableTable = ({
  data = [],
  columns = [],
  totalRows = 0,
  pagination,
  paginationMeta,
  paginationResults,
  setPagination,
  globalFilter,
  setGlobalFilter,
  searchPlaceholder,
  isLoading = false,
  isFetching = false,
  isError = false,
  onCreate,
  onEdit,
  onDelete,
  onShow,
  onPreview,
  onImport,
  onImportClick,
  onExportCsv,
  onExportXlsx,
  createBttnLabel = "Create New",
  importBttnLabel = "Import",
  onPrint,
  isPrinting = false,
  printBttnLabel = "Print PDF",
  printDisabled = false,
  enableRowActions = true,
  customTopToolbarActions,
  csvLabel = "Export CSV",
  xlsxLabel = "Export XLSX",
  tableId = "reusable-table",
}) => {
  const fileInputRef = useRef(null);
  const { i18n, t } = useTranslation("common");
  const isRTL = (i18n.dir?.() ?? (i18n.language === "ar" ? "rtl" : "ltr")) === "rtl";
  const resolvedSearchPlaceholder = searchPlaceholder ?? t("search_placeholder");

  const [isMobile, setIsMobile] = useState(
    () => typeof window !== "undefined" && window.innerWidth < 768
  );
  const [sorting, setSorting] = useState([]);
  const [columnVisibility, setColumnVisibility] = useState(() => {
    if (typeof window === "undefined") return {};
    try {
      const saved = localStorage.getItem(`${tableId}-visibility`);
      if (!saved) return {};
      const parsed = JSON.parse(saved);
      // Never let persisted state hide the actions column
      if (parsed && typeof parsed === "object") delete parsed.__actions;
      return parsed || {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const toStore = { ...columnVisibility };
    delete toStore.__actions;
    localStorage.setItem(`${tableId}-visibility`, JSON.stringify(toStore));
  }, [columnVisibility, tableId]);

  // Recover if an older session hid __actions
  useEffect(() => {
    setColumnVisibility((prev) => {
      if (prev?.__actions === false) {
        const next = { ...prev };
        delete next.__actions;
        return next;
      }
      return prev;
    });
  }, [tableId]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file && onImport) onImport(file);
    e.target.value = "";
  };

  const tanstackColumns = useMemo(() => normalizeColumns(columns), [columns]);

  const tableColumns = useMemo(() => {
    const cols = [...tanstackColumns];
    if (enableRowActions && (onShow || onEdit || onPreview || onDelete)) {
      const getRowData = (row) => row?.original ?? row;

      cols.push({
        id: "__actions",
        header: "",
        size: 118,
        enableSorting: false,
        enableHiding: false,
        meta: { hasExplicitSize: true, size: 118, isActions: true },
        cell: (ctx) => {
          const row = ctx.row;
          const data = getRowData(row);
          return (
            <div
              className="relative z-20 flex items-center justify-end gap-0.5"
              onClick={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
            >
              {onShow && (
                <button
                  type="button"
                  title="Voir"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onShow(data);
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#B12B89] dark:hover:bg-slate-800"
                >
                  <Eye className="h-[17px] w-[17px]" strokeWidth={1.75} />
                </button>
              )}
              {onEdit && (
                <button
                  type="button"
                  title="Modifier"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onEdit(data);
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#B12B89] dark:hover:bg-slate-800"
                >
                  <Pencil className="h-[17px] w-[17px]" strokeWidth={1.75} />
                </button>
              )}
              {onPreview && (
                <button
                  type="button"
                  title="Aperçu"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onPreview(data);
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#B12B89] dark:hover:bg-slate-800"
                >
                  <Printer className="h-[17px] w-[17px]" strokeWidth={1.75} />
                </button>
              )}
              {onDelete && (
                <button
                  type="button"
                  title="Supprimer"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onDelete(data);
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950/40"
                >
                  <Trash2 className="h-[17px] w-[17px]" strokeWidth={1.75} />
                </button>
              )}
            </div>
          );
        },
      });
    }
    return cols;
  }, [tanstackColumns, enableRowActions, onShow, onEdit, onPreview, onDelete]);

  const table = useLegacyTable({
    data,
    columns: tableColumns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    manualPagination: true,
    manualFiltering: true,
    pageCount: Math.ceil((totalRows || 0) / (pagination?.pageSize || 10)) || 1,
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getRowId: (row) => String(row.id ?? row._id ?? Math.random()),
    state: {
      sorting,
      columnVisibility,
      pagination: pagination ?? { pageIndex: 0, pageSize: 10 },
    },
  });

  const showToolbar =
    !!setGlobalFilter ||
    onImport ||
    onImportClick ||
    onExportCsv ||
    onExportXlsx ||
    onPrint ||
    !!customTopToolbarActions;

  const [searchDraft, setSearchDraft] = useState(globalFilter ?? "");

  useEffect(() => {
    setSearchDraft(globalFilter ?? "");
  }, [globalFilter]);

  useEffect(() => {
    if (!setGlobalFilter) return;
    const timer = setTimeout(() => {
      if (searchDraft !== (globalFilter ?? "")) {
        setGlobalFilter(searchDraft);
        setPagination?.((prev) => ({ ...prev, pageIndex: 0 }));
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [searchDraft, setGlobalFilter, setPagination, globalFilter]);

  // ── Mobile ──
  if (isMobile) {
    return (
      <div className="space-y-3">
        {showToolbar && (
          <div className="flex items-center gap-2">
            {setGlobalFilter ? (
              <TableSearchField
                value={searchDraft}
                onChange={setSearchDraft}
                placeholder={resolvedSearchPlaceholder}
              />
            ) : (
              <div className="flex-1" />
            )}
            <TableActionsMenu
              onImport={onImport}
              onImportClick={onImportClick}
              importBttnLabel={importBttnLabel}
              fileInputRef={fileInputRef}
              onFileChange={handleFileChange}
              onExportCsv={onExportCsv}
              onExportXlsx={onExportXlsx}
              csvLabel={csvLabel}
              xlsxLabel={xlsxLabel}
              onPrint={onPrint}
              isPrinting={isPrinting}
              printBttnLabel={printBttnLabel}
              printDisabled={printDisabled}
            />
            {customTopToolbarActions}
          </div>
        )}

        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: pagination?.pageSize || 5 }).map((_, i) => (
              <div
                key={i}
                className="h-28 animate-pulse rounded-xl border border-slate-200 bg-slate-100 dark:border-slate-700 dark:bg-slate-800"
              />
            ))}
          </div>
        ) : isError ? (
          <p className="py-8 text-center text-sm text-red-500">
            {t("load_error", "Erreur de chargement des données.")}
          </p>
        ) : data.length === 0 ? (
          <EmptyState compact />
        ) : (
          <div className="space-y-3">
            {data.map((row) => (
              <MobileRowCard
                key={row.id}
                row={row}
                columns={columns}
                onEdit={onEdit}
                onDelete={onDelete}
                onShow={onShow}
                onPreview={onPreview}
              />
            ))}
          </div>
        )}

        {setPagination && pagination && (
          <div className="overflow-hidden rounded-md border border-slate-200 dark:border-slate-700">
            <TablePagination
              pageIndex={pagination.pageIndex}
              pageSize={pagination.pageSize}
              totalRows={totalRows}
              setPagination={setPagination}
              paginationMeta={paginationMeta}
              paginationResults={paginationResults}
              t={t}
            />
          </div>
        )}
      </div>
    );
  }

  // ── Desktop ──
  return (
    <div className="w-full" dir={isRTL ? "rtl" : "ltr"}>
      {showToolbar && (
        <div className="mb-2.5 flex items-stretch gap-2">
          {setGlobalFilter ? (
            <TableSearchField
              value={searchDraft}
              onChange={setSearchDraft}
              placeholder={resolvedSearchPlaceholder}
            />
          ) : (
            <div className="min-w-0 flex-1" />
          )}
          <TableActionsMenu
            onImport={onImport}
            onImportClick={onImportClick}
            importBttnLabel={importBttnLabel}
            fileInputRef={fileInputRef}
            onFileChange={handleFileChange}
            onExportCsv={onExportCsv}
            onExportXlsx={onExportXlsx}
            csvLabel={csvLabel}
            xlsxLabel={xlsxLabel}
            onPrint={onPrint}
            isPrinting={isPrinting}
            printBttnLabel={printBttnLabel}
            printDisabled={printDisabled}
          />
          {customTopToolbarActions}
        </div>
      )}

      <div className="relative overflow-hidden rounded-md border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900">
        {/* Columns toggle — inside table card */}
        <div className="flex items-center justify-end border-b border-slate-100 px-2 py-1 dark:border-slate-800">
          <ColumnsMenu table={table} />
        </div>

        {isFetching && !isLoading && (
          <div className="absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden bg-transparent">
            <div className="h-full w-1/3 animate-pulse bg-[#B12B89]" />
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-start">
            <thead>
              {table.getHeaderGroups().map((headerGroup) => (
                <tr
                  key={headerGroup.id}
                  className="border-b border-slate-200 bg-slate-50/80 dark:border-slate-700 dark:bg-slate-800/60"
                >
                  {headerGroup.headers.map((header) => {
                    const canSort = header.column.getCanSort();
                    const sorted = header.column.getIsSorted();
                    const explicit = header.column.columnDef.meta?.hasExplicitSize;
                    return (
                      <th
                        key={header.id}
                        style={{
                          width: explicit ? header.getSize() : "1%",
                          whiteSpace: "nowrap",
                        }}
                        className="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 dark:text-slate-400"
                      >
                        {header.isPlaceholder ? null : (
                          <button
                            type="button"
                            disabled={!canSort}
                            onClick={header.column.getToggleSortingHandler()}
                            className={`inline-flex items-center justify-start gap-1.5 text-left whitespace-nowrap ${
                              canSort
                                ? "cursor-pointer select-none hover:text-slate-800 dark:hover:text-slate-200"
                                : "cursor-default"
                            }`}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                            {canSort && (
                              <span className="text-slate-300 dark:text-slate-600">
                                {sorted === "asc" ? (
                                  <ArrowUp className="h-3.5 w-3.5 text-[#B12B89]" />
                                ) : sorted === "desc" ? (
                                  <ArrowDown className="h-3.5 w-3.5 text-[#B12B89]" />
                                ) : (
                                  <ArrowUpDown className="h-3.5 w-3.5" />
                                )}
                              </span>
                            )}
                          </button>
                        )}
                      </th>
                    );
                  })}
                </tr>
              ))}
            </thead>

            <tbody>
              {isLoading ? (
                Array.from({ length: pagination?.pageSize || 5 }).map((_, i) => (
                  <tr key={`sk-${i}`} className="border-b border-slate-100 dark:border-slate-800">
                    {table.getVisibleLeafColumns().map((col) => (
                      <td
                        key={col.id}
                        className="whitespace-nowrap px-3.5 py-2"
                        style={{ width: "1%" }}
                      >
                        <div className="h-4 w-16 animate-pulse rounded bg-slate-100 dark:bg-slate-800" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : isError ? (
                <tr>
                  <td
                    colSpan={table.getVisibleLeafColumns().length || 1}
                    className="px-4 py-10 text-center text-sm text-red-500"
                  >
                    {t("load_error", "Erreur de chargement des données.")}
                  </td>
                </tr>
              ) : table.getRowModel().rows.length === 0 ? (
                <tr>
                  <td colSpan={table.getVisibleLeafColumns().length || 1}>
                    <EmptyState />
                  </td>
                </tr>
              ) : (
                table.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-slate-100 last:border-b-0 hover:bg-slate-50/50 dark:border-slate-800/80 dark:hover:bg-slate-800/30"
                  >
                    {row.getVisibleCells().map((cell) => {
                      const explicit = cell.column.columnDef.meta?.hasExplicitSize;
                      const cellDef = cell.column.columnDef.cell;
                      const ctx = cell.getContext();
                      // Call function cell renderers directly — v9 flexRender
                      // wraps them as components which can break closed-over handlers.
                      const content =
                        typeof cellDef === "function"
                          ? cellDef(ctx)
                          : flexRender(cellDef, ctx);
                      return (
                        <td
                          key={cell.id}
                          style={{
                            width: explicit ? cell.column.getSize() : "1%",
                            whiteSpace: "nowrap",
                          }}
                          className="px-3.5 py-2 text-[13px] text-slate-800 dark:text-slate-200"
                        >
                          {content}
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {setPagination && pagination && (
          <TablePagination
            pageIndex={pagination.pageIndex}
            pageSize={pagination.pageSize}
            totalRows={totalRows}
            setPagination={setPagination}
            paginationMeta={paginationMeta}
            paginationResults={paginationResults}
            t={t}
          />
        )}
      </div>
    </div>
  );
};

export default ReusableTable;
