import { useState, useEffect } from "react";
import {
  ShieldAlert,
  Clock,
  AlertTriangle,
  History,
  Loader2,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
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
import { SelectDropDown } from "@/shared/components/SelectDropDown";
import { FormActions } from "@/shared/components/FormActions";
import { FORM_CONTROL, FORM_LABEL } from "@/shared/components/formStyles";
import { UserExtraRolesCard } from "../components/UserExtraRolesCard";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const HIST_LIMIT = 5;
const END_MINUTES = 59;

const fmtHour = (h, minutes = 0) =>
  `${String(h).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;

const makeHourOptions = (minutes = 0) =>
  Array.from({ length: 24 }, (_, i) => ({
    value: i,
    label: fmtHour(i, minutes),
  }));

const START_HOUR_OPTIONS = makeHourOptions(0);
const END_HOUR_OPTIONS = makeHourOptions(END_MINUTES);

const severityColor = {
  HIGH: "text-red-600 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400",
  MEDIUM:
    "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-400",
  LOW: "text-green-600 bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800 dark:text-green-400",
};

const parseHour = (value) => {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isNaN(n) ? null : n;
};

// ─── Sub-components ───────────────────────────────────────────────────────────

const Toggle = ({ checked, onChange, disabled }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={onChange}
    disabled={disabled}
    className={`relative h-6 w-11 rounded-full transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#B12B89]/40 ${
      checked ? "bg-[#B12B89]" : "bg-slate-200 dark:bg-[#2e2e2e]"
    } ${disabled ? "cursor-not-allowed opacity-40" : "cursor-pointer"}`}
  >
    <span
      className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${
        checked ? "translate-x-5" : "translate-x-0"
      }`}
    />
  </button>
);

const SettingsCard = ({ icon: Icon, iconBg, iconColor, title, action, children }) => (
  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-[#2e2e2e] dark:bg-[#1c1c1c]">
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 dark:border-[#2e2e2e]">
      <div className="flex min-w-0 items-center gap-3">
        <div
          className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${iconBg}`}
        >
          <Icon className={`h-4 w-4 ${iconColor}`} />
        </div>
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {title}
        </h2>
      </div>
      {action}
    </div>
    {children}
  </div>
);

const ReasonInput = ({ value, onChange }) => {
  const { t } = useTranslation("system-settings");
  return (
    <div>
      <label className={FORM_LABEL}>{t("form.reason_label")}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={2}
        placeholder={t("form.reason_placeholder")}
        className={`${FORM_CONTROL} h-auto min-h-[72px] resize-none py-2`}
      />
    </div>
  );
};

const SaveRow = ({ onCancel, onSave, isPending }) => {
  const { t } = useTranslation("system-settings");
  return (
    <FormActions
      placement="inline"
      bordered
      onCancel={onCancel}
      onSubmit={() => onSave()}
      submitType="button"
      isLoading={isPending}
      cancelLabel={t("form.cancel")}
      submitLabel={isPending ? t("form.saving") : t("form.save")}
    />
  );
};

const ValueBadge = ({ value, settingName, muted }) => {
  const { t } = useTranslation("system-settings");

  let display;
  if (value === null || value === undefined) display = t("value.null_value");
  else if (settingName === "allowNegativeStock")
    display = value ? t("value.enabled") : t("value.disabled");
  else if (settingName === "systemEndHour") display = fmtHour(value, END_MINUTES);
  else display = fmtHour(value);

  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
        muted
          ? "bg-slate-100 text-slate-400 dark:bg-[#222222]"
          : value === true
            ? "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
            : value === false
              ? "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
              : "bg-[#B12B89]/10 text-[#B12B89]"
      }`}
    >
      {display}
    </span>
  );
};

// ─── Warning Confirmation Modal ───────────────────────────────────────────────

