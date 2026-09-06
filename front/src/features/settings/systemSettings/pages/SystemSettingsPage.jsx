import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  ShieldAlert,
  Clock,
  AlertTriangle,
  History,
  Loader2,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Infinity,
} from "lucide-react";
import { toast } from "@/shared/utils/toast";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import {
  useSystemSettings,
  useSettingsHistory,
  useUpdateAllowNegativeStock,
  useUpdateHourRange,
} from "../hooks/useSystemSettings";
import { BaseModal } from "@/shared/components/BaseModal";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const HIST_LIMIT = 5;

const fmtHour = (h) => `${String(h).padStart(2, "0")}:00`;

const hourOptions = Array.from({ length: 24 }, (_, i) => ({
  value: i,
  label: fmtHour(i),
}));

const TimePanel = ({ label, value, onChange, roundedClass = "" }) => {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const triggerRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    const close = (e) => {
      if (!triggerRef.current?.contains(e.target) && !dropdownRef.current?.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  const handleOpen = () => {
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) setPos({ top: rect.bottom + 4, left: rect.left });
    setOpen(true);
  };

  return (
    <div
      ref={triggerRef}
      onClick={handleOpen}
      className={`flex flex-col gap-2 px-5 py-3 bg-white dark:bg-[#1c1c1c] cursor-pointer select-none hover:bg-slate-50 dark:hover:bg-[#222222]/60 transition-colors ${roundedClass}`}
    >
      <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400 pointer-events-none">
        {label}
      </span>
      <div className="flex items-center gap-2 pointer-events-none">
        <Clock size={13} className="text-blue-400 flex-shrink-0" />
        <span className="text-sm font-bold text-slate-700 dark:text-slate-100">
          {fmtHour(value)}
        </span>
        <ChevronDown
          size={12}
          className={`text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </div>

      {open && createPortal(
        <div
          ref={dropdownRef}
          style={{ position: "fixed", top: pos.top, left: pos.left }}
          className="z-[9999] w-24 bg-white dark:bg-[#1c1c1c] border border-slate-200 dark:border-[#2e2e2e] rounded-xl shadow-xl overflow-hidden"
        >
          <div className="max-h-48 overflow-y-auto py-1">
            {hourOptions.map((o) => (
              <button
                key={o.value}
                type="button"
                onClick={() => { onChange(o.value); setOpen(false); }}
                className={`w-full px-4 py-2 text-sm text-start transition ${
                  o.value === value
                    ? "bg-blue-50 dark:bg-blue-900/30 text-[#B12B89] dark:text-blue-400 font-bold"
                    : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#222222] font-medium"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

const severityColor = {
  HIGH:   "text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400",
  MEDIUM: "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400",
  LOW:    "text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400",
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const Toggle = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={onChange}
    disabled={disabled}
    className={`relative w-11 h-6 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 ${
      checked ? "bg-[#B12B89]" : "bg-slate-200 dark:bg-[#2e2e2e]"
    } ${disabled ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
  >
    <span
      className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
        checked ? "translate-x-5" : "translate-x-0"
      }`}
    />
  </button>
);

const SectionHeader = ({ icon: Icon, iconBg, iconColor, title }) => (
  <div className="px-6 py-4 border-b border-slate-100 dark:border-[#2e2e2e] flex items-center gap-3">
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${iconBg}`}>
      <Icon size={16} className={iconColor} />
    </div>
    <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h2>
  </div>
);

const ReasonInput = ({ value, onChange }) => {
  const { t } = useTranslation("system-settings");
  return (
    <div className="space-y-1">
      <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
        {t("form.reason_label")}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        placeholder={t("form.reason_placeholder")}
        className="w-full rounded-xl border border-slate-200 dark:border-[#2e2e2e] bg-slate-50 dark:bg-[#222222]/50 px-3 py-2 text-sm text-slate-700 dark:text-slate-300 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none transition"
      />
    </div>
  );
};

const SaveRow = ({ onCancel, onSave, isPending }) => {
  const { t } = useTranslation("system-settings");
  return (
    <div className="flex items-center justify-end gap-3 pt-1 border-t border-slate-100 dark:border-[#2e2e2e]">
      <button
        onClick={onCancel}
        className="px-4 py-2 rounded-xl border border-slate-200 dark:border-[#2e2e2e] text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#222222] transition"
      >
        {t("form.cancel")}
      </button>
      <button
        onClick={onSave}
        disabled={isPending}
        className="flex items-center gap-2 px-5 py-2 rounded-xl bg-[#B12B89] hover:bg-[#B05596] text-white text-xs font-bold transition shadow-[#B12B89]/30 dark:shadow-none shadow-lg disabled:opacity-50"
      >
        {isPending ? (
          <><Loader2 size={13} className="animate-spin" /> {t("form.saving")}</>
        ) : (
          t("form.save")
        )}
      </button>
    </div>
  );
};

const ValueBadge = ({ value, settingName, muted }) => {
  const { t } = useTranslation("system-settings");

  let display;
  if (value === null || value === undefined) display = t("value.null_value");
  else if (settingName === "allowNegativeStock") display = value ? t("value.enabled") : t("value.disabled");
  else display = fmtHour(value);

  return (
    <span
      className={`text-xs font-semibold px-2 py-0.5 rounded-md ${
        muted
          ? "bg-slate-100 dark:bg-[#222222] text-slate-400"
          : value === true
          ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
          : value === false
          ? "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
          : "bg-blue-50 dark:bg-blue-900/20 text-[#B12B89] dark:text-blue-400"
      }`}
    >
      {display}
    </span>
  );
};

// ─── Warning Confirmation Modal ───────────────────────────────────────────────

const WarningModal = ({ isOpen, onClose, onConfirm, validation, isLoading, titleKey }) => {
  const { t } = useTranslation("system-settings");
  const warnings = validation?.warnings ?? [];
  const impacts  = validation?.impacts  ?? [];

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      disableClose={isLoading}
      title={t(titleKey)}
      subtitle={t("modal.subtitle")}
      subtitleUppercase
      icon={<AlertTriangle size={18} className="text-amber-500" />}
      iconBg="bg-amber-50 dark:bg-amber-900/20"
      maxWidth="max-w-xl"
      zIndex="z-[9999]"
      footer={
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-[#2e2e2e] text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#222222] transition disabled:opacity-50"
          >
            {t("modal.cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex items-center gap-2 px-7 py-2.5 rounded-xl text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 shadow-lg shadow-amber-200 dark:shadow-none transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading
              ? <><Loader2 size={15} className="animate-spin" /> {t("modal.processing")}</>
              : t("modal.force_update")}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        {warnings.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t("modal.warnings_title")}
            </p>
            {warnings.map((w, i) => (
              <div key={i} className={`rounded-xl border p-3 text-sm ${severityColor[w.severity] ?? severityColor.MEDIUM}`}>
                <div className="flex items-start gap-2">
                  <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="font-semibold">{w.message}</p>
                    {w.action && <p className="opacity-80 text-xs">{w.action}</p>}
                  </div>
                </div>
                {Array.isArray(w.details) && w.details.length > 0 && (
                  <div className="mt-2 ml-5 space-y-1">
                    {w.details.slice(0, 5).map((d, j) => (
                      <p key={j} className="text-xs opacity-75">
                        {d.depot} — {d.product}:{" "}
                        <span className="font-bold">{d.currentStock}</span>
                      </p>
                    ))}
                    {w.details.length > 5 && (
                      <p className="text-xs opacity-60">
                        {t("modal.more_items", { count: w.details.length - 5 })}
                      </p>
                    )}
                  </div>
                )}
                {typeof w.details === "string" && (
                  <p className="mt-1 ml-5 text-xs opacity-75">{w.details}</p>
                )}
              </div>
            ))}
          </div>
        )}

        {impacts.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
              {t("modal.impacts_title")}
            </p>
            {impacts.map((imp, i) => (
              <div key={i} className="rounded-xl border border-slate-200 dark:border-[#2e2e2e] bg-slate-50 dark:bg-[#222222]/50 p-3">
                <p className="font-semibold text-slate-700 dark:text-slate-300 text-xs">{imp.module}</p>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{imp.impact}</p>
              </div>
            ))}
          </div>
        )}

        <p className="text-sm text-slate-500 dark:text-slate-400 pt-1">
          {t("modal.confirm_question")}
        </p>
      </div>
    </BaseModal>
  );
};

// ─── Page ─────────────────────────────────────────────────────────────────────

export const SystemSettingsPage = () => {
  const { t, i18n } = useTranslation("system-settings");
  const isRTL = i18n.language === "ar";
  const { data, isLoading, refetch, isFetching } = useSystemSettings();

  // History state
  const [histPage,   setHistPage]   = useState(1);
  const [histLimit,  setHistLimit]  = useState(HIST_LIMIT);
  const [histFilter, setHistFilter] = useState("all");

  const histParams = {
    limit:  histLimit,
    page:   histPage,
    ...(histFilter !== "all" && { settingName: histFilter }),
  };
  const { data: historyResp, isLoading: histLoading } = useSettingsHistory(histParams);

  const updateNegStock = useUpdateAllowNegativeStock();
  const updateHours    = useUpdateHourRange();

  // ── Negative Stock state ──
  const [negStock,        setNegStock]        = useState(null);
  const [negStockReason,  setNegStockReason]  = useState("");
  const [negStockDirty,   setNegStockDirty]   = useState(false);
  const [pendingNegStock, setPendingNegStock] = useState(null);

  // ── Hour Range state ──
  const [hourMode,    setHourMode]    = useState("none");
  const [startHour,   setStartHour]   = useState(8);
  const [endHour,     setEndHour]     = useState(18);
  const [hourReason,  setHourReason]  = useState("");
  const [hourDirty,   setHourDirty]   = useState(false);
  const [pendingHour, setPendingHour] = useState(null);

  // Sync once from API
  useEffect(() => {
    if (data?.settings && negStock === null) {
      const { allowNegativeStock, systemStartHour, systemEndHour } = data.settings;
      setNegStock(allowNegativeStock);
      if (systemStartHour === null) {
        setHourMode("none");
      } else {
        setHourMode("custom");
        setStartHour(systemStartHour);
        setEndHour(systemEndHour);
      }
    }
  }, [data, negStock]);

  // ── Negative Stock handlers ──────────────────────────────────────────────

  const handleNegStockSave = async (forceUpdate = false) => {
    try {
      const res = await updateNegStock.mutateAsync({
        allowNegativeStock: negStock,
        reason: negStockReason || undefined,
        forceUpdate,
      });
      if (res.requiresConfirmation) { setPendingNegStock(res.data?.validation); return; }
      if (res.success) {
        toast.success(res.data?.changed === false ? t("toast.already_up_to_date") : t("toast.setting_updated"));
        setNegStockDirty(false);
        setNegStockReason("");
      }
    } catch {
      toast.error(t("toast.error"));
    }
  };

  const handleNegStockForce = async () => { await handleNegStockSave(true); setPendingNegStock(null); };

  const cancelNegStock = () => {
    setNegStock(data?.settings?.allowNegativeStock ?? false);
    setNegStockDirty(false);
    setNegStockReason("");
  };

  // ── Hour Range handlers ──────────────────────────────────────────────────

  const getHourPayload = () =>
    hourMode === "none"
      ? { systemStartHour: null, systemEndHour: null }
      : { systemStartHour: startHour, systemEndHour: endHour };

  const handleHourSave = async (forceUpdate = false) => {
    try {
      const res = await updateHours.mutateAsync({
        ...getHourPayload(),
        reason: hourReason || undefined,
        forceUpdate,
      });
      if (res.requiresConfirmation) { setPendingHour(res.data?.validation); return; }
      if (res.success) {
        toast.success(res.data?.changed === false ? t("toast.already_up_to_date") : t("toast.hour_updated"));
        setHourDirty(false);
        setHourReason("");
      }
    } catch {
      toast.error(t("toast.error"));
    }
  };

  const handleHourForce = async () => { await handleHourSave(true); setPendingHour(null); };

  const cancelHour = () => {
    const { systemStartHour, systemEndHour } = data?.settings ?? {};
    setHourMode(systemStartHour === null ? "none" : "custom");
    if (systemStartHour !== null) { setStartHour(systemStartHour); setEndHour(systemEndHour); }
    setHourDirty(false);
    setHourReason("");
  };

  // ── Hour preview ─────────────────────────────────────────────────────────

  const hourPreview = () => {
    if (hourMode === "none") return t("hour_range.preview_none");
    const duration =
      startHour === endHour ? 24 : startHour < endHour ? endHour - startHour : 24 - startHour + endHour;
    return t("hour_range.preview_range", { start: fmtHour(startHour), end: fmtHour(endHour), duration });
  };

  // ── History ──────────────────────────────────────────────────────────────

  const history = historyResp?.data ?? [];
  const hasNext = history.length === histLimit;
  const hasPrev = histPage > 1;

  const changeFilter = (val) => { setHistFilter(val); setHistPage(1); };
  const changeLimit  = (val) => { setHistLimit(Number(val)); setHistPage(1); };

  // ────────────────────────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 size={22} className="animate-spin mr-2" />
        {t("loading")}
      </div>
    );
  }

  return (
    <div className="space-y-5">

      {/* ── Refresh ── */}
      <div className="flex justify-end">
        <button
          onClick={() => refetch()}
          disabled={isFetching}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#222222] rounded-xl transition disabled:opacity-50"
        >
          <RefreshCw size={13} className={isFetching ? "animate-spin" : ""} />
          {t("refresh")}
        </button>
      </div>

      {/* ── Negative Stock ── */}
      <div className="bg-white dark:bg-[#1c1c1c] border border-slate-200 dark:border-[#2e2e2e] rounded-2xl overflow-hidden shadow-sm">
        <SectionHeader
          icon={ShieldAlert}
          iconBg="bg-red-50 dark:bg-red-900/20"
          iconColor="text-red-500"
          title={t("neg_stock.title")}
        />
        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {t("neg_stock.allow_label")}
            </p>
            <div className="flex items-center gap-3">
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                negStock
                  ? "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400"
                  : "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400"
              }`}>
                {negStock ? t("neg_stock.enabled") : t("neg_stock.disabled")}
              </span>
              <Toggle
                checked={!!negStock}
                onChange={() => { setNegStock((v) => !v); setNegStockDirty(true); }}
              />
            </div>
          </div>

          {negStockDirty && (
            <div className="space-y-3">
              <ReasonInput value={negStockReason} onChange={setNegStockReason} />
              <SaveRow onCancel={cancelNegStock} onSave={() => handleNegStockSave(false)} isPending={updateNegStock.isPending} />
            </div>
          )}
        </div>
      </div>

      {/* ── Hour Range ── */}
      <div className="bg-white dark:bg-[#1c1c1c] border border-slate-200 dark:border-[#2e2e2e] rounded-2xl overflow-hidden shadow-sm">
        <SectionHeader
          icon={Clock}
          iconBg="bg-blue-50 dark:bg-blue-900/20"
          iconColor="text-blue-500"
          title={t("hour_range.title")}
        />
        <div className="px-6 py-5 space-y-4">
          {/* Mode selector */}
          <div className="flex gap-2">
            {[
              { id: "none",   labelKey: "hour_range.mode_none",   icon: Infinity },
              { id: "custom", labelKey: "hour_range.mode_custom",  icon: Clock },
            ].map(({ id, labelKey, icon: Icon }) => (
              <button
                key={id}
                onClick={() => { setHourMode(id); setHourDirty(true); }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border text-sm font-semibold transition ${
                  hourMode === id
                    ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20 text-[#B12B89] dark:text-blue-400"
                    : "border-slate-200 dark:border-[#2e2e2e] text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-[#222222]"
                }`}
              >
                <Icon size={14} />
                {t(labelKey)}
              </button>
            ))}
          </div>

          {/* Hour selectors */}
          {hourMode === "custom" && (
            <div className="inline-flex items-stretch border border-slate-200 dark:border-[#2e2e2e] rounded-2xl shadow-sm">
              <TimePanel
                label={t("hour_range.start")}
                value={startHour}
                onChange={(v) => { setStartHour(v); setHourDirty(true); }}
                roundedClass="rounded-s-2xl"
              />

              {/* Separator */}
              <div className="flex items-center px-3 border-s border-e border-slate-200 dark:border-[#2e2e2e] bg-slate-50 dark:bg-[#222222]/60">
                {isRTL
                  ? <ArrowLeft  size={14} className="text-slate-300 dark:text-slate-600" />
                  : <ArrowRight size={14} className="text-slate-300 dark:text-slate-600" />}
              </div>

              <TimePanel
                label={t("hour_range.end")}
                value={endHour}
                onChange={(v) => { setEndHour(v); setHourDirty(true); }}
                roundedClass="rounded-e-2xl"
              />
            </div>
          )}

          <p className="text-xs text-slate-400">{hourPreview()}</p>

          {hourDirty && (
            <div className="space-y-3">
              <ReasonInput value={hourReason} onChange={setHourReason} />
              <SaveRow onCancel={cancelHour} onSave={() => handleHourSave(false)} isPending={updateHours.isPending} />
            </div>
          )}
        </div>
      </div>

      {/* ── Change History ── */}
      <div className="bg-white dark:bg-[#1c1c1c] border border-slate-200 dark:border-[#2e2e2e] rounded-2xl overflow-hidden shadow-sm">
        {/* History header */}
        <div className="px-6 py-4 border-b border-slate-100 dark:border-[#2e2e2e] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-[#222222] flex items-center justify-center flex-shrink-0">
              <History size={16} className="text-slate-500" />
            </div>
            <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
              {t("history.title")}
            </h2>
          </div>
          <div className="relative flex-shrink-0">
            <select
              value={histFilter}
              onChange={(e) => changeFilter(e.target.value)}
              className="appearance-none bg-slate-50 dark:bg-[#222222] border border-slate-200 dark:border-[#2e2e2e] rounded-xl px-3 py-1.5 pr-7 text-xs font-medium text-slate-700 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-blue-400"
            >
              <option value="all">{t("history.filter_all")}</option>
              <option value="allowNegativeStock">{t("history.filter_neg_stock")}</option>
              <option value="systemStartHour">{t("history.filter_start_hour")}</option>
              <option value="systemEndHour">{t("history.filter_end_hour")}</option>
            </select>
            <ChevronDown size={11} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        {/* Rows */}
        {histLoading ? (
          <div className="flex items-center justify-center py-10 text-slate-400 text-sm">
            <Loader2 size={16} className="animate-spin mr-2" />
            {t("loading_short")}
          </div>
        ) : history.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-slate-400">
            <History size={28} className="mb-2 opacity-40" />
            <p className="text-sm">{t("history.empty")}</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50 dark:divide-[#2e2e2e]/60">
            {history.map((entry) => (
              <div key={entry.id} className="px-5 py-3.5 flex items-center gap-3 flex-wrap">
                <span className="text-[10px] font-bold uppercase tracking-wider bg-slate-100 dark:bg-[#222222] text-slate-500 dark:text-slate-400 px-2 py-0.5 rounded-md flex-shrink-0">
                  {t(`setting_label.${entry.settingName}`, { defaultValue: entry.settingName })}
                </span>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <ValueBadge value={entry.oldValue} settingName={entry.settingName} muted />
                  {isRTL
                    ? <ArrowLeft  size={11} className="text-slate-300" />
                    : <ArrowRight size={11} className="text-slate-300" />}
                  <ValueBadge value={entry.newValue} settingName={entry.settingName} />
                </div>
                <div className="ml-auto text-right min-w-0">
                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate">
                    {entry.changedBy?.name ?? "—"}
                  </p>
                  <p className="text-[11px] text-slate-400">
                    {dayjs(entry.changedAt).format("DD/MM/YYYY HH:mm")}
                  </p>
                  {entry.reason && (
                    <p className="text-[11px] text-slate-400 italic truncate max-w-[160px]">
                      &ldquo;{entry.reason}&rdquo;
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination footer — always visible */}
        <div className="px-5 py-3 border-t border-slate-100 dark:border-[#2e2e2e] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <p className="text-xs text-slate-400">
              {history.length > 0
                ? t("history.results", {
                    from: (histPage - 1) * histLimit + 1,
                    to:   (histPage - 1) * histLimit + history.length,
                  })
                : t("history.no_results")}
            </p>
            <div className="relative">
              <select
                value={histLimit}
                onChange={(e) => changeLimit(e.target.value)}
                disabled={histLoading}
                className="appearance-none bg-slate-100 dark:bg-[#222222] border border-slate-200 dark:border-[#2e2e2e] rounded-lg px-2.5 py-1 pr-6 text-[11px] font-semibold text-slate-500 dark:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50"
              >
                {[5, 10, 20, 50].map((n) => (
                  <option key={n} value={n}>{n} / page</option>
                ))}
              </select>
              <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          <div dir="ltr" className="flex items-center gap-1 bg-slate-100 dark:bg-[#222222] p-1 rounded-xl">
            <button
              onClick={() => setHistPage((p) => Math.max(1, p - 1))}
              disabled={!hasPrev || histLoading}
              className="p-1.5 hover:bg-white dark:hover:bg-[#2e2e2e] rounded-lg transition disabled:opacity-30 text-slate-500 dark:text-slate-400"
            >
              <ChevronLeft size={15} />
            </button>
            <span className="text-[10px] font-bold px-2 text-slate-500 dark:text-slate-400">
              {histPage}
            </span>
            <button
              onClick={() => setHistPage((p) => p + 1)}
              disabled={!hasNext || histLoading}
              className="p-1.5 hover:bg-white dark:hover:bg-[#2e2e2e] rounded-lg transition disabled:opacity-30 text-slate-500 dark:text-slate-400"
            >
              <ChevronRight size={15} />
            </button>
          </div>
        </div>
      </div>

      {/* ── Warning Modals ── */}
      <WarningModal
        isOpen={!!pendingNegStock}
        onClose={() => setPendingNegStock(null)}
        onConfirm={handleNegStockForce}
        validation={pendingNegStock}
        isLoading={updateNegStock.isPending}
        titleKey="modal.neg_stock_title"
      />
      <WarningModal
        isOpen={!!pendingHour}
        onClose={() => setPendingHour(null)}
        onConfirm={handleHourForce}
        validation={pendingHour}
        isLoading={updateHours.isPending}
        titleKey="modal.hour_title"
      />
    </div>
  );
};
