import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { Clock, Coffee, Coins, Loader2, Save, Building2 } from "lucide-react";
import { toast } from "@/shared/utils/toast";
import { Input } from "@/shared/components/Input";
import { useAuth } from "@/features/auth";
import { isSuperAdmin } from "@/shared/utils/permissions";
import { useSocietes } from "@/features/societes/hooks/useSocietes";
import {
  useAttendanceSettings,
  useUpdateAttendanceSettings,
} from "../hooks/useAttendanceSettings";

const DEFAULT_FORM = {
  morningStart: "09:30",
  morningEnd: "13:30",
  afternoonStart: "14:30",
  afternoonEnd: "18:00",
  blockHours: 1,
  amount: 50,
};

const hmToMin = (value) => {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(String(value || ""));
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
};

const formatDuration = (minutes) => {
  const abs = Math.max(0, Math.round(Number(minutes) || 0));
  const h = Math.floor(abs / 60);
  const m = abs % 60;
  if (h && m) return `${h}h${String(m).padStart(2, "0")}`;
  if (h) return `${h}h`;
  return `${m} min`;
};

const formatMoney = (n) =>
  Number(n || 0).toLocaleString("fr-MA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const SettingsCard = ({ icon: Icon, iconBg, iconColor, title, subtitle, children }) => (
  <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-[#2e2e2e] dark:bg-[#1c1c1c]">
    <div className="flex items-start gap-3 border-b border-slate-100 px-5 py-4 dark:border-[#2e2e2e]">
      <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${iconBg}`}>
        <Icon className={`h-4 w-4 ${iconColor}`} />
      </div>
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-0.5 text-xs text-slate-400">{subtitle}</p>
        )}
      </div>
    </div>
    {children}
  </div>
);

export const AttendanceSettingsPage = () => {
  const { t } = useTranslation("settings");
  const { user } = useAuth();
  const superAdmin = isSuperAdmin(user);
  const { data: listRes, isLoading: listLoading } = useSocietes({
    pageIndex: 0,
    pageSize: 200,
    enabled: superAdmin,
  });
  const societes = listRes?.data ?? [];
  const [selectedId, setSelectedId] = useState(user?.societeId || null);
  const [form, setForm] = useState(DEFAULT_FORM);

  useEffect(() => {
    if (!superAdmin) {
      if (user?.societeId) setSelectedId(user.societeId);
      return;
    }
    if (selectedId == null && societes.length > 0) setSelectedId(societes[0].id);
  }, [superAdmin, societes, selectedId, user?.societeId]);

  const societeId = selectedId ? Number(selectedId) : null;
  const { data, isLoading, isError } = useAttendanceSettings(societeId, {
    enabled: !!societeId,
  });
  const updateMutation = useUpdateAttendanceSettings();

  useEffect(() => {
    const settings = data?.data?.settings;
    if (!settings) return;
    setForm({
      morningStart: settings.morningStart || DEFAULT_FORM.morningStart,
      morningEnd: settings.morningEnd || DEFAULT_FORM.morningEnd,
      afternoonStart: settings.afternoonStart || DEFAULT_FORM.afternoonStart,
      afternoonEnd: settings.afternoonEnd || DEFAULT_FORM.afternoonEnd,
      blockHours: settings.blockHours ?? DEFAULT_FORM.blockHours,
      amount: settings.amount ?? DEFAULT_FORM.amount,
    });
  }, [data]);

  const expectedMinutes = useMemo(() => {
    const mStart = hmToMin(form.morningStart);
    const mEnd = hmToMin(form.morningEnd);
    const aStart = hmToMin(form.afternoonStart);
    const aEnd = hmToMin(form.afternoonEnd);
    if (mStart == null || mEnd == null || aStart == null || aEnd == null) return 0;
    return Math.max(0, mEnd - mStart) + Math.max(0, aEnd - aStart);
  }, [form]);

  const pauseMinutes = useMemo(() => {
    const mEnd = hmToMin(form.morningEnd);
    const aStart = hmToMin(form.afternoonStart);
    if (mEnd == null || aStart == null) return 0;
    return Math.max(0, aStart - mEnd);
  }, [form]);

  const scheduleError = useMemo(() => {
    const mStart = hmToMin(form.morningStart);
    const mEnd = hmToMin(form.morningEnd);
    const aStart = hmToMin(form.afternoonStart);
    const aEnd = hmToMin(form.afternoonEnd);
    if ([mStart, mEnd, aStart, aEnd].some((v) => v == null)) {
      return t("attendance.errors.time");
    }
    if (!(mStart < mEnd && mEnd <= aStart && aStart < aEnd)) {
      return t("attendance.errors.order");
    }
    if (!(Number(form.blockHours) > 0)) return t("attendance.errors.block");
    if (!(Number(form.amount) >= 0)) return t("attendance.errors.amount");
    return null;
  }, [form, t]);

  const setField = (key, value) => setForm((prev) => ({ ...prev, [key]: value }));

  const handleSave = () => {
    if (!societeId || scheduleError) return;
    updateMutation.mutate(
      {
        societeId,
        morningStart: form.morningStart,
        morningEnd: form.morningEnd,
        afternoonStart: form.afternoonStart,
        afternoonEnd: form.afternoonEnd,
        blockHours: Number(form.blockHours),
        amount: Number(form.amount),
      },
      {
        onSuccess: () => toast.success(t("attendance.toast_saved")),
        onError: (err) =>
          toast.error(err?.response?.data?.message || t("attendance.toast_error")),
      },
    );
  };

  if (superAdmin && listLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-6 w-6 animate-spin text-[#B12B89]" />
      </div>
    );
  }

  if (superAdmin && !societes.length) {
    return (
      <div className="rounded-xl border border-slate-200 px-6 py-10 text-center dark:border-[#2e2e2e]">
        <Building2 className="mx-auto h-8 w-8 text-slate-300" />
        <p className="mt-3 text-sm font-semibold">{t("attendance.no_societe_title")}</p>
        <p className="mt-1 text-xs text-slate-500">{t("attendance.no_societe_list")}</p>
      </div>
    );
  }

  if (!societeId) {
    return (
      <div className="rounded-xl border border-slate-200 px-6 py-10 text-center dark:border-[#2e2e2e]">
        <p className="text-sm text-slate-500">{t("attendance.no_societe_title")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            {t("attendance.title")}
          </h2>
          <p className="mt-0.5 text-xs text-slate-400">{t("attendance.subtitle")}</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          {superAdmin && (
            <label className="flex min-w-[200px] flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                {t("attendance.societe_label")}
              </span>
              <select
                value={selectedId ?? ""}
                onChange={(e) => setSelectedId(Number(e.target.value))}
                className="rounded-lg border border-slate-200 bg-transparent px-3 py-2 text-sm font-medium outline-none focus:ring-2 focus:ring-[#B12B89]/15 dark:border-[#2e2e2e]"
              >
                {societes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.raisonSocial || `Société #${s.id}`}
                  </option>
                ))}
              </select>
            </label>
          )}
          <button
            type="button"
            onClick={handleSave}
            disabled={updateMutation.isPending || isLoading || !!scheduleError}
            className="inline-flex h-[38px] items-center gap-1.5 rounded-lg bg-[#B12B89] px-4 text-xs font-semibold text-white hover:brightness-110 disabled:opacity-50"
          >
            {updateMutation.isPending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Save className="h-3.5 w-3.5" />
            )}
            {t("attendance.save")}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="h-6 w-6 animate-spin text-[#B12B89]" />
        </div>
      ) : isError ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-5 py-6 text-center text-sm text-rose-700">
          {t("attendance.load_error")}
        </div>
      ) : (
        <>
          <SettingsCard
            icon={Clock}
            iconBg="bg-blue-50 dark:bg-blue-900/20"
            iconColor="text-blue-500"
            title={t("attendance.hours_title")}
            subtitle={t("attendance.hours_subtitle")}
          >
            <div className="space-y-4 px-5 py-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  type="time"
                  step="60"
                  label={t("attendance.morning_start")}
                  value={form.morningStart}
                  onChange={(e) => setField("morningStart", e.target.value)}
                />
                <Input
                  type="time"
                  step="60"
                  label={t("attendance.morning_end")}
                  value={form.morningEnd}
                  onChange={(e) => setField("morningEnd", e.target.value)}
                />
                <Input
                  type="time"
                  step="60"
                  label={t("attendance.afternoon_start")}
                  value={form.afternoonStart}
                  onChange={(e) => setField("afternoonStart", e.target.value)}
                />
                <Input
                  type="time"
                  step="60"
                  label={t("attendance.afternoon_end")}
                  value={form.afternoonEnd}
                  onChange={(e) => setField("afternoonEnd", e.target.value)}
                />
              </div>

              <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-3 py-2.5 text-xs text-slate-600 dark:bg-[#222222]/60 dark:text-slate-300">
                <span className="font-semibold tabular-nums">{form.morningStart}</span>
                <span className="text-slate-400">→</span>
                <span className="font-semibold tabular-nums">{form.morningEnd}</span>
                <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-300">
                  <Coffee className="h-3 w-3" />
                  {t("attendance.pause")} {formatDuration(pauseMinutes)}
                </span>
                <span className="font-semibold tabular-nums">{form.afternoonStart}</span>
                <span className="text-slate-400">→</span>
                <span className="font-semibold tabular-nums">{form.afternoonEnd}</span>
                <span className="ml-auto font-semibold text-[#B12B89]">
                  {t("attendance.expected_day", { hours: formatDuration(expectedMinutes) })}
                </span>
              </div>
              {scheduleError && (
                <p className="text-xs text-rose-500">{scheduleError}</p>
              )}
            </div>
          </SettingsCard>

          <SettingsCard
            icon={Coins}
            iconBg="bg-emerald-50 dark:bg-emerald-900/20"
            iconColor="text-emerald-600"
            title={t("attendance.amount_title")}
            subtitle={t("attendance.amount_subtitle")}
          >
            <div className="space-y-4 px-5 py-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Input
                  type="number"
                  min="0.25"
                  max="24"
                  step="0.25"
                  label={t("attendance.block_hours")}
                  value={form.blockHours}
                  onChange={(e) => setField("blockHours", e.target.value)}
                />
                <Input
                  type="number"
                  min="0"
                  step="0.5"
                  label={t("attendance.amount")}
                  value={form.amount}
                  onChange={(e) => setField("amount", e.target.value)}
                />
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t("attendance.amount_preview", {
                  hours: Number(form.blockHours) || 0,
                  amount: formatMoney(form.amount),
                })}
              </p>
            </div>
          </SettingsCard>
        </>
      )}
    </div>
  );
};
