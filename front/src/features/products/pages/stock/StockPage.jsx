import { useState } from "react";
import { toast } from "@/shared/utils/toast";
import { Warehouse, Building2, Package, Layers } from "lucide-react";
import { useTranslation } from "react-i18next";
import { CiImageOff } from "react-icons/ci";

/* ---------- Hooks ----------- */
import { useStocks, useDeleteStock } from "../../hooks/useStocks";
import { useArticles } from "../../hooks/useArticles";
import { useSocietes } from "../../../societes/hooks/useSocietes";
import { useDepots } from "../../../repositories/hooks/useRepositories";
import { useFamilies } from "../../../transfertStock/hooks/useTransfers";
import { useAuth } from "../../../auth/hooks/useAuth";

/* ---------- Shared Components ---------- */
import { ReusableTable } from "../../../../shared/components/ReusableTable";
import { FiltersBar } from "../../../../shared/components/FiltersBar";
import { ConfirmationModal } from "../../../../shared/components/ConfirmationModal";
import { HeaderTable } from "../../../../shared/components/HeaderTable";
import { formatUnit } from "../../../../shared/utils/units";

// ─── StockPage ────────────────────────────────────────────────────────────────
export const StockPage = () => {
    const { user } = useAuth();
    const isSuperAdmin = user?.isSuperAdmin ?? false;
    const { t } = useTranslation("stock");
    const { t: tCommon } = useTranslation("common");

    const [globalFilter, setGlobalFilter] = useState("");
    const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 5 });
    const [openConfirm, setOpenConfirm] = useState(false);
    const [selectedRow, setSelectedRow] = useState(null);

    // Filter states
    const [selectedArticle, setSelectedArticle] = useState(null);
    const [selectedDepot, setSelectedDepot] = useState(null);
    const [selectedFamily, setSelectedFamily] = useState(null);
    const [selectedSociete, setSelectedSociete] = useState(null);

    // Filter input keywords for autocomplete search
    const [articleKeyword, setArticleKeyword] = useState("");
    const [depotKeyword, setDepotKeyword] = useState("");
    const [familyKeyword, setFamilyKeyword] = useState("");
    const [societeKeyword, setSocieteKeyword] = useState("");

    // Fetch filter options
    const { data: articlesData, isLoading: articleLoading } = useArticles({
        pageIndex: 0,
        pageSize: 100,
        keyword: articleKeyword,
    });
    const { data: depotData, isLoading: depotLoading } = useDepots({
        pageIndex: 0,
        pageSize: 100,
        keyword: depotKeyword,
    });
    const { data: familyData, isLoading: familyLoading } = useFamilies({
        pageIndex: 0,
        pageSize: 100,
        keyword: familyKeyword,
    });
    const { data: societesData, isLoading: societeLoading } = useSocietes(
        isSuperAdmin ? { pageIndex: 0, pageSize: 100, keyword: societeKeyword } : undefined
    );

    // Extract options from fetched data
    const articleOptions = articlesData?.data ?? [];
    const familyOptions = familyData?.data ?? [];
    const societeOptions = societesData?.data ?? [];
    const depotOptions = depotData?.data ?? [];

    // Fetch stocks with filters
    const { data, isLoading, isFetching, isError } = useStocks({
        pageIndex: pagination.pageIndex,
        pageSize: pagination.pageSize,
        keyword: globalFilter,
        articleId: selectedArticle?.id,
        familyId: selectedFamily?.id,
        depotId: selectedDepot?.id,
        societeId: isSuperAdmin ? selectedSociete?.id : undefined,
    });

    const deleteMutation = useDeleteStock();

    const tableData = data?.data ?? [];
    const paginationMeta = data?.pagination;
    const results = data?.results;
    const totalRows = paginationMeta ? paginationMeta.numberOfPages * paginationMeta.limit : 0;

    // Check if any filters are active
    const hasActiveFilters = !!(
        selectedArticle ||
        selectedFamily ||
        selectedDepot ||
        selectedSociete ||
        globalFilter
    );

    const resetPage = () => setPagination((p) => ({ ...p, pageIndex: 0 }));

    const filterConfigs = [
        ...(isSuperAdmin
            ? [
                {
                    type: "async-select",
                    id: "societe",
                    label: t("company"),
                    icon: Building2,
                    options: societeOptions,
                    value: selectedSociete,
                    onChange: (val) => { setSelectedSociete(val); resetPage(); },
                    loading: societeLoading,
                    getOptionLabel: (o) => o?.raisonSocial ?? "",
                    onInputChange: setSocieteKeyword,
                },
            ]
            : []),
        {
            type: "async-select",
            id: "depot",
            label: t("depot"),
            icon: Warehouse,
            options: depotOptions,
            value: selectedDepot,
            onChange: (val) => { setSelectedDepot(val); resetPage(); },
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
            onChange: (val) => { setSelectedFamily(val); resetPage(); },
            loading: familyLoading,
            getOptionLabel: (o) => o?.name ?? "",
            onInputChange: setFamilyKeyword,
        },
        {
            type: "async-select",
            id: "article",
            label: t("article"),
            icon: Package,
            options: articleOptions,
            value: selectedArticle,
            onChange: (val) => { setSelectedArticle(val); resetPage(); },
            loading: articleLoading,
            getOptionLabel: (o) => o?.name ?? "",
            onInputChange: setArticleKeyword,
        },
    ];

    const handleResetFilters = () => {
        setSelectedArticle(null);
        setSelectedDepot(null);
        setSelectedFamily(null);
        setSelectedSociete(null);
        setGlobalFilter("");
        setPagination((p) => ({ ...p, pageIndex: 0 }));
    };

    // Table columns configuration
    const columns = [
        { accessorKey: "id", header: t("id"), size: 80 },
        ...(isSuperAdmin
            ? [
                {
                    accessorKey: "depot.societe.logo",
                    header: t("image"),
                    size: 60,
                    Cell: ({ cell }) => {
                        const url = cell.getValue();
                        return url ? (
                            <img
                                src={url}
                                alt="Logo"
                                className="w-10 h-10 object-contain rounded border bg-white"
                                onError={(e) =>
                                (e.currentTarget.src =
                                    "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=")
                                }
                            />
                        ) : (
          <CiImageOff className="w-11 h-11 text-gray-400" /> )
                    },
                },
            ]
            : []),

              {
            accessorKey: "depot.societe.raisonSocial",
            header: t("company"),
            Cell: ({ cell }) => (
                <span className="font-medium text-slate-700 dark:text-slate-300">
                    {cell.getValue() || "—"}
                </span>
            ),
        },
        {
            accessorKey: "depot.name",
            header: t("depot"),
            Cell: ({ cell }) => (
                <span className="font-medium text-slate-700 dark:text-slate-300">
                    {cell.getValue() || "—"}
                </span>
            ),
        },
        {
            accessorKey: "displayName",
            header: t("product"),
            Cell: ({ cell }) => (
                <span className="font-semibold text-slate-900 dark:text-slate-400">
                    {cell.getValue() || "—"}
                </span>
            ),
        },
        {
            accessorKey: "productType",
            header: t("product_type"),
            Cell: ({ cell }) => (
                <span className="font-semibold text-slate-900 dark:text-slate-400">
                    {cell.getValue() || "—"}
                </span>
            ),
        },
        {
            accessorKey: "barcode",
            header: t("barcode"),
            Cell: ({ cell }) => (
                <span className="font-bold text-[11px] text-blue-400 tracking-wider">
                    {cell.getValue() || "—"}
                </span>
            ),
        },
        {
            accessorKey: "quantityAvailable",
            header: t("available"),
            Cell: ({ row }) => (
                <span className="text-slate-700 dark:text-slate-100 tabular-nums">
                    {row.original.quantityAvailable ?? "—"}{" "}
                    <small className="text-slate-400 dark:text-slate-300 font-normal">
                        {formatUnit(
                          row.original.article?.unitePrincipale?.symbol,
                          tCommon,
                        )}
                    </small>
                </span>
            ),
        },
        {
            accessorKey: "valeurStock",
            header: t("stock_value"),
            Cell: ({ row }) => {
                const value = Number(row.original.valeurStock ?? 0);
                const layers = row.original.costLayers ?? [];
                const breakdown = layers
                    .slice(0, 3)
                    .map(
                        (layer) =>
                            `${Number(layer.quantity).toLocaleString("fr-MA", {
                                maximumFractionDigits: 3,
                            })} × ${Number(layer.unitCost).toLocaleString("fr-MA", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}`,
                    )
                    .join(" + ");
                const extra = layers.length > 3 ? "…" : "";

                return (
                    <div className="min-w-[140px]">
                        <span className="font-semibold text-slate-800 dark:text-slate-100 tabular-nums">
                            {value.toLocaleString("fr-MA", {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                            })}{" "}
                            <small className="font-medium text-slate-400">MAD</small>
                        </span>
                        {layers.length > 0 && (
                            <p
                                className="mt-0.5 text-[10px] leading-tight text-slate-400 tabular-nums"
                                title={layers
                                    .map(
                                        (layer) =>
                                            `${layer.quantity} × ${Number(layer.unitCost).toFixed(2)} DH`,
                                    )
                                    .join(" + ")}
                            >
                                {breakdown}
                                {extra}
                            </p>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: "alertThreshold",
            header: t("stock_alert"),
            Cell: ({ cell }) => (
                <span className="text-slate-400 text-sm">{cell.getValue() ?? "—"}</span>
            ),
        },
        {
            accessorKey: "isLowStock",
            header: t("low_stock"),
            Cell: ({ cell }) =>
                cell.getValue() ? (
                    <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-semibold">
                        {t("yes")}
                    </span>
                ) : (
                    <span className="px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs font-semibold">
                        {t("no")}
                    </span>
                ),
        },
        {
            accessorKey: "isOutOfStock",
            header: t("out_of_stock"),
            Cell: ({ cell }) =>
                cell.getValue() ? (
                    <span className="px-2 py-1 rounded-full bg-green-100 text-green-800 text-xs font-semibold">
                        {t("yes")}
                    </span>
                ) : (
                    <span className="px-2 py-1 rounded-full bg-red-100 text-red-800 text-xs font-semibold">
                        {t("no")}
                    </span>
                ),
        },
        {
            accessorKey: "quantityReserved",
            header: t("reserved"),
            Cell: ({ row }) => (
                <span className="text-slate-500 tabular-nums">
                    {row.original.quantityReserved ?? "—"}
                </span>
            ),
        },
        {
            accessorKey: "quantityInTransit",
            header: t("in_transit"),
            Cell: ({ row }) => (
                <span className="text-slate-500 tabular-nums">
                    {row.original.quantityInTransit ?? "—"}
                </span>
            ),
        },
        {
            accessorKey: "totalQuantity",
            header: t("total"),
            Cell: ({ row }) => {
                const { totalQuantity, isOutOfStock, isLowStock, article } = row.original;
                let badgeStyle = "bg-slate-100 text-slate-600";
                if (isOutOfStock)
                    badgeStyle = "bg-red-50 text-red-700 ring-1 ring-inset ring-red-600/20";
                else if (isLowStock)
                    badgeStyle = "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20";
                else badgeStyle = "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20";

                return (
                    <div className="flex items-center gap-2">
                        <span
                            className={`min-w-[40px] text-center px-2 py-1 rounded-md text-xs font-bold ${badgeStyle}`}
                        >
                            {totalQuantity ?? 0}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase font-medium">
                            {formatUnit(article?.unitePrincipale?.symbol, tCommon)}
                        </span>
                    </div>
                );
            },
        },
        {
            accessorKey: "depot.type",
            header: t("type"),
            Cell: ({ cell }) => (
                <span className="px-2 py-0.5 rounded border border-blue-100 bg-blue-50 text-[10px] font-bold text-[#B12B89] uppercase tracking-tight">
                    {cell.getValue() || "—"}
                </span>
            ),
        },
    ];

    const handleDeleteClick = (row) => {
        setSelectedRow(row);
        setOpenConfirm(true);
    };

    const confirmDelete = () => {
        deleteMutation.mutate(selectedRow.id, {
            onSuccess: (res) => {
                toast.success(res?.message || t("toast.delete_success"));
                setOpenConfirm(false);
            },
            onError: (err) => {
                toast.error(err?.response?.data?.message || t("toast.delete_error"));
                setOpenConfirm(false);
            },
        });
    };

    return (
        <div className="p-4 md:p-8 min-h-screen  transition-colors duration-300">
            <HeaderTable
                title={t("title")}
                icon={<Warehouse className="w-6 h-6 text-[#B12B89]" />}
            />

            <FiltersBar
                filters={filterConfigs}
                hasActiveFilters={hasActiveFilters}
                onReset={handleResetFilters}
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
                enableRowActions={false}
                tableId="stock-page-table"
            />

            <ConfirmationModal
                isOpen={openConfirm}
                onClose={() => setOpenConfirm(false)}
                onConfirm={confirmDelete}
                title={t("delete_modal.title")}
                message={t("delete_modal.message")}
                confirmText={t("delete_modal.confirm")}
                cancelText={t("delete_modal.cancel")}
                variant="danger"
                isLoading={deleteMutation.isLoading}
            />
        </div>
    );
};