import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { createPortal } from "react-dom";
import { useSearchParams, useNavigate, Link } from "react-router-dom";
import { toast } from "@/shared/utils/toast";
import {
    ChevronDown, Package, MapPin, Phone, MessageCircle,
    User, Truck, Calendar, DollarSign, Hash, Loader2,
    ClipboardList, ChevronLeft, ChevronRight, LayoutGrid, List,
    AlertTriangle, X, CalendarClock, PlayCircle,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { commandsApi, livreurApi } from "../../commandes/api/commands.api";
import {
    useUpdateCommandStatus,
    useReportCommand,
    blsByStatusKeys,
} from "../../commandes/hooks/useCommands";
import { SelectDropDown } from "@/shared/components/SelectDropDown";
import { FormPageHeader } from "@/shared/components/FormPageHeader";
import { FormDatePicker } from "@/shared/FormDatePicker";
import { useAuth } from "@/features/auth";
import { useCurrentUser } from "@/features/users/hooks/useUsers";

/* ─── Status config ─── */
const STATUS_CONFIG = {
    CONFIRME: { label: "Confirmé", dot: "bg-amber-400", badge: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800" },
    PREPARE: { label: "Préparé", dot: "bg-emerald-400", badge: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800" },
    COLLECTE: { label: "Collecté", dot: "bg-purple-400", badge: "bg-purple-50 text-purple-600 border-purple-200 dark:bg-purple-800/40 dark:text-purple-300" },
    EN_ROUTE: { label: "En route", dot: "bg-indigo-400", badge: "bg-indigo-50 text-indigo-600 border-indigo-200 dark:bg-indigo-800/40 dark:text-indigo-300" },
    LIVRE: { label: "Livré", dot: "bg-green-400", badge: "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300" },
    PAYE: { label: "Payé", dot: "bg-teal-400", badge: "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-300" },
    ANNULE: { label: "Annulé", dot: "bg-red-400", badge: "bg-red-50 text-red-600 border-red-200 dark:bg-red-800/40 dark:text-red-300" },
};

const FILTER_OPTIONS = [
    { label: "Confirmé", status: "CONFIRME" },
    { label: "Préparé", status: "PREPARE" },
    { label: "Collecté", status: "COLLECTE" },
    { label: "En route", status: "EN_ROUTE" },
    { label: "Livré", status: "LIVRE" },
];

const NEXT_STATUS = {
    CONFIRME: ["PREPARE", "ANNULE"],
    PREPARE: ["COLLECTE", "ANNULE"],
    COLLECTE: ["EN_ROUTE", "ANNULE"],
    EN_ROUTE: ["LIVRE", "ANNULE"],
    LIVRE: ["PAYE", "ANNULE"],
    PAYE: [],
    ANNULE: [],
};

const fmt = (n) =>
    Number(n ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ─── Inline Status Dropdown ─── */
const StatusDropdown = ({ status, onSelect, isLoading }) => {
    const { t } = useTranslation("dashboard");
    const [open, setOpen] = useState(false);
    const [pos, setPos] = useState({ top: 0, left: 0 });
    const triggerRef = useRef(null);
    const dropRef = useRef(null);

    const cfg = STATUS_CONFIG[status] ?? { label: status, dot: "bg-slate-400", badge: "bg-slate-50 text-slate-500 border-slate-200" };
    const cfgLabel = t(`status_label_${status}`, cfg.label);
    const targets = NEXT_STATUS[status] ?? [];
    const isTerminal = targets.length === 0;

    const recalc = () => {
        if (!triggerRef.current) return;
        const rect = triggerRef.current.getBoundingClientRect();
        const dropH = targets.length * 36 + 16;
        const above = window.innerHeight - rect.bottom < dropH + 8 && rect.top > dropH + 8;
        setPos({
            top: above ? rect.top + window.scrollY - dropH - 6 : rect.bottom + window.scrollY + 6,
            left: rect.left + window.scrollX,
            minWidth: rect.width,
        });
    };

    useEffect(() => {
        if (!open) return;
        const close = (e) => {
            if (
                triggerRef.current && !triggerRef.current.contains(e.target) &&
                dropRef.current && !dropRef.current.contains(e.target)
            ) setOpen(false);
        };
        const onScroll = () => setOpen(false);
        document.addEventListener("mousedown", close);
        document.addEventListener("scroll", onScroll, true);
        return () => {
            document.removeEventListener("mousedown", close);
            document.removeEventListener("scroll", onScroll, true);
        };
    }, [open]);

    const panel = open && !isTerminal && createPortal(
        <div
            ref={dropRef}
            style={{ position: "absolute", top: pos.top, left: pos.left, minWidth: Math.max(pos.minWidth ?? 0, 160), zIndex: 99999 }}
            className="py-1 px-1 bg-white dark:bg-[#222222] border border-slate-200 dark:border-[#2e2e2e] rounded-xl shadow-2xl"
        >
            {targets.map((target, idx) => {
                const tc = STATUS_CONFIG[target] ?? { label: target, dot: "bg-slate-400" };
                const isCancel = target === "ANNULE";
                return (
                    <div key={target}>
                        {isCancel && idx > 0 && <div className="h-px bg-slate-100 dark:bg-[#2e2e2e] my-1" />}
                        <button
                            type="button"
                            disabled={isLoading}
                            onClick={() => { onSelect(target); setOpen(false); }}
                            className={[
                                "w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-xs font-semibold text-left transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
                                isCancel
                                    ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                                    : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#2e2e2e]/60",
                            ].join(" ")}
                        >
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${tc.dot}`} />
                            {t(`status_label_${target}`, tc.label)}
                        </button>
                    </div>
                );
            })}
        </div>,
        document.body
    );

    return (
        <div className="inline-block">
            <button
                ref={triggerRef}
                type="button"
                disabled={isTerminal || isLoading}
                onClick={() => !isTerminal && (open ? setOpen(false) : (recalc(), setOpen(true)))}
                className={[
                    "inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-bold uppercase tracking-wide transition-all select-none",
                    cfg.badge,
                    isTerminal ? "opacity-60 cursor-default" : "cursor-pointer hover:brightness-95 active:scale-95",
                ].join(" ")}
            >
                <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                {cfgLabel}
                {!isTerminal && (
                    <ChevronDown className={`w-3 h-3 opacity-60 transition-transform ${open ? "rotate-180" : ""}`} />
                )}
            </button>
            {panel}
        </div>
    );
};

/* ─── Report Modal ─── */
const ReportModal = ({ open, onClose, command, onConfirm, isLoading }) => {
    const { t } = useTranslation("dashboard");
    const [reason, setReason] = useState("");
    const [nextDeliveryDate, setNextDeliveryDate] = useState("");

    useEffect(() => {
        if (open) {
            setReason("");
            setNextDeliveryDate("");
        }
    }, [open]);

    if (!open) return null;

    const canSubmit = reason.trim().length > 0 && nextDeliveryDate;

    const handleSubmit = () => {
        if (!canSubmit) return;
        onConfirm({ id: command.id, reason: reason.trim(), nextDeliveryDate });
    };

    return createPortal(
        <div
            className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-[#1c1c1c] rounded-[2.5rem] border border-slate-200 dark:border-[#2e2e2e] w-full max-w-md shadow-2xl flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-100 dark:border-[#2e2e2e] flex items-center gap-4">
                    <div className="w-11 h-11 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center flex-shrink-0">
                        <AlertTriangle size={18} className="text-orange-500" />
                    </div>
                    <div>
                        <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">{t("report_title")}</h2>
                        <p className="text-[11px] text-slate-400 mt-0.5">{t("report_subtitle")}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="ml-auto p-2 hover:bg-slate-100 dark:hover:bg-[#222222] rounded-xl transition"
                    >
                        <X size={16} className="text-slate-400" />
                    </button>
                </div>

                {/* Body */}
                <div className="px-8 py-7 flex flex-col gap-6">
                    {/* Command info pill */}
                    {command && (
                        <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-[#222222]/50 border border-slate-100 dark:border-[#2e2e2e]">
                            <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                                <User size={14} className="text-[#B12B89]" />
                            </div>
                            <div>
                                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{command.clientName}</p>
                                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">#{command.id}</p>
                            </div>
                        </div>
                    )}

                    {/* Reason */}
                    <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 ml-1">
                            {t("report_reason")} <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            rows={3}
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            placeholder={t("report_reason_placeholder")}
                            className="w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-[#2e2e2e] text-sm resize-none bg-white dark:bg-[#222222] text-slate-700 dark:text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#B12B89]/20 focus:border-[#B12B89] transition-all"
                        />
                    </div>

                    {/* Next delivery date */}
                    <FormDatePicker
                        label={t("report_next_date")}
                        name="nextDeliveryDate"
                        value={nextDeliveryDate}
                        onChange={(e) => setNextDeliveryDate(e.target.value)}
                        placeholder="jj/mm/aaaa"
                    />
                </div>

                {/* Footer */}
                <div className="px-8 py-5 border-t border-slate-100 dark:border-[#2e2e2e] flex items-center justify-between gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isLoading}
                        className="px-6 py-2.5 rounded-2xl border border-slate-200 dark:border-[#2e2e2e] text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#222222] transition disabled:opacity-50"
                    >
                        {t("report_cancel")}
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={!canSubmit || isLoading}
                        className="flex items-center gap-2 px-7 py-2.5 rounded-2xl text-sm font-bold text-white transition shadow-lg shadow-[#B12B89]/30 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ backgroundColor: "#B12B89" }}
                    >
                        {isLoading ? (
                            <><Loader2 size={15} className="animate-spin" /> {t("report_sending")}</>
                        ) : (
                            <><CalendarClock size={15} /> {t("report_confirm")}</>
                        )}
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

/* ─── Shared Label ─── */
const Label = ({ children }) => (
    <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-1">
        {children}
    </span>
);

/* ─── BL CARD (grid view) ─── */
const BLCard = ({ bl, onStatusChange, isUpdating, onReport, onResume, isResumePending }) => {
    const { t } = useTranslation("dashboard");
    const navigate = useNavigate();
    const [showProducts, setShowProducts] = useState(false);
    const whatsappNum = (bl.whatsapp ?? "").replace(/\D/g, "");
    const normalizedWa = whatsappNum.startsWith("0") ? "212" + whatsappNum.slice(1) : whatsappNum;
    const reste = Number(bl.amountDue ?? 0) - Number(bl.amountPaid ?? 0);
    const isTerminal = ["PAYE", "ANNULE"].includes(bl.currentStatus);

    return (
        <div className="bg-white dark:bg-[#1c1c1c] rounded-3xl border border-slate-200 dark:border-[#2e2e2e] shadow-sm overflow-hidden hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200">
            {/* Header */}
            <div className="px-7 py-5 border-b border-slate-100 dark:border-[#2e2e2e] flex items-center justify-between bg-slate-50/50 dark:bg-[#222222]/30">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                        <Hash size={18} className="text-[#B12B89]" />
                    </div>
                    <div>
                        <Label>{t("bl_ref")}</Label>
                        <p className="text-base font-black text-slate-800 dark:text-slate-100 leading-tight">
                            {bl.documentNumber}
                        </p>
                    </div>
                </div>
                <div className="text-right">
                    <Label>{t("bl_status")}</Label>
                    <StatusDropdown
                        status={bl.currentStatus}
                        onSelect={(targetStatus) => onStatusChange(bl.id, targetStatus)}
                        isLoading={isUpdating}
                    />
                </div>
            </div>

            {/* Reported banner */}
            {bl.isReported && bl.nextDeliveryDate && (
                <div className="mx-4 mt-4 flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800/50">
                    <CalendarClock size={14} className="text-orange-500 flex-shrink-0" />
                    <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-orange-500">{t("bl_reported_at")}</span>
                        <span className="text-xs font-black text-orange-600 dark:text-orange-400">{bl.nextDeliveryDate}</span>
                    </div>
                </div>
            )}

            {/* Body */}
            <div className="px-7 py-6 space-y-6">
                {/* Client + Created By */}
                <div className="grid grid-cols-2 gap-5">
                    <div className="min-w-0">
                        <Label>{t("bl_client")}</Label>
                        <div className="flex items-center gap-2">
                            <User size={14} className="text-slate-400 shrink-0" />
                            <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{bl.clientName}</p>
                        </div>
                    </div>
                    <div>
                        <Label>{t("bl_created_by")}</Label>
                        <p className="text-xs font-medium text-slate-600 dark:text-slate-400">{bl.createdBy}</p>
                    </div>
                </div>

                {/* Phone + WhatsApp */}
                <div className="grid grid-cols-2 gap-5 py-5 border-y border-slate-100 dark:border-[#2e2e2e]">
                    <div>
                        <Label>{t("bl_telephone")}</Label>
                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                            <Phone size={13} className="text-slate-400" />
                            {bl.telephone || "—"}
                        </div>
                    </div>
                    <div>
                        <Label>{t("bl_whatsapp")}</Label>
                        {bl.whatsapp ? (
                            <a href={`https://wa.me/${normalizedWa}`} target="_blank" rel="noopener noreferrer"
                                className="flex items-center gap-2 text-xs font-bold text-green-600 hover:underline">
                                <MessageCircle size={13} /> {bl.whatsapp}
                            </a>
                        ) : <span className="text-xs text-slate-400">—</span>}
                    </div>
                </div>

                {/* Ville + Livreur */}
                <div className="grid grid-cols-2 gap-5">
                    <div>
                        <Label>{t("bl_city")}</Label>
                        <div className="flex items-center gap-2">
                            <MapPin size={13} className="text-slate-400" />
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                {bl.ville || t("bl_city_unknown")}
                            </span>
                        </div>
                    </div>
                    <div>
                        <Label>{t("bl_livreur")}</Label>
                        <div className="flex items-center gap-2">
                            <Truck size={13} className="text-slate-400" />
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                                {bl.livreurName || t("bl_livreur_unassigned")}
                            </span>
                        </div>
                    </div>
                </div>

                {/* Dates */}
                <div className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100/50 dark:border-blue-800/50">
                    <div>
                        <Label>{t("bl_doc_date")}</Label>
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300">
                            <Calendar size={13} /> {bl.documentDate}
                        </div>
                    </div>
                    <div className="text-right">
                        <Label>{t("bl_delivery_date")}</Label>
                        <div className={`flex items-center gap-2 text-xs font-black ${bl.isReported ? "line-through text-slate-400 dark:text-slate-500" : "text-[#B12B89]"}`}>
                            <Calendar size={13} /> {bl.dateLivraison}
                        </div>
                    </div>
                </div>

                {/* Financials */}
                <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-[#222222] border border-slate-200 dark:border-[#2e2e2e]">
                    <div className="text-center">
                        <Label>{t("bl_total_due")}</Label>
                        <p className="text-sm font-black text-slate-900 dark:text-white">{fmt(bl.amountDue)} MAD</p>
                    </div>
                    <div className="text-center border-x border-slate-200 dark:border-[#2e2e2e]">
                        <Label>{t("bl_paid")}</Label>
                        <p className="text-sm font-black text-emerald-600 dark:text-emerald-400">{fmt(bl.amountPaid)} MAD</p>
                    </div>
                    <div className="text-center">
                        <Label>{t("bl_reste")}</Label>
                        <p className={`text-sm font-black ${reste > 0 ? "text-orange-500" : "text-emerald-500"}`}>
                            {fmt(reste)} MAD
                        </p>
                    </div>
                </div>

                {/* Products toggle */}
                {bl.products?.length > 0 && (
                    <div>
                        <button
                            type="button"
                            onClick={() => setShowProducts(!showProducts)}
                            className="w-full flex items-center justify-between py-2 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
                        >
                            <div className="flex items-center gap-2">
                                <Package size={15} />
                                <span className="text-[10px] font-black uppercase tracking-widest">
                                    {t("bl_products", { count: bl.products.length })}
                                </span>
                            </div>
                            <ChevronRight size={15} className={`transition-transform ${showProducts ? "rotate-90" : ""}`} />
                        </button>
                        {showProducts && (
                            <div className="mt-3 space-y-2 animate-in fade-in slide-in-from-top-1">
                                {bl.products.map((p, idx) => (
                                    <div key={idx} className="flex justify-between items-start p-3.5 rounded-2xl bg-slate-50 dark:bg-[#222222]/50 border border-slate-100 dark:border-[#2e2e2e]">
                                        <div className="space-y-1.5 min-w-0 flex-1">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full border ${p.kind === "pack"
                                                    ? "bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800"
                                                    : "bg-blue-50 text-[#B12B89] border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800"
                                                    }`}>
                                                    {p.kind}
                                                </span>
                                                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">{p.name}</p>
                                            </div>
                                            <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                                Qté: <span className="font-bold text-slate-700 dark:text-slate-300">{p.quantity}</span>
                                                <span className="mx-1">•</span>
                                                PU: <span className="font-bold text-slate-700 dark:text-slate-300">{fmt(p.unitPrice)} MAD</span>
                                            </p>
                                        </div>
                                        <div className="text-right pl-3">
                                            <Label>Total</Label>
                                            <p className="text-xs font-black text-[#B12B89]">{fmt(p.total)} MAD</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer */}
            <div className="px-7 py-4 bg-slate-50 dark:bg-[#222222]/30 border-t border-slate-100 dark:border-[#2e2e2e] flex items-center justify-between gap-3">
                {/* Left side: Reporter  */}
                <div className="flex items-center gap-2">
                    {!isTerminal && (
                        <button
                            type="button"
                            onClick={() => onReport(bl)}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-orange-200 dark:border-orange-800/50 text-[11px] font-bold text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all"
                        >
                            <AlertTriangle size={12} />
                            {t("bl_report_btn")}
                        </button>
                    )}
                   
                </div>

                {/* Right side: Détails */}
                <button
                    onClick={() => navigate(`/commandes/${bl.id}`)}
                    className="flex items-center gap-2 px-5 py-2.5 bg-white dark:bg-[#1c1c1c] border border-slate-200 dark:border-[#2e2e2e] rounded-xl text-xs font-black text-[#B12B89] hover:bg-blue-50 dark:hover:bg-[#222222] transition-all shadow-sm"
                >
                    <ClipboardList size={14} /> {t("bl_details_btn")}
                </button>
            </div>
        </div>
    );
};

/* ─── BL ROW (list/table view) ─── */
const BLRow = ({ bl, onStatusChange, isUpdating }) => {
    const { t } = useTranslation("dashboard");
    const navigate = useNavigate();
    const reste = Number(bl.amountDue ?? 0) - Number(bl.amountPaid ?? 0);
    const whatsappNum = (bl.whatsapp ?? "").replace(/\D/g, "");
    const normalizedWa = whatsappNum.startsWith("0") ? "212" + whatsappNum.slice(1) : whatsappNum;

    return (
        <tr className="border-b border-slate-100 dark:border-[#2e2e2e] hover:bg-slate-50/60 dark:hover:bg-[#222222]/40 transition-colors group">
            {/* Ref */}
            <td className="px-5 py-4 whitespace-nowrap">
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                        <Hash size={13} className="text-[#B12B89]" />
                    </div>
                    <span className="text-sm font-black text-slate-800 dark:text-slate-100">{bl.documentNumber}</span>
                </div>
            </td>
            {/* Client */}
            <td className="px-5 py-4 whitespace-nowrap">
                <div className="flex items-center gap-2">
                    <User size={13} className="text-slate-400 shrink-0" />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 max-w-[160px] truncate">{bl.clientName}</span>
                </div>
            </td>
            {/* Ville */}
            <td className="px-5 py-4 whitespace-nowrap hidden md:table-cell">
                <div className="flex items-center gap-2">
                    <MapPin size={12} className="text-slate-400" />
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{bl.ville || "—"}</span>
                </div>
            </td>
            {/* Livreur */}
            <td className="px-5 py-4 whitespace-nowrap hidden lg:table-cell">
                <div className="flex items-center gap-2">
                    <Truck size={12} className="text-slate-400" />
                    <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{bl.livreurName || "—"}</span>
                </div>
            </td>
            {/* Contact */}
            <td className="px-5 py-4 whitespace-nowrap hidden xl:table-cell">
                {bl.whatsapp ? (
                    <a href={`https://wa.me/${normalizedWa}`} target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 text-xs font-bold text-green-600 hover:underline">
                        <MessageCircle size={12} /> {bl.whatsapp}
                    </a>
                ) : (
                    <span className="text-xs text-slate-400 flex items-center gap-1.5">
                        <Phone size={12} /> {bl.telephone || "—"}
                    </span>
                )}
            </td>
            {/* Date livraison */}
            <td className="px-5 py-4 whitespace-nowrap hidden lg:table-cell">
                <div className="flex flex-col gap-0.5">
                    <span className={`text-xs font-bold ${bl.isReported ? "line-through text-slate-400 dark:text-slate-500" : "text-[#B12B89]"}`}>
                        {bl.dateLivraison}
                    </span>
                    {bl.isReported && bl.nextDeliveryDate && (
                        <div className="flex items-center gap-1">
                            <CalendarClock size={10} className="text-orange-400" />
                            <span className="text-[10px] font-bold text-orange-500">{bl.nextDeliveryDate}</span>
                        </div>
                    )}
                </div>
            </td>
            {/* Financials */}
            <td className="px-5 py-4 whitespace-nowrap">
                <div className="flex flex-col gap-0.5">
                    <span className="text-xs font-black text-slate-800 dark:text-white">{fmt(bl.amountDue)} MAD</span>
                    <span className={`text-[10px] font-bold ${reste > 0 ? "text-orange-500" : "text-emerald-500"}`}>
                        {t("bl_reste_row", { amount: fmt(reste) })}
                    </span>
                </div>
            </td>
            {/* Status */}
            <td className="px-5 py-4 whitespace-nowrap">
                <StatusDropdown
                    status={bl.currentStatus}
                    onSelect={(targetStatus) => onStatusChange(bl.id, targetStatus)}
                    isLoading={isUpdating}
                />
            </td>
            {/* Actions */}
            <td className="px-5 py-4 whitespace-nowrap text-right">
                <button
                    onClick={() => navigate(`/commandes/${bl.id}`)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-white dark:bg-[#1c1c1c] border border-slate-200 dark:border-[#2e2e2e] rounded-xl text-[11px] font-black text-[#B12B89] hover:bg-blue-50 dark:hover:bg-[#222222] transition-all shadow-sm opacity-0 group-hover:opacity-100"
                >
                    <ClipboardList size={13} /> {t("bl_details_btn")}
                </button>
            </td>
        </tr>
    );
};

/* ─── View Toggle Button ─── */
const ViewToggle = ({ view, onChange }) => {
    const { t } = useTranslation("dashboard");
    return (
        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-[#222222] rounded-xl">
            <button
                type="button"
                onClick={() => onChange("grid")}
                title={t("view_cards_title")}
                className={[
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                    view === "grid"
                        ? "bg-white dark:bg-[#2e2e2e] text-slate-800 dark:text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300",
                ].join(" ")}
            >
                <LayoutGrid size={14} />
                <span className="hidden sm:inline">{t("view_cards")}</span>
            </button>
            <button
                type="button"
                onClick={() => onChange("list")}
                title={t("view_list_title")}
                className={[
                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all",
                    view === "list"
                        ? "bg-white dark:bg-[#2e2e2e] text-slate-800 dark:text-white shadow-sm"
                        : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300",
                ].join(" ")}
            >
                <List size={14} />
                <span className="hidden sm:inline">{t("view_list")}</span>
            </button>
        </div>
    );
};

/* ════════════════════════════════════════
    MAIN PAGE
════════════════════════════════════════ */
export const CommandsByStatusPage = () => {
    const { t } = useTranslation("dashboard");
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const qc = useQueryClient();

    // ── Role detection ──
    const { user } = useAuth();
    const { data: currentUser } = useCurrentUser();
    const roleName = String(currentUser?.data?.role?.name ?? user?.role?.name ?? "").trim().toLowerCase();
    const isLivreur = roleName === "livreur";
    const isPreparateur = roleName === "preparateur";

    const rawStatus = searchParams.get("status") || "CONFIRME";
    const safeInitialStatus = isLivreur && rawStatus === "CONFIRME" ? "PREPARE" : rawStatus;

    const [activeStatus, setActiveStatus] = useState(safeInitialStatus);
    const [selectedLivreurId, setSelectedLivreurId] = useState("");
    const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"

    // ── Report modal state ──
    const [reportModalOpen, setReportModalOpen] = useState(false);
    const [reportingCommand, setReportingCommand] = useState(null);

    useEffect(() => {
        setSearchParams({ status: activeStatus }, { replace: true });
    }, [activeStatus]);

    useEffect(() => {
        if (isLivreur && activeStatus === "CONFIRME") {
            setActiveStatus("PREPARE");
        }
    }, [isLivreur]);

    const { data, isLoading, isFetching } = useQuery({
        queryKey: blsByStatusKeys.list({ status: activeStatus, livreurId: selectedLivreurId || undefined }),
        queryFn: () => commandsApi.getBLsByStatus({
            status: activeStatus,
            ...(selectedLivreurId ? { livreurId: selectedLivreurId } : {}),
        }),
        staleTime: 30_000,
    });

    const { data: livreursData } = useQuery({
        queryKey: ["livreurs-simple"],
        queryFn: () => livreurApi.getAll({ limit: 100 }),
        staleTime: 60_000,
    });

    const bls = data?.data ?? [];
    const total = data?.pagination?.total ?? 0;
    const livreurs = livreursData?.data ?? [];

    const updateMutation = useUpdateCommandStatus();
    const reportMutation = useReportCommand();
   

    const invalidateBls = () => {
        qc.invalidateQueries({ queryKey: ["bls-by-status"] });
        qc.invalidateQueries({ queryKey: ["advanced-bon-livraisons", "workflow-counts"] });
    };

    const handleStatusChange = (commandId, targetStatus) => {
        updateMutation.mutate(
            { commandId, targetStatus },
            {
                onSuccess: () => {
                    toast.success(t("toast_status_updated"));
                    invalidateBls();

                    // Auto-switch filter to the new status 
                    const autoSwitchStatuses = ["EN_ROUTE", "LIVRE","ANNULE"];
                    if (autoSwitchStatuses.includes(targetStatus)) {
                        setActiveStatus(targetStatus);
                    }
                },
                onError: (err) => toast.error(err?.response?.data?.message || t("toast_status_error")),
            }
        );
    };

    const handleReportClick = (bl) => {
        setReportingCommand(bl);
        setReportModalOpen(true);
    };

    const handleReportConfirm = ({ id, reason, nextDeliveryDate }) => {
        reportMutation.mutate({ id, reason, nextDeliveryDate }, {
            onSuccess: () => {
                toast.success(t("toast_report_success"));
                setReportModalOpen(false);
                setReportingCommand(null);
                invalidateBls();
            },
            onError: (err) => toast.error(err?.response?.data?.message || t("toast_report_error")),
        });
    };


    const activeFilterOption = FILTER_OPTIONS.find((o) => o.status === activeStatus);

    const statusOptions = FILTER_OPTIONS
        .filter((o) => !isLivreur || o.status !== "CONFIRME")
        .map((o) => ({ value: o.status, label: t(`status_label_${o.status}`, o.label) }));

    const livreurOptions = livreurs.map((l) => ({
        value: String(l.id),
        label: l.name,
        subLabel: l.type,
    }));

    /* ─ Empty state ─ */
    const emptyState = (
        <div className="flex flex-col items-center justify-center py-28 text-center">
            <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-[#222222] flex items-center justify-center mb-4">
                <ClipboardList size={24} className="text-slate-400" />
            </div>
            <p className="text-base font-bold text-slate-500 dark:text-slate-400">{t("no_commands")}</p>
            <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">
                {t("no_commands_status", { label: activeFilterOption ? t(`status_label_${activeFilterOption.status}`, activeFilterOption.label) : activeStatus })}
            </p>
        </div>
    );

    /* ─ Skeleton ─ */
    const skeleton = viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 items-start">
            {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="bg-white dark:bg-[#1c1c1c] rounded-3xl border border-slate-200 dark:border-[#2e2e2e] p-7 animate-pulse">
                    <div className="h-5 bg-slate-200 dark:bg-[#2e2e2e] rounded w-1/3 mb-5" />
                    <div className="h-4 bg-slate-200 dark:bg-[#2e2e2e] rounded w-2/3 mb-3" />
                    <div className="h-4 bg-slate-200 dark:bg-[#2e2e2e] rounded w-1/2 mb-3" />
                    <div className="h-4 bg-slate-200 dark:bg-[#2e2e2e] rounded w-3/4" />
                </div>
            ))}
        </div>
    ) : (
        <div className="bg-white dark:bg-[#1c1c1c] rounded-3xl border border-slate-200 dark:border-[#2e2e2e] overflow-hidden animate-pulse">
            {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex gap-4 px-5 py-4 border-b border-slate-100 dark:border-[#2e2e2e]">
                    <div className="h-4 bg-slate-200 dark:bg-[#2e2e2e] rounded w-24" />
                    <div className="h-4 bg-slate-200 dark:bg-[#2e2e2e] rounded w-32" />
                    <div className="h-4 bg-slate-200 dark:bg-[#2e2e2e] rounded w-20 ml-auto" />
                </div>
            ))}
        </div>
    );

    return (
        <div className="min-h-screen pb-24 lg:pb-12">
            <FormPageHeader
                entityName={t("entity_name")}
                backPath="/saphir-management-dashboard"
                isView={true}
                viewTitle={activeFilterOption ? t(`status_label_${activeFilterOption.status}`, activeFilterOption.label) : activeStatus}
                viewTitleMain={t("page_title")}
                backLabel={t("back_label")}
                rightContent={
                    isFetching && !isLoading && (
                        <div className="flex items-center gap-1.5 text-[#B12B89] text-xs font-bold">
                            <Loader2 size={14} className="animate-spin" />
                            <span className="hidden sm:inline">Actualisation…</span>
                        </div>
                    )
                }
            />

            <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-5">

                {/* ── Filters bar ── */}
                <div className="bg-white dark:bg-[#1c1c1c] rounded-3xl border border-slate-200 dark:border-[#2e2e2e] shadow-sm p-5">
                    <div className="flex items-center justify-between mb-4">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {t("filters_label", { total, s: total !== 1 ? "s" : "" })}
                        </p>
                        {/* View toggle */}
                        <ViewToggle view={viewMode} onChange={setViewMode} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {!isPreparateur && (
                            <SelectDropDown
                                label={t("filter_status")}
                                name="statusFilter"
                                value={activeStatus}
                                options={statusOptions}
                                onChange={(e) => {
                                    setActiveStatus(e.target.value);
                                    setSelectedLivreurId("");
                                }}
                            />
                        )}
                        {!isLivreur && (
                            <SelectDropDown
                                label={t("filter_livreur")}
                                name="livreurFilter"
                                value={selectedLivreurId}
                                placeholder={t("filter_all_livreurs")}
                                options={livreurOptions}
                                onChange={(e) => setSelectedLivreurId(e.target.value)}
                            />
                        )}
                    </div>
                </div>

                {/* ── Content ── */}
                {isLoading ? skeleton : bls.length === 0 ? emptyState : (
                    viewMode === "grid" ? (
                        /* GRID */
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 items-start">
                            {bls.map((bl) => (
                                <BLCard
                                    key={bl.id}
                                    bl={{ ...bl, currentStatus: activeStatus }}
                                    onStatusChange={handleStatusChange}
                                    isUpdating={updateMutation.isPending}
                                    onReport={handleReportClick}
                                  
                                />
                            ))}
                        </div>
                    ) : (
                        /* TABLE */
                        <div className="bg-white dark:bg-[#1c1c1c] rounded-3xl border border-slate-200 dark:border-[#2e2e2e] shadow-sm overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[700px]">
                                    <thead>
                                        <tr className="border-b border-slate-200 dark:border-[#2e2e2e] bg-slate-50/80 dark:bg-[#222222]/50">
                                            {[
                                                t("table_ref"),
                                                t("table_client"),
                                                t("table_ville"),
                                                t("table_livreur"),
                                                t("table_contact"),
                                                t("table_delivery_date"),
                                                t("table_amount"),
                                                t("table_status"),
                                                "",
                                            ].map((h, i) => (
                                                <th
                                                    key={i}
                                                    className={[
                                                        "px-5 py-3.5 text-left text-[9px] font-bold uppercase tracking-widest text-slate-400",
                                                        i === 2 ? "hidden md:table-cell" : "",
                                                        i === 3 || i === 5 ? "hidden lg:table-cell" : "",
                                                        i === 4 ? "hidden xl:table-cell" : "",
                                                    ].join(" ")}
                                                >
                                                    {h}
                                                </th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {bls.map((bl) => (
                                            <BLRow
                                                key={bl.id}
                                                bl={{ ...bl, currentStatus: activeStatus }}
                                                onStatusChange={handleStatusChange}
                                                isUpdating={updateMutation.isPending}
                                            />
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )
                )}
            </div>

            {/* ── Report Modal ── */}
            <ReportModal
                open={reportModalOpen}
                onClose={() => { setReportModalOpen(false); setReportingCommand(null); }}
                command={reportingCommand}
                onConfirm={handleReportConfirm}
                isLoading={reportMutation.isPending}
            />
        </div>
    );
};