import { useMemo, useState, useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { Box, Button, TextField, Paper, Typography, Stack, Alert, InputAdornment } from "@mui/material";
import QrCodeScannerIcon from "@mui/icons-material/QrCodeScanner";
import { PackageSearch, User, MessageCircle, Phone, Building2, CalendarClock, Hash, ScanBarcode, Copy } from "lucide-react";
import { toast } from "@/shared/utils/toast";

import { useColisTracking, useReceiveColis } from "../hooks/useColisTracking";
import { ReusableTable } from "../../../../shared/components/ReusableTable";
import { HeaderTable } from "../../../../shared/components/HeaderTable";

export const ColisTrackingPage = () => {
    const { t } = useTranslation("colisTracking");
    const [pageIndex, setPageIndex] = useState(0);
    const [pageSize, setPageSize] = useState(20);
    const [globalFilter, setGlobalFilter] = useState("");
    const [scanValue, setScanValue] = useState("");
    const [lastScanned, setLastScanned] = useState(null);
    const scanInputRef = useRef(null);

    const { data, isLoading, isFetching, isError, refetch } = useColisTracking({
        pageIndex,
        pageSize,
        search: globalFilter,
    });

    const receiveMutation = useReceiveColis();

    // Auto-focus on mount
    useEffect(() => {
        scanInputRef.current?.focus();
    }, []);

    const handleScanSubmit = () => {
        const trimmed = scanValue.trim();
        if (!trimmed) return;
        receiveMutation.mutate(
            { colisTrackingNumber: trimmed },
            {
                onSuccess: (response) => {
                    setLastScanned(response.data ?? response);
                    setScanValue("");
                    setTimeout(() => scanInputRef.current?.focus(), 0);
                    refetch();
                },
                onError: () => {
                    setTimeout(() => scanInputRef.current?.focus(), 0);
                },
            }
        );
    };

    const rowData = data?.data ?? [];
    const paginationMeta = data?.pagination;
    const totalCount = data?.pagination?.total ?? 0;

   const columns = useMemo(
    () => [
        {
            id: "client",
            header: t("col_client"),
            size: 240,
            Cell: ({ row }) => {
                const { clientName, telephone, whatsapp } = row.original;
                const cleanPhone = telephone?.replace(/\D/g, "");
                const cleanWa = whatsapp?.replace(/\D/g, "");
                const waNumber = cleanWa ? (cleanWa.startsWith("0") ? "212" + cleanWa.slice(1) : cleanWa) : null;

                return (
                    <div className="flex flex-col py-2 gap-1.5">
                        <div className="flex items-center gap-2.5">
                            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 text-[#B12B89] dark:text-blue-400 border border-blue-100 dark:border-blue-800 shrink-0">
                                <User size={14} strokeWidth={2.5} />
                            </div>
                            <span className="text-[14px] font-bold text-slate-800 dark:text-slate-100 tracking-tight leading-none">
                                {clientName || "—"}
                            </span>
                        </div>

                        <div className="flex items-center gap-3 pl-0.5">
                            {cleanPhone && (
                                <a
                                    href={`tel:${cleanPhone}`}
                                    className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-[#B12B89] dark:text-slate-400 dark:hover:text-blue-400 transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <Phone size={12} />
                                    {telephone}
                                </a>
                            )}
                            {waNumber && (
                                <a
                                    href={`https://wa.me/${waNumber}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="flex items-center gap-1 text-[11px] font-medium text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 transition-colors"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <MessageCircle size={12} className="text-emerald-500" />
                                    WhatsApp
                                </a>
                            )}
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: "documentNumber",
            header: t("col_document"),
            size: 150,
            Cell: ({ cell }) => (
                <div className="flex items-center gap-2 group">
                    <Hash size={14} className="text-slate-300 group-hover:text-indigo-400 transition-colors" />
                    <span className="text-sm font-mono font-bold text-slate-600 dark:text-slate-300">
                        {cell.getValue() || "—"}
                    </span>
                </div>
            ),
        },
        {
            accessorKey: "colisTrackingNumber",
            header: t("col_colis_code"),
            size: 210,
            Cell: ({ cell }) => {
                const value = cell.getValue();
                if (!value) return <span className="text-slate-300">—</span>;
                const handleCopy = () => {
                    navigator.clipboard.writeText(value).then(() => {
                        toast.success(t("colis_copied"));
                    });
                };
                return (
                    <button
                        onClick={handleCopy}
                        className="flex items-center justify-between w-full max-w-[180px] px-3 py-1.5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 hover:border-blue-400 dark:hover:border-[#B12B89] transition-all group"
                    >
                        <div className="flex items-center gap-2 overflow-hidden">
                            <ScanBarcode size={14} className="text-slate-400 shrink-0" />
                            <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-200 truncate">
                                {value}
                            </span>
                        </div>
                        <Copy size={12} className="text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity ml-2" />
                    </button>
                );
            },
        },
        {
            accessorKey: "dateLivraison",
            header: t("col_delivery_date"),
            size: 160,
            Cell: ({ row }) => {
                const { dateLivraison, nextDeliveryDate, isReported } = row.original;
                const isReplaced = isReported && nextDeliveryDate;
                return (
                    <div className="flex flex-col justify-center h-full">
                        <span className={`text-sm font-medium ${isReplaced ? "line-through text-slate-400" : "text-slate-600 dark:text-slate-300"}`}>
                            {dateLivraison || "—"}
                        </span>
                        {isReplaced && (
                            <div className="flex items-center gap-1.5 px-2 py-0.5 mt-1 rounded bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/30 w-fit">
                                <CalendarClock size={12} className="text-orange-500" />
                                <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                                    {nextDeliveryDate}
                                </span>
                            </div>
                        )}
                    </div>
                );
            },
        },
        {
            accessorKey: "commandStatus",
            header: t("col_order_status"),
            size: 140,
            Cell: ({ cell }) => {
                const status = cell.getValue();
                const isAnnule = status === "ANNULE" || status === "ANNULÉ";
                return (
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase border ${
                        isAnnule 
                        ? "bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800" 
                        : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
                    }`}>
                        {status || "PENDING"}
                    </div>
                );
            },
        },
        {
            id: "amounts",
            header: t("col_financials"),
            size: 160,
            Cell: ({ row }) => {
                const amountDue = row.original.amountDue || 0;
                const amountPaid = row.original.amountPaid || 0;
                return (
                    <div className="space-y-1">
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{t("col_total")}</span>
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                {amountDue.toLocaleString()} <small className="font-normal text-[10px]">MAD</small>
                            </span>
                        </div>
                        <div className="flex items-center justify-between gap-4">
                            <span className="text-[10px] font-bold text-slate-400 uppercase">{t("col_paid")}</span>
                            <span className="text-xs font-extrabold text-emerald-600 dark:text-emerald-400">
                                {amountPaid.toLocaleString()} <small className="font-normal text-[10px]">MAD</small>
                            </span>
                        </div>
                    </div>
                );
            },
        },
        {
            accessorKey: "agenceName",
            header: t("col_agency"),
            size: 160,
            Cell: ({ cell }) => (
                <div className="flex items-center gap-2.5">
                    <div className="p-1.5 rounded-md bg-purple-50 dark:bg-purple-900/20">
                        <Building2 size={14} className="text-purple-500 shrink-0" />
                    </div>
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                        {cell.getValue() || "—"}
                    </span>
                </div>
            ),
        },
    ],
    [t]
);
    return (
        <Box className="p-4 md:p-8 min-h-screen transition-colors duration-300">
            <HeaderTable
                title={t("page_title")}
                icon={<PackageSearch className="w-5 h-5 text-[#B12B89]" />}
            />

            <Paper
                variant="outlined"
                sx={{ p: 3, mb: 4, borderRadius: "12px", background: (theme) => theme.palette.background.paper }}
            >
                <Stack direction={{ xs: "column", md: "row" }} spacing={2} alignItems="flex-start">
                    <TextField
                        inputRef={scanInputRef}
                        label={t("scan_label")}
                        value={scanValue}
                        onChange={(e) => setScanValue(e.target.value)}
                        onKeyDown={(e) => {
                            if (e.key === "Enter") handleScanSubmit();
                        }}
                      
                        InputProps={{
                            startAdornment: (
                                <InputAdornment position="start">
                                    <QrCodeScannerIcon className="text-slate-400" />
                                </InputAdornment>
                            ),
                        }}
                        fullWidth
                        size="small"
                    />
                    <Button
                        variant="contained"
                        onClick={handleScanSubmit}
                        disabled={receiveMutation.isPending}
                        startIcon={<QrCodeScannerIcon />}
                        sx={{ minWidth: { xs: "100%", md: 180 } }}
                    >
                        {receiveMutation.isPending ? t("btn_receiving") : t("btn_mark_received")}
                    </Button>
                </Stack>

                {receiveMutation.isError && (
                    <Alert severity="error" sx={{ mt: 2 }}>
                        {receiveMutation.error?.response?.data?.message ||
                            receiveMutation.error?.message ||
                            t("error_update_status")}
                    </Alert>
                )}
                {receiveMutation.isSuccess && lastScanned && (
                    <Paper variant="outlined" sx={{ p: 3, mt: 2, borderRadius: "12px", backgroundColor: "background.default" }}>
                        <Typography fontWeight={700} mb={1}>
                            {receiveMutation.data?.message || t("success_title")}
                        </Typography>
                        <Stack spacing={1}>
                            <Typography variant="body2">
                                <strong>{t("success_colis_code")}</strong> {lastScanned.colisTrackingNumber}
                            </Typography>
                            <Typography variant="body2">
                                <strong>{t("success_status")}</strong> {lastScanned.colisSync}
                            </Typography>
                            <Typography variant="body2">
                                <strong>{t("success_document")}</strong> {lastScanned.document?.documentNumber ?? lastScanned.documentNumber}
                            </Typography>
                            <Typography variant="body2">
                                <strong>{t("success_client")}</strong> {lastScanned.document?.clientName ?? lastScanned.clientName}
                            </Typography>
                        </Stack>
                    </Paper>
                )}
            </Paper>

            <ReusableTable
                data={rowData}
                columns={columns}
                totalRows={totalCount}
                pagination={{ pageIndex, pageSize }}
                paginationMeta={paginationMeta}
                paginationResults={data?.results ?? rowData.length}
                setPagination={({ pageIndex: nextPageIndex, pageSize: nextPageSize }) => {
                    setPageIndex(nextPageIndex);
                    setPageSize(nextPageSize);
                }}
                globalFilter={globalFilter}
                setGlobalFilter={setGlobalFilter}
                searchPlaceholder={t("search_placeholder")}
                isLoading={isLoading}
                isFetching={isFetching}
                isError={isError}
                enableRowActions={false}
            />
        </Box>
    );
};