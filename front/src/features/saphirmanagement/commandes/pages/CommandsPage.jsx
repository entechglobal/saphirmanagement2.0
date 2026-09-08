import { useState, useCallback, memo, useMemo, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { useNavigate, useSearchParams } from "react-router-dom";
import { toast } from "@/shared/utils/toast";
import {
  CheckCircle2,
  Clock,
  User,
  Truck,
  Printer,
  ChevronDown,
  AlertTriangle,
  PlayCircle,
  CalendarClock,
  MoreVertical,
  Pencil, Trash2,
  PauseCircle,
  X, Loader2, XCircle,
  Eye,
} from "lucide-react";
import { Box } from "@mui/material";
import { useTranslation } from "react-i18next";

/* ---------- Hooks ---------- */
import {
  useCommands,
  useDeleteCommand,
  useSimpleLivreurs,
  useCommercials,
  useCommandClients,
  usePrintCommand,
  useUpdateCommandStatus,
  useReportCommand,
  useAgences,
  useSuspendCommand,
} from "../hooks/useCommands";
import { useCurrentUser } from "../../../users/hooks/useUsers";

/* ---------- Shared Components ---------- */
import { ReusableTable } from "../../../../shared/components/ReusableTable";
import { FiltersBar } from "../../../../shared/components/FiltersBar";
import { HeaderTable } from "../../../../shared/components/HeaderTable";
import { ConfirmationModal } from "../../../../shared/components/ConfirmationModal";
import { FormDatePicker } from "../../../../shared/FormDatePicker";
import { PayOrderModal } from "../components/PayOrderModal";

/* ─────────────────────────────────────────────
   STATUS FLOW
───────────────────────────────────────────── */
const NEXT_STATUS = {
  EN_COURS: ["PREPARE", "CONFIRME", "ANNULE"],
  CONFIRME: ["PREPARE", "ANNULE"],
  PREPARE: ["COLLECTE", "ANNULE"],
  COLLECTE: ["EN_ROUTE", "ANNULE"],
  EN_ROUTE: ["LIVRE", "ANNULE"],
  LIVRE: ["PAYE", "ANNULE"],
  PAYE: [],
  ANNULE: [],
};

const getAllowedTargetStatuses = (roleName, currentStatus) => {
  const role = roleName?.trim().toUpperCase();
  const next = NEXT_STATUS[currentStatus] ?? [];
  if (["SUPER_ADMIN", "SOCIETE_ADMIN", "COMMERCIAL", "GERANT"].includes(role)) return next;
  switch (role) {
    case "PREPARATEUR": return ["EN_COURS", "CONFIRME", "PREPARE"].includes(currentStatus) ? next : [];
    case "LIVREUR": return ["PREPARE", "COLLECTE", "EN_ROUTE", "LIVRE"].includes(currentStatus) ? next : [];
    default: return [];
  }
};

/* ─────────────────────────────────────────────
   STATUS VISUAL CONFIG
───────────────────────────────────────────── */
const STATUS_CONFIG = {
  EN_COURS: {
    label: "En cours",
    dot: "bg-[#FF6420]",
    badge: "bg-[#FFF0E8] text-[#C13E0A] border-[#FF7A35] dark:bg-[#7A2500] dark:text-[#FFB38A] dark:border-[#D95220]",
    icon: <Clock className="w-3 h-3" />,
  },
  CONFIRME: {
    label: "Confirmé",
    dot: "bg-[#1F72FF]",
    badge: "bg-[#E8F2FF] text-[#0A47C1] border-[#3D8BFF] dark:bg-[#062B7A] dark:text-[#90BCFF] dark:border-[#1F72FF]",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  PREPARE: {
    label: "Préparé",
    dot: "bg-[#6B44FF]",
    badge: "bg-[#F0EEFF] text-[#3D20C1] border-[#8B6FFF] dark:bg-[#25127A] dark:text-[#BEB0FF] dark:border-[#6B44FF]",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  COLLECTE: {
    label: "Collecté",
    dot: "bg-[#FF3D8A]",
    badge: "bg-[#FFF0F6] text-[#B3175A] border-[#FF5EA0] dark:bg-[#6E0A37] dark:text-[#FFB0D0] dark:border-[#FF3D8A]",
    icon: <Truck className="w-3 h-3" />,
  },
  EN_ROUTE: {
    label: "En route",
    dot: "bg-[#F5BC00]",
    badge: "bg-[#FFFBE0] text-[#8A6200] border-[#FFCC00] dark:bg-[#4A3500] dark:text-[#FFE066] dark:border-[#CCA000]",
    icon: <Truck className="w-3 h-3" />,
  },
  LIVRE: {
    label: "Livré",
    dot: "bg-[#38C41A]",
    badge: "bg-[#EEFBE8] text-[#1A6E0A] border-[#4ECC2A] dark:bg-[#0C3D05] dark:text-[#90E878] dark:border-[#38C41A]",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  PAYE: {
    label: "Payé",
    dot: "bg-[#00B87A]",
    badge: "bg-[#E6FBF5] text-[#076647] border-[#00C98A] dark:bg-[#03382A] dark:text-[#5EEDC0] dark:border-[#00A06A]",
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  ANNULE: {
    label: "Annulé",
    dot: "bg-[#FF2020]",
    badge: "bg-[#FFF0F0] text-[#B30A0A] border-[#FF4040] dark:bg-[#6E0505] dark:text-[#FFB0B0] dark:border-[#FF2020]",
    icon: <XCircle className="w-3 h-3" />,
  },
};

/* ─────────────────────────────────────────────
   ANNULATION CONFIRM MODAL
───────────────────────────────────────────── */
const AnnulationConfirmModal = ({ open, onClose, onConfirm, isLoading }) => {
  const { t } = useTranslation("commands");
  if (!open) return null;
  return createPortal(
    <div
      className="fixed inset-0 modal-backdrop flex items-center justify-center z-[99999] p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-[#1c1c1c] rounded-[2.5rem] border border-slate-200 dark:border-[#2e2e2e] w-full max-w-sm shadow-2xl flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-8 py-6 border-b border-slate-100 dark:border-[#2e2e2e] flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-red-50 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={18} className="text-red-500" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
              {t("annulation_title")}
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">{t("annulation_irreversible")}</p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto p-2 hover:bg-slate-100 dark:hover:bg-[#222222] rounded-xl transition"
          >
            <X size={16} className="text-slate-400" />
          </button>
        </div>

        <div className="px-8 py-7 flex flex-col gap-4">
          <div className="flex flex-col gap-3">
            {[t("annulation_payments"), t("annulation_stock")].map((text, i) => (
              <div
                key={i}
                className="flex items-start gap-2.5 px-4 py-3 rounded-2xl bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30"
              >
                <XCircle size={15} className="text-red-500 flex-shrink-0 mt-0.5" />
                <span className="text-sm text-red-700 dark:text-red-300 font-medium">{text}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 text-center mt-1">
            {t("annulation_question")}
          </p>
        </div>

        <div className="px-8 py-5 border-t border-slate-100 dark:border-[#2e2e2e] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-6 py-2.5 rounded-2xl border border-slate-200 dark:border-[#2e2e2e] text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#222222] transition disabled:opacity-50"
          >
            {t("annulation_back")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex items-center gap-2 px-7 py-2.5 rounded-2xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition shadow-lg shadow-red-200 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <><Loader2 size={15} className="animate-spin" /> {t("annulation_loading")}</>
            ) : (
              <><XCircle size={15} /> {t("annulation_confirm")}</>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};

/* ─────────────────────────────────────────────
   INLINE STATUS DROPDOWN
───────────────────────────────────────────── */
const InlineStatusDropdown = memo(({ status, allowedTargets, onSelect, isLoading }) => {
  const { t } = useTranslation("commands");
  const [open, setOpen] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0 });
  const [annulConfirmOpen, setAnnulConfirmOpen] = useState(false);
  const triggerRef = useRef(null);
  const dropRef = useRef(null);

  const cfgRaw = STATUS_CONFIG[status] ?? {
    label: status,
    dot: "bg-slate-400",
    badge: "bg-slate-50 text-slate-500 border-slate-200",
    icon: null,
  };
  const cfg = { ...cfgRaw, label: t(`status_label_${status}`, cfgRaw.label) };
  const isTerminal = allowedTargets.length === 0;

  const recalcPos = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const dropHeight = allowedTargets.length * 36 + 16;
    const openAbove =
      window.innerHeight - rect.bottom < dropHeight + 8 && rect.top > dropHeight + 8;
    setDropPos({
      top: openAbove
        ? rect.top + window.scrollY - dropHeight - 6
        : rect.bottom + window.scrollY + 6,
      left: rect.left + window.scrollX,
      minWidth: rect.width,
    });
  }, [allowedTargets.length]);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target) &&
        dropRef.current &&
        !dropRef.current.contains(e.target)
      )
        setOpen(false);
    };
    const closeOnScroll = () => setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("scroll", closeOnScroll, true);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("scroll", closeOnScroll, true);
    };
  }, [open]);

  const panel =
    open &&
    !isTerminal &&
    createPortal(
      <div
        ref={dropRef}
        style={{
          position: "absolute",
          top: dropPos.top,
          left: dropPos.left,
          minWidth: Math.max(dropPos.minWidth ?? 0, 152),
          zIndex: 99999,
        }}
        className="py-1 px-1 bg-white dark:bg-[#222222] border border-slate-200 dark:border-[#2e2e2e] rounded-xl shadow-2xl"
      >
        {allowedTargets.map((target, idx) => {
          const tcfgRaw = STATUS_CONFIG[target] ?? { label: target, dot: "bg-slate-400" };
          const tcfg = { ...tcfgRaw, label: t(`status_label_${target}`, tcfgRaw.label) };
          const isCancel = target === "ANNULE";
          return (
            <div key={target}>
              {isCancel && idx > 0 && (
                <div className="h-px bg-slate-100 dark:bg-[#2e2e2e] my-1" />
              )}
              <button
                type="button"
                disabled={isLoading}
                onClick={() => {
                  if (isCancel) {
                    setOpen(false);
                    setAnnulConfirmOpen(true);
                  } else {
                    onSelect(target);
                    setOpen(false);
                  }
                }}
                className={[
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-left transition-colors duration-100 disabled:opacity-50 disabled:cursor-not-allowed",
                  isCancel
                    ? "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                    : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#2e2e2e]/60",
                ].join(" ")}
              >
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${tcfg.dot}`} />
                {tcfg.label}
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
        onClick={() =>
          !isTerminal && (open ? setOpen(false) : (recalcPos(), setOpen(true)))
        }
        className={[
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold uppercase tracking-wide transition-all duration-150 select-none",
          cfg.badge,
          isTerminal
            ? "opacity-60 cursor-default"
            : "cursor-pointer hover:brightness-95 active:scale-95",
        ].join(" ")}
      >
        {cfg.label}
        {!isTerminal && (
          <ChevronDown
            className={`w-2.5 h-2.5 opacity-50 transition-transform duration-150 ${open ? "rotate-180" : ""}`}
          />
        )}
      </button>
      {panel}
      <AnnulationConfirmModal
        open={annulConfirmOpen}
        onClose={() => setAnnulConfirmOpen(false)}
        onConfirm={() => {
          onSelect("ANNULE");
          setAnnulConfirmOpen(false);
        }}
        isLoading={isLoading}
      />
    </div>
  );
});
InlineStatusDropdown.displayName = "InlineStatusDropdown";

/* ─────────────────────────────────────────────
   ROW ACTIONS MENU
───────────────────────────────────────────── */
const RowActionsMenu = memo(({
  row,
  onEdit,
  onDelete,
  onPrint,
  onReport,
  onSuspend,
  isPrintPending,
  isReportPending,
  isSuspendPending,
  restrictedRole,
}) => {
  const { t } = useTranslation("commands");
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const menuRef = useRef(null);

  const { isReported, commandStatus, isSuspended } = row;
  const isTerminal = ["PAYE", "ANNULE"].includes(commandStatus);
  const isAnyPending = isPrintPending || isReportPending;

  const items = [
    ...(!restrictedRole
      ? [
          {
            key: "edit",
            label: t("action_edit"),
            icon: <Pencil size={13} />,
            className: "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#2e2e2e]/60",
            onClick: () => { onEdit(row); setOpen(false); },
          },
          {
            key: "delete",
            label: t("action_delete"),
            icon: <Trash2 size={13} />,
            className: "text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20",
            dividerBefore: true,
            onClick: () => { onDelete(row); setOpen(false); },
          },
        ]
      : []),
    {
      key: "print",
      label: t("action_print"),
      icon: <Printer size={13} />,
      className: "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#2e2e2e]/60",
      dividerBefore: !restrictedRole,
      pending: isPrintPending,
      onClick: () => { onPrint(row); setOpen(false); },
    },
    ...(!isTerminal
      ? [{
          key: "suivi",
          label: t("action_report"),
          icon: <AlertTriangle size={13} />,
          className: "text-orange-700 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20",
          pending: isReportPending,
          onClick: () => { onReport(row); setOpen(false); },
        }]
      : []),
    ...(!isTerminal
      ? [{
          key: "suspend",
          label: isSuspended ? t("action_reactivate") : t("action_suspend"),
          icon: isSuspended ? <PlayCircle size={13} /> : <PauseCircle size={13} />,
          className: isSuspended
            ? "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
            : "text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#2e2e2e]/60",
          pending: isSuspendPending,
          onClick: () => { onSuspend(row); setOpen(false); },
        }]
      : []),
  ];

  const recalc = useCallback(() => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const menuH = items.length * 40 + 16;
    const menuW = 180;
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    let top;
    if (spaceBelow < menuH + 8 && spaceAbove > menuH + 8) {
      top = rect.top + window.scrollY - menuH - 4;
    } else {
      top = rect.bottom + window.scrollY + 4;
    }
    let left = rect.right + window.scrollX - menuW;
    const minLeft = 8;
    const maxLeft = window.innerWidth - menuW - 8;
    if (left < minLeft) left = minLeft;
    if (left > maxLeft) left = maxLeft;
    setPos({ top, left });
  }, [items.length]);

  useEffect(() => {
    if (!open) return;
    const handleReposition = () => { if (open) recalc(); };
    const close = (e) => {
      if (
        triggerRef.current &&
        !triggerRef.current.contains(e.target) &&
        menuRef.current &&
        !menuRef.current.contains(e.target)
      )
        setOpen(false);
    };
    const closeScroll = () => setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("scroll", closeScroll, true);
    window.addEventListener("resize", handleReposition);
    window.addEventListener("scroll", handleReposition);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("scroll", closeScroll, true);
      window.removeEventListener("resize", handleReposition);
      window.removeEventListener("scroll", handleReposition);
    };
  }, [open, recalc]);

  const menu =
    open &&
    createPortal(
      <div
        ref={menuRef}
        style={{
          position: "absolute",
          top: pos.top,
          left: pos.left,
          minWidth: 180,
          maxWidth: "calc(100vw - 16px)",
          zIndex: 99999,
        }}
        className="py-1.5 px-1.5 bg-white dark:bg-[#222222] border border-slate-200 dark:border-[#2e2e2e] rounded-xl shadow-2xl"
      >
        {items.map((item) => (
          <div key={item.key}>
            {item.dividerBefore && (
              <div className="h-px bg-slate-100 dark:bg-[#2e2e2e] my-1" />
            )}
            <button
              type="button"
              disabled={item.pending}
              onClick={item.onClick}
              className={[
                "w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-semibold text-left transition-colors duration-100",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                item.className,
              ].join(" ")}
            >
              {item.icon}
              {item.pending ? "…" : item.label}
            </button>
          </div>
        ))}
      </div>,
      document.body
    );

  return (
    <div className="inline-flex justify-center">
      <button
        ref={triggerRef}
        type="button"
        disabled={isAnyPending}
        onClick={() => (open ? setOpen(false) : (recalc(), setOpen(true)))}
        className={[
          "flex items-center justify-center w-8 h-8 rounded-lg transition-all duration-150",
          "text-slate-400 hover:text-slate-600 dark:hover:text-slate-200",
          "hover:bg-slate-100 dark:hover:bg-[#2e2e2e]",
          "border border-transparent hover:border-slate-200 dark:hover:border-[#3a3a3a]",
          "disabled:opacity-40 disabled:cursor-not-allowed",
          open ? "bg-slate-100 dark:bg-[#2e2e2e] border-slate-200 dark:border-[#3a3a3a] text-slate-600" : "",
        ].join(" ")}
      >
        <MoreVertical size={20} />
      </button>
      {menu}
    </div>
  );
});
RowActionsMenu.displayName = "RowActionsMenu";

/* ─────────────────────────────────────────────
   REPORT MODAL
───────────────────────────────────────────── */
export const ReportModal = ({ open, onClose, command, onConfirm, isLoading }) => {
  const { t } = useTranslation("commands");
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
        <div className="px-8 py-6 border-b border-slate-100 dark:border-[#2e2e2e] flex items-center gap-4">
          <div className="w-11 h-11 rounded-2xl bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={18} className="text-orange-500" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100">
              {t("report_title")}
            </h2>
            <p className="text-[11px] text-slate-400 mt-0.5">
              {t("report_subtitle")}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-auto p-2 hover:bg-slate-100 dark:hover:bg-[#222222] rounded-xl transition"
          >
            <X size={16} className="text-slate-400" />
          </button>
        </div>

        <div className="px-8 py-7 flex flex-col gap-6">
          {command && (
            <div className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-slate-50 dark:bg-[#222222]/50 border border-slate-100 dark:border-[#2e2e2e]">
              <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                <User size={14} className="text-[#B12B89]" />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                  {command.clientName}
                </p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  #{command.id}
                </p>
              </div>
            </div>
          )}

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

          <FormDatePicker
            label={t("report_next_date")}
            name="nextDeliveryDate"
            value={nextDeliveryDate}
            onChange={(e) => setNextDeliveryDate(e.target.value)}
            placeholder="jj/mm/aaaa"
          />
        </div>

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

/* ─────────────────────────────────────────────
   MAIN PAGE
───────────────────────────────────────────── */
const statusOptionFromParam = (raw, t) => {
  if (!raw || !STATUS_CONFIG[raw]) return null;
  return {
    value: raw,
    label: t(`status_label_${raw}`, STATUS_CONFIG[raw].label),
  };
};

export const CommandsPage = () => {
  const { t } = useTranslation("commands");
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { data: currentUser } = useCurrentUser();
  const roleName     = currentUser?.data?.role?.name;
  const upperRole    = roleName?.trim().toUpperCase();
  const isLivreur     = upperRole === "LIVREUR";
  const isCommercial  = upperRole === "COMMERCIAL";
  const isPreparateur = upperRole === "PREPARATEUR";
  // Livreur/Préparateur can't create, edit, or delete commands — only act on existing ones.
  const restrictedRole = isLivreur || isPreparateur;

  const [globalFilter, setGlobalFilter] = useState("");
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: 10 });

  const [openConfirm, setOpenConfirm] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);

  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportingCommand, setReportingCommand] = useState(null);
  const [payOrder, setPayOrder] = useState(null);

  const [statusFilter, setStatusFilter] = useState(() =>
    statusOptionFromParam(new URLSearchParams(window.location.search).get("status"), (key, fallback) => fallback),
  );
  const [selectedLivreur, setSelectedLivreur] = useState(null);
  const [selectedCommercial, setSelectedCommercial] = useState(null);
  const [selectedAgency, setSelectedAgency] = useState(null);

  const { data: livreurData, isLoading: livreurLoading } = useSimpleLivreurs();
  const { data: commercialData, isLoading: commercialLoading } = useCommercials();
  const { data: agenciesData, isLoading: agenciesLoading } = useAgences();
  const { data: clientsData } = useCommandClients({ limit: 10000 });

  const setStatusQuery = useCallback(
    (value) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          if (value) next.set("status", value);
          else next.delete("status");
          return next;
        },
        { replace: true },
      );
    },
    [setSearchParams],
  );

  useEffect(() => {
    const next = statusOptionFromParam(searchParams.get("status"), t);
    setStatusFilter((prev) => {
      if (prev?.value === next?.value && (!next || prev.label === next.label)) return prev;
      return next;
    });
  }, [searchParams, t]);

  const { data, isLoading, isFetching, isError } = useCommands({
    pageIndex: pagination.pageIndex,
    pageSize: pagination.pageSize,
    search: globalFilter,
    livreurId: selectedLivreur?.id,
    commercialId: selectedCommercial?.id,
    agenceId: selectedAgency?.id,
    commandStatus: statusFilter?.value,
  });

  const deleteMutation = useDeleteCommand();
  const printMutation = usePrintCommand();
  const updateStatusMutation = useUpdateCommandStatus();
  const reportMutation = useReportCommand();
  const suspendMutation = useSuspendCommand();

  const tableData = data?.data ?? [];
  const paginationMeta = data?.pagination;
  const results = data?.results ?? 0;
  const totalRows = paginationMeta ? paginationMeta.totalPages * paginationMeta.limit : 0;

  const livreurOptions = livreurData?.data ?? [];
  const commercialOptions = commercialData?.data ?? [];
  const agencyOptions = agenciesData?.data ?? [];

  const hasActiveFilters = !!(
    statusFilter ||
    (!isLivreur && selectedLivreur) ||
    (!isCommercial && selectedCommercial) ||
    selectedAgency ||
    globalFilter
  );

  const resetPage = useCallback(
    () => setPagination((p) => ({ ...p, pageIndex: 0 })),
    []
  );

  const handleReset = useCallback(() => {
    setStatusFilter(null);
    setSelectedLivreur(null);
    setSelectedCommercial(null);
    setSelectedAgency(null);
    setGlobalFilter("");
    setStatusQuery(null);
    resetPage();
  }, [resetPage, setStatusQuery]);

  /* ── Stable handlers ── */
  const handleDeleteClick = useCallback((row) => {
    setSelectedRow(row);
    setOpenConfirm(true);
  }, []);

  const handleReportClick = useCallback((row) => {
    setReportingCommand(row);
    setReportModalOpen(true);
  }, []);

  const handlePrintPDF = useCallback(
    (row) => {
      printMutation.mutate(
        { id: row.id, view: false },
        {
          onSuccess: () => toast.success(t("toast.print_success")),
          onError: (err) =>
            toast.error(err?.response?.data?.message || t("toast.print_error")),
        }
      );
    },
    [printMutation, t]
  );

  const handleSuspendClick = useCallback(
    (row) => {
      suspendMutation.mutate(
        { id: row.id },
        {
          onSuccess: () =>
            toast.success(row.isSuspended ? t("toast.resumed") : t("toast.suspended")),
          onError: (err) =>
            toast.error(err?.response?.data?.message || t("toast.suspend_error")),
        }
      );
    },
    [suspendMutation, t]
  );

  const confirmDelete = useCallback(() => {
    if (!selectedRow) return;
    deleteMutation.mutate(selectedRow.id, {
      onSuccess: (res) => {
        toast.success(res?.message || t("toast.delete_success"));
        setOpenConfirm(false);
        setSelectedRow(null);
      },
      onError: (err) => {
        setOpenConfirm(false);
        toast.error(err?.response?.data?.message || t("toast.delete_error"));
      },
    });
  }, [selectedRow, deleteMutation, t]);

  const handleReportConfirm = useCallback(
    ({ id, reason, nextDeliveryDate }) => {
      reportMutation.mutate(
        { id, reason, nextDeliveryDate },
        {
          onSuccess: () => {
            toast.success(t("toast.report_success"));
            setReportModalOpen(false);
            setReportingCommand(null);
          },
          onError: (err) =>
            toast.error(err?.response?.data?.message || t("toast.report_error")),
        }
      );
    },
    [reportMutation, t]
  );

  const applyStatusChange = useCallback(
    (command, targetStatus, payments) => {
      updateStatusMutation.mutate(
        { commandId: command.id, targetStatus, payments },
        {
          onSuccess: () => {
            toast.success(t("toast.status_updated"));
            if (payments?.some((p) => p.modeReglement === "ESPECE")) {
              toast.success(t("toast.cash_remittance"));
            }
            setPayOrder(null);
          },
          onError: (err) =>
            toast.error(
              err?.response?.data?.message || t("toast.status_error")
            ),
        }
      );
    },
    [updateStatusMutation, t]
  );

  const handleStatusSelect = useCallback(
    (command, targetStatus) => {
      if (targetStatus === "PAYE") {
        setPayOrder(command);
        return;
      }
      applyStatusChange(command, targetStatus);
    },
    [applyStatusChange]
  );

  const fmt = useCallback(
    (n) =>
      Number(n ?? 0).toLocaleString("fr-FR", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    []
  );

  const columns = useMemo(
    () => [
      {
        id: "client",
        header: t("client"),
        Cell: ({ row }) => (
          <div className="flex flex-col py-1 gap-0.5">
            <span className="text-sm font-semibold text-gray-800 dark:text-gray-100">
              {row.original.clientName || "—"}
            </span>
            {row.original.whatsapp && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {row.original.whatsapp}
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: "ville",
        header: t("ville"),
        Cell: ({ cell }) => (
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {cell.getValue() || "—"}
          </span>
        ),
      },
      {
        accessorKey: "agenceName",
        header: t("agency"),
        Cell: ({ cell }) => (
          <span className="text-sm text-gray-700 dark:text-gray-200">
            {cell.getValue() || "—"}
          </span>
        ),
      },
      {
        accessorKey: "dateLivraison",
        header: t("delivery_date"),
        Cell: ({ row }) => {
          const { dateLivraison, nextDeliveryDate, isReported } = row.original;
          const isReplaced = isReported && nextDeliveryDate;
          return (
            <div className="flex flex-col gap-0.5">
              <span
                className={`text-sm ${
                  isReplaced
                    ? "line-through text-gray-400 dark:text-gray-500"
                    : "text-gray-600 dark:text-gray-400"
                }`}
              >
                {dateLivraison || "—"}
              </span>
              {isReplaced && (
                <span className="text-[11px] font-medium text-orange-500 dark:text-orange-400">
                  {nextDeliveryDate} · {t("reported")}
                </span>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: "commandStatus",
        header: t("status"),
        Cell: ({ row }) => {
          const status = row.original.commandStatus;
          const allowed = roleName ? getAllowedTargetStatuses(roleName, status) : [];
          return (
            <InlineStatusDropdown
              status={status}
              allowedTargets={allowed}
              isLoading={updateStatusMutation.isPending}
              onSelect={(targetStatus) =>
                handleStatusSelect(row.original, targetStatus)
              }
            />
          );
        },
      },
      {
        id: "amounts",
        header: t("amounts"),
        Cell: ({ row }) => {
          const amountDue = row.original.amountDue || 0;
          const amountPaid = row.original.amountPaid || 0;
          return (
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-400">{t("due")}:</span>
                <span className="font-semibold text-slate-700 dark:text-slate-200">
                  {fmt(amountDue)} MAD
                </span>
              </div>
              <div className="flex items-center gap-1 text-xs">
                <span className="text-slate-400">{t("paid")}:</span>
                <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                  {fmt(amountPaid)} MAD
                </span>
              </div>
            </div>
          );
        },
      },
      {
        id: "commission",
        header: t("col_commission"),
        Cell: ({ row }) => (
          <span className="text-sm font-semibold text-[#B12B89]">
            {fmt(row.original.totalCommission || 0)} MAD
          </span>
        ),
      },
      {
        id: "isPaid",
        header: t("col_is_paid"),
        Cell: ({ row }) => {
          const total = row.original.amountDue || 0;
          const paid = row.original.amountPaid || 0;
          const status = row.original.commandStatus;
          const isFullyPaid = paid >= total && total > 0;
          return (
            <span
              className={`text-sm font-medium ${
                isFullyPaid || status === "PAYE"
                  ? "text-emerald-600 dark:text-emerald-400"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {isFullyPaid || status === "PAYE" ? t("paid_yes") : t("paid_no")}
            </span>
          );
        },
      },
      {
        id: "colisTrackingNumber",
        header: t("col_colis_code"),
        Cell: ({ row }) => {
          const trackingNumber = row.original.colisTrackingNumber;
          return (
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {trackingNumber || "—"}
            </span>
          );
        },
      },
      {
        id: "extra_actions",
        header: t("col_actions"),
        enableSorting: false,
        Cell: ({ row }) => (
          <div className="flex items-center gap-2">
            <button
              type="button"
              title={t("see_order")}
              onClick={() => navigate(`/commandes/${row.original.id}`)}
              className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-[#B12B89] dark:hover:bg-[#222]"
            >
              <Eye className="h-[17px] w-[17px]" strokeWidth={1.75} />
            </button>
            <RowActionsMenu
              row={row.original}
              onEdit={(r) => navigate(`/commandes/${r.id}/edit`)}
              onDelete={handleDeleteClick}
              onPrint={handlePrintPDF}
              onReport={handleReportClick}
              onSuspend={handleSuspendClick}
              isSuspendPending={suspendMutation.isPending}
              isPrintPending={printMutation.isPending}
              isReportPending={reportMutation.isPending}
              restrictedRole={restrictedRole}
            />
          </div>
        ),
      },
    ],
    [
      t,
      navigate,
      roleName,
      restrictedRole,
      fmt,
      handleDeleteClick,
      handlePrintPDF,
      handleReportClick,
      handleSuspendClick,
      handleStatusSelect,
      updateStatusMutation.isPending,
      printMutation.isPending,
      reportMutation.isPending,
      suspendMutation.isPending,
    ]
  );

  return (
    <div className="p-4 md:p-8 min-h-screen transition-colors duration-300">
      <HeaderTable
        title={t("title")}
        onCreate={restrictedRole ? undefined : () => navigate("/commandes/create")}
        createLabel={t("create_new")}
      />

      <FiltersBar
        cols={{ xs: "1fr", sm: "repeat(2, 1fr)", md: "repeat(4, 1fr)" }}
        filters={[
          {
            type: "select",
            id: "status",
            label: t("status_filter"),
            icon: CheckCircle2,
            options: Object.entries(STATUS_CONFIG).map(([value, cfg]) => ({ value, label: t(`status_label_${value}`, cfg.label) })),
            value: statusFilter,
            onChange: (v) => {
              setStatusFilter(v);
              setStatusQuery(v?.value || null);
              resetPage();
            },
          },
          ...(!isLivreur ? [{
            type: "async-select",
            id: "livreur",
            label: t("livreur"),
            icon: Truck,
            options: livreurOptions,
            value: selectedLivreur,
            onChange: (v) => { setSelectedLivreur(v); resetPage(); },
            loading: livreurLoading,
            getOptionLabel: (o) => o?.name ?? "",
          }] : []),
          ...(!isCommercial ? [{
            type: "async-select",
            id: "commercial",
            label: t("commercial"),
            icon: User,
            options: commercialOptions,
            value: selectedCommercial,
            onChange: (v) => { setSelectedCommercial(v); resetPage(); },
            loading: commercialLoading,
            getOptionLabel: (o) => o?.name ?? "",
          }] : []),
          {
            type: "async-select",
            id: "agence",
            label: t("agence"),
            icon: User,
            options: agencyOptions,
            value: selectedAgency,
            onChange: (v) => { setSelectedAgency(v); resetPage(); },
            loading: agenciesLoading,
            getOptionLabel: (o) => o?.name ?? "",
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
        globalFilter={globalFilter}
        searchPlaceholder={t("search_placeholder")}
        setGlobalFilter={setGlobalFilter}
        isLoading={isLoading}
        isFetching={isFetching}
        isError={isError}

        enableRowActions={false}
        tableId="commands-table"
      />

      <ConfirmationModal
        isOpen={openConfirm}
        onClose={() => setOpenConfirm(false)}
        onConfirm={confirmDelete}
        title={t("delete_modal.title")}
        message={t("delete_modal.message", { id: selectedRow?.id })}
        confirmText={t("delete_modal.confirm")}
        cancelText={t("delete_modal.cancel")}
        variant="danger"
        isLoading={deleteMutation.isPending}
      />

      <ReportModal
        open={reportModalOpen}
        onClose={() => { setReportModalOpen(false); setReportingCommand(null); }}
        command={reportingCommand}
        onConfirm={handleReportConfirm}
        isLoading={reportMutation.isPending}
      />

      <PayOrderModal
        isOpen={!!payOrder}
        order={payOrder}
        isLoading={updateStatusMutation.isPending}
        onClose={() => setPayOrder(null)}
        onConfirm={(payments) => {
          if (!payOrder) return;
          applyStatusChange(payOrder, "PAYE", payments);
        }}
      />
    </div>
  );
};