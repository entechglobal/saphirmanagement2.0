import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { FormDatePicker } from "@/shared/FormDatePicker";

const startOfWeek = (d) => {
  const day = d.day();
  const diff = day === 0 ? 6 : day - 1;
  return d.subtract(diff, "day").startOf("day");
};

export const DATE_PRESETS = [
  {
    id: "today",
    range: () => [dayjs().startOf("day"), dayjs().endOf("day")],
  },
  {
    id: "yesterday",
    range: () => [
      dayjs().subtract(1, "day").startOf("day"),
      dayjs().subtract(1, "day").endOf("day"),
    ],
  },
  {
    id: "this_week",
    range: () => [startOfWeek(dayjs()), dayjs().endOf("day")],
  },
  {
    id: "last_week",
    range: () => {
      const start = startOfWeek(dayjs()).subtract(7, "day");
      return [start, start.add(6, "day").endOf("day")];
    },
  },
  {
    id: "this_month",
    range: () => [dayjs().startOf("month"), dayjs().endOf("day")],
  },
  {
    id: "last_month",
    range: () => [
      dayjs().subtract(1, "month").startOf("month"),
      dayjs().subtract(1, "month").endOf("month"),
    ],
  },
  {
    id: "this_year",
    range: () => [dayjs().startOf("year"), dayjs().endOf("day")],
  },
];

export const DEFAULT_PRESET = "this_month";

export const getPresetRange = (id) => {
  const preset = DATE_PRESETS.find((p) => p.id === id) ?? DATE_PRESETS.find((p) => p.id === DEFAULT_PRESET);
  return preset.range();
};

const isSameRange = (from, to, range) =>
  from?.isValid() &&
  to?.isValid() &&
  from.isSame(range[0], "day") &&
  to.isSame(range[1], "day");

const formatRangeLabel = (from, to) => {
  if (!from?.isValid() || !to?.isValid()) return "";
  const sameDay = from.isSame(to, "day");
  const fmt = (d) => d.format("D MMM YYYY");
  return sameDay ? fmt(from) : `${fmt(from)} — ${fmt(to)}`;
};

export const DashboardDateFilter = ({ from, to, onChange }) => {
  const { t } = useTranslation("dashboard");
  const [customOpen, setCustomOpen] = useState(false);

  const matchedPreset = useMemo(() => {
    const match = DATE_PRESETS.find((p) => isSameRange(from, to, p.range()));
    return match?.id ?? "custom";
  }, [from, to]);

  const activePreset = customOpen ? "custom" : matchedPreset;
  const rangeLabel = formatRangeLabel(from, to);

  const applyPreset = (id) => {
    setCustomOpen(false);
    const [start, end] = getPresetRange(id);
    onChange(start, end);
  };

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-800 sm:p-4">
   
      <div className="flex flex-wrap items-center gap-1.5">
        {DATE_PRESETS.map((preset) => {
          const active = activePreset === preset.id;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPreset(preset.id)}
              className={`h-8 rounded-lg px-3 text-[12px] font-semibold transition-all ${
                active
                  ? "bg-[#B12B89] text-white shadow-sm"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
              }`}
            >
              {t(`period.${preset.id}`)}
            </button>
          );
        })}
        <button
          type="button"
          onClick={() => setCustomOpen(true)}
          className={`h-8 rounded-lg px-3 text-[12px] font-semibold transition-all ${
            activePreset === "custom"
              ? "bg-[#B12B89] text-white shadow-sm"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600"
          }`}
        >
          {t("period.custom")}
        </button>
      </div>

      {activePreset === "custom" && (
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <FormDatePicker
            label={t("date_from")}
            name="dateFrom"
            value={from?.format("YYYY-MM-DD") ?? ""}
            onChange={(e) => {
              const next = e.target.value ? dayjs(e.target.value).startOf("day") : from;
              const end = to && next && to.isBefore(next) ? next.endOf("day") : to;
              onChange(next, end);
            }}
          />
          <FormDatePicker
            label={t("date_to")}
            name="dateTo"
            value={to?.format("YYYY-MM-DD") ?? ""}
            onChange={(e) => {
              const next = e.target.value ? dayjs(e.target.value).endOf("day") : to;
              const start = from && next && next.isBefore(from) ? next.startOf("day") : from;
              onChange(start, next);
            }}
          />
        </div>
      )}
    </div>
  );
};