const WarningModal = ({
  isOpen,
  onClose,
  onConfirm,
  validation,
  isLoading,
  titleKey,
}) => {
  const { t } = useTranslation("system-settings");
  const warnings = validation?.warnings ?? [];
  const impacts = validation?.impacts ?? [];

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
            className="rounded-xl border border-slate-200 px-6 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50 dark:border-[#2e2e2e] dark:text-slate-300 dark:hover:bg-[#222222]"
          >
            {t("modal.cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="flex items-center gap-2 rounded-xl bg-amber-500 px-7 py-2.5 text-sm font-bold text-white shadow-lg shadow-amber-200 transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:opacity-50 dark:shadow-none"
          >
            {isLoading ? (
              <>
                <Loader2 size={15} className="animate-spin" />{" "}
                {t("modal.processing")}
              </>
            ) : (
              t("modal.force_update")
            )}
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
              <div
                key={i}
                className={`rounded-xl border p-3 text-sm ${severityColor[w.severity] ?? severityColor.MEDIUM}`}
              >
                <div className="flex items-start gap-2">
                  <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="font-semibold">{w.message}</p>
                    {w.action && (
                      <p className="text-xs opacity-80">{w.action}</p>
                    )}
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
              <div
                key={i}
                className="rounded-xl border border-slate-200 bg-slate-50 p-3 dark:border-[#2e2e2e] dark:bg-[#222222]/50"
              >
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {imp.module}
                </p>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                  {imp.impact}
                </p>
              </div>
            ))}
          </div>
        )}

        <p className="pt-1 text-sm text-slate-500 dark:text-slate-400">
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

  const [histPage, setHistPage] = useState(1);
  const [histLimit, setHistLimit] = useState(HIST_LIMIT);
  const [histFilter, setHistFilter] = useState("all");

  const histParams = {
    limit: histLimit,
    page: histPage,
    ...(histFilter !== "all" && { settingName: histFilter }),
  };
  const { data: historyResp, isLoading: histLoading } =
    useSettingsHistory(histParams);

  const updateNegStock = useUpdateAllowNegativeStock();
  const updateHours = useUpdateHourRange();

  const [negStock, setNegStock] = useState(null);
  const [negStockReason, setNegStockReason] = useState("");
  const [negStockDirty, setNegStockDirty] = useState(false);
  const [pendingNegStock, setPendingNegStock] = useState(null);

  const [hourMode, setHourMode] = useState("none");
  const [startHour, setStartHour] = useState(8);
  const [endHour, setEndHour] = useState(18);
  const [hourReason, setHourReason] = useState("");
  const [hourDirty, setHourDirty] = useState(false);
  const [pendingHour, setPendingHour] = useState(null);

  useEffect(() => {
    if (data?.settings && negStock === null) {
      const { allowNegativeStock, systemStartHour, systemEndHour } =
        data.settings;
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

  const handleNegStockSave = async (forceUpdate = false) => {
    try {
      const res = await updateNegStock.mutateAsync({
        allowNegativeStock: negStock,
        reason: negStockReason || undefined,
        forceUpdate,
      });
      if (res.requiresConfirmation) {
        setPendingNegStock(res.data?.validation);
        return;
      }
      if (res.success) {
        toast.success(
          res.data?.changed === false
            ? t("toast.already_up_to_date")
            : t("toast.setting_updated"),
        );
        setNegStockDirty(false);
        setNegStockReason("");
      }
    } catch {
      toast.error(t("toast.error"));
    }
  };

  const handleNegStockForce = async () => {
    await handleNegStockSave(true);
    setPendingNegStock(null);
  };

  const cancelNegStock = () => {
    setNegStock(data?.settings?.allowNegativeStock ?? false);
    setNegStockDirty(false);
    setNegStockReason("");
  };

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
      if (res.requiresConfirmation) {
        setPendingHour(res.data?.validation);
        return;
      }
      if (res.success) {
        toast.success(
          res.data?.changed === false
            ? t("toast.already_up_to_date")
            : t("toast.hour_updated"),
        );
        setHourDirty(false);
        setHourReason("");
      }
    } catch {
      toast.error(t("toast.error"));
    }
  };

  const handleHourForce = async () => {
    await handleHourSave(true);
    setPendingHour(null);
  };

  const cancelHour = () => {
    const { systemStartHour, systemEndHour } = data?.settings ?? {};
    setHourMode(systemStartHour === null ? "none" : "custom");
    if (systemStartHour !== null) {
      setStartHour(systemStartHour);
      setEndHour(systemEndHour);
    }
    setHourDirty(false);
    setHourReason("");
  };

  const hourPreview = () => {
    if (hourMode === "none") return t("hour_range.preview_none");
    const duration =
      startHour === endHour
        ? 24
        : startHour < endHour
          ? endHour - startHour
          : 24 - startHour + endHour;
    return t("hour_range.preview_range", {
      start: fmtHour(startHour),
      end: fmtHour(endHour, END_MINUTES),
      duration,
    });
  };

  const history = historyResp?.data ?? [];
  const hasNext = history.length === histLimit;
  const hasPrev = histPage > 1;

  const changeFilter = (val) => {
    setHistFilter(val);
    setHistPage(1);
  };
  const changeLimit = (val) => {
    setHistLimit(Number(val));
    setHistPage(1);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[#B12B89]" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => refetch()}
          disabled={isFetching}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-3 text-[13px] font-semibold text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-50 dark:border-[#2e2e2e] dark:text-slate-300 dark:hover:bg-[#222222]"
        >
          <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          {t("refresh")}
        </button>
      </div>

      <SettingsCard
        icon={ShieldAlert}
        iconBg="bg-red-50 dark:bg-red-900/20"
        iconColor="text-red-500"
        title={t("neg_stock.title")}
      >
        <div className="flex items-center justify-between gap-4 px-5 py-4">
          <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
            {t("neg_stock.allow_label")}
          </p>
          <div className="flex items-center gap-3">
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-semibold ${
                negStock
                  ? "bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400"
                  : "bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400"
              }`}
            >
              {negStock ? t("neg_stock.enabled") : t("neg_stock.disabled")}
            </span>
            <Toggle
              checked={!!negStock}
              onChange={() => {
                setNegStock((v) => !v);
                setNegStockDirty(true);
              }}
            />
          </div>
        </div>

        {negStockDirty && (
          <div className="space-y-4 border-t border-slate-100 px-5 py-4 dark:border-[#2e2e2e]">
            <ReasonInput value={negStockReason} onChange={setNegStockReason} />
            <SaveRow
              onCancel={cancelNegStock}
              onSave={() => handleNegStockSave(false)}
              isPending={updateNegStock.isPending}
            />
          </div>
        )}
      </SettingsCard>

      <SettingsCard
        icon={Clock}
        iconBg="bg-blue-50 dark:bg-blue-900/20"
        iconColor="text-blue-500"
        title={t("hour_range.title")}
      >
        <div className="space-y-4 px-5 py-4">
          <div className="inline-flex items-center gap-0.5 rounded-xl bg-slate-100 p-1 dark:bg-[#222222]">
            {[
              { id: "none", labelKey: "hour_range.mode_none", icon: Infinity },
              { id: "custom", labelKey: "hour_range.mode_custom", icon: Clock },
            ].map(({ id, labelKey, icon: Icon }) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setHourMode(id);
                  setHourDirty(true);
                }}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  hourMode === id
                    ? "bg-white text-[#B12B89] shadow-sm dark:bg-[#2e2e2e]"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                <Icon size={13} />
                {t(labelKey)}
              </button>
            ))}
          </div>

          {hourMode === "custom" && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <SelectDropDown
                label={t("hour_range.start")}
                value={startHour}
                options={START_HOUR_OPTIONS}
                onChange={(e) => {
                  const next = parseHour(e.target.value);
                  if (next === null) return;
                  setStartHour(next);
                  setHourDirty(true);
                }}
              />
              <SelectDropDown
                label={t("hour_range.end")}
                value={endHour}
                options={END_HOUR_OPTIONS}
                onChange={(e) => {
                  const next = parseHour(e.target.value);
                  if (next === null) return;
                  setEndHour(next);
                  setHourDirty(true);
                }}
              />
            </div>
          )}

          <p className="text-xs text-slate-500 dark:text-slate-400">
            {hourPreview()}
          </p>

          {hourDirty && (
            <div className="space-y-4">
              <ReasonInput value={hourReason} onChange={setHourReason} />
              <SaveRow
                onCancel={cancelHour}
                onSave={() => handleHourSave(false)}
                isPending={updateHours.isPending}
              />
            </div>
          )}
        </div>
      </SettingsCard>

      <UserExtraRolesCard />

      <SettingsCard
        icon={History}
        iconBg="bg-slate-100 dark:bg-[#222222]"
        iconColor="text-slate-500"
        title={t("history.title")}
        action={
          <select
            value={histFilter}
            onChange={(e) => changeFilter(e.target.value)}
            className="rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-[#B12B89]/15 dark:border-[#2e2e2e]"
          >
            <option value="all">{t("history.filter_all")}</option>
            <option value="allowNegativeStock">
              {t("history.filter_neg_stock")}
            </option>
            <option value="systemStartHour">
              {t("history.filter_start_hour")}
            </option>
            <option value="systemEndHour">
              {t("history.filter_end_hour")}
            </option>
          </select>
        }
      >
        {histLoading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-[#B12B89]" />
          </div>
        ) : history.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <History className="mx-auto h-8 w-8 text-slate-300" />
            <p className="mt-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
              {t("history.empty")}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-start">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 dark:border-[#2e2e2e] dark:bg-[#1c1c1c]">
                  <th className="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 dark:text-slate-400">
                    {t("history.col_setting")}
                  </th>
                  <th className="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 dark:text-slate-400">
                    {t("history.col_change")}
                  </th>
                  <th className="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 dark:text-slate-400">
                    {t("history.col_user")}
                  </th>
                  <th className="px-3.5 py-2.5 text-left text-[11px] font-semibold uppercase tracking-[0.05em] text-slate-500 dark:text-slate-400">
                    {t("history.col_date")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {history.map((entry) => (
                  <tr
                    key={entry.id}
                    className="border-b border-slate-100 last:border-b-0 dark:border-[#2e2e2e]"
                  >
                    <td className="whitespace-nowrap px-3.5 py-3">
                      <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 dark:bg-[#222222] dark:text-slate-400">
                        {t(`setting_label.${entry.settingName}`, {
                          defaultValue: entry.settingName,
                        })}
                      </span>
                    </td>
                    <td className="px-3.5 py-3">
                      <div className="flex items-center gap-1.5">
                        <ValueBadge
                          value={entry.oldValue}
                          settingName={entry.settingName}
                          muted
                        />
                        {isRTL ? (
                          <ArrowLeft size={11} className="text-slate-300" />
                        ) : (
                          <ArrowRight size={11} className="text-slate-300" />
                        )}
                        <ValueBadge
                          value={entry.newValue}
                          settingName={entry.settingName}
                        />
                      </div>
                      {entry.reason && (
                        <p className="mt-1 max-w-[220px] truncate text-[11px] italic text-slate-400">
                          &ldquo;{entry.reason}&rdquo;
                        </p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-3 text-[13px] font-medium text-slate-700 dark:text-slate-200">
                      {entry.changedBy?.name ?? "—"}
                    </td>
                    <td className="whitespace-nowrap px-3.5 py-3 text-[12px] text-slate-500 dark:text-slate-400">
                      {dayjs(entry.changedAt).format("DD/MM/YYYY HH:mm")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-3 py-2 dark:border-[#2e2e2e]">
          <p className="text-[12px] text-slate-500 dark:text-slate-400">
            {history.length > 0
              ? t("history.results", {
                  from: (histPage - 1) * histLimit + 1,
                  to: (histPage - 1) * histLimit + history.length,
                })
              : t("history.no_results")}
          </p>
          <div className="ms-auto flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-[12px] text-slate-500 dark:text-slate-400">
              <select
                value={histLimit}
                onChange={(e) => changeLimit(e.target.value)}
                disabled={histLoading}
                className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[12px] text-slate-700 outline-none focus:border-[#B12B89] disabled:opacity-50 dark:border-[#2e2e2e] dark:bg-[#1c1c1c] dark:text-slate-200"
              >
                {[5, 10, 20, 50].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex items-center gap-0.5">
              <button
                type="button"
                onClick={() => setHistPage((p) => Math.max(1, p - 1))}
                disabled={!hasPrev || histLoading}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:pointer-events-none disabled:opacity-35 dark:text-slate-400 dark:hover:bg-[#222] dark:hover:text-slate-100"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="min-w-[1.5rem] text-center text-[12px] font-semibold text-slate-500 dark:text-slate-400">
                {histPage}
              </span>
              <button
                type="button"
                onClick={() => setHistPage((p) => p + 1)}
                disabled={!hasNext || histLoading}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 disabled:pointer-events-none disabled:opacity-35 dark:text-slate-400 dark:hover:bg-[#222] dark:hover:text-slate-100"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </SettingsCard>

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
