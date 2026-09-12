import { useMemo, useState } from "react";
import { createPortal } from "react-dom";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { formatWithLocale } from "@/shared/lib/localizedDayjs";
import { ChevronLeft, ChevronRight, MapPin, Package, Truck } from "lucide-react";

const BRAND_COLOR = "#B12B89";
const POPOVER_WIDTH = 252;

export const toDayKey = (d) => d.format("DD/MM/YYYY");

export const parseDayKey = (dateStr) => {
  if (!dateStr || typeof dateStr !== "string") return null;
  const [dd, mm, yyyy] = dateStr.split("/");
  if (!dd || !mm || !yyyy) return null;
  return dayjs(`${yyyy}-${mm}-${dd}`);
};

const summarizeDay = (orders = []) => {
  const cities = [];
  const citySet = new Set();
  const livreurs = [];
  const livreurSet = new Set();
  let colis = 0;

  for (const order of orders) {
    colis += Number(order.nombreDeColis || 0);
    const city = (order.ville || "").trim();
    if (city && !citySet.has(city)) {
      citySet.add(city);
      cities.push(city);
    }
    const livreur = (order.livreurName || "").trim();
    const key = order.livreurId ?? livreur;
    if (livreur && !livreurSet.has(key)) {
      livreurSet.add(key);
      livreurs.push(livreur);
    }
  }

  return {
    count: orders.length,
    colis,
    cities,
    livreurs,
    clients: orders.slice(0, 3),
  };
};

const DayHoverPopover = ({ hover, t, clickHint }) => {
  if (!hover?.rect) return null;

  const { rect, orders, dateLabel } = hover;
  const summary = summarizeDay(orders);
  const estimatedHeight = summary.count > 0 ? 168 : 88;
  const spaceAbove = rect.top;
  const spaceBelow = window.innerHeight - rect.bottom;
  const showAbove = spaceAbove > estimatedHeight + 12 || spaceAbove > spaceBelow;

  let left = rect.left + rect.width / 2 - POPOVER_WIDTH / 2;
  left = Math.max(8, Math.min(left, window.innerWidth - POPOVER_WIDTH - 8));
  const top = showAbove ? rect.top - 8 : rect.bottom + 8;

  return createPortal(
    <div
      role="tooltip"
      className="pointer-events-none fixed z-[80] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-[#3a3a3a] dark:bg-[#1c1c1c]"
      style={{
        width: POPOVER_WIDTH,
        left,
        top,
        transform: showAbove ? "translateY(-100%)" : undefined,
      }}
    >
      <div className="border-b border-slate-100 px-3 py-2 dark:border-[#2e2e2e]">
        <p className="text-[12px] font-bold capitalize text-slate-800 dark:text-slate-100">
          {dateLabel}
        </p>
        <p className="text-[11px] text-slate-400">
          {summary.count > 0
            ? `${t("delivery_count", { count: summary.count })} · ${t("bl_colis", { count: summary.colis })}`
            : t("no_delivery")}
        </p>
      </div>

      {summary.count > 0 && (
        <div className="space-y-2 px-3 py-2">
          {summary.cities.length > 0 && (
            <div>
              <p className="mb-1 flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                <MapPin className="h-3 w-3" />
                {t("detail_ville")}
              </p>
              <div className="flex flex-wrap gap-1">
                {summary.cities.slice(0, 4).map((city) => (
                  <span
                    key={city}
                    className="rounded-md bg-slate-50 px-1.5 py-0.5 text-[10px] font-medium text-slate-600 ring-1 ring-slate-200 dark:bg-[#222222] dark:text-slate-300 dark:ring-[#3a3a3a]"
                  >
                    {city}
                  </span>
                ))}
                {summary.cities.length > 4 && (
                  <span className="text-[10px] font-medium text-slate-400">
                    +{summary.cities.length - 4}
                  </span>
                )}
              </div>
            </div>
          )}

          {summary.livreurs.length > 0 && (
            <p className="flex items-start gap-1 text-[11px] text-slate-600 dark:text-slate-300">
              <Truck className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
              <span className="min-w-0 truncate">
                {summary.livreurs.slice(0, 3).join(", ")}
                {summary.livreurs.length > 3 ? ` +${summary.livreurs.length - 3}` : ""}
              </span>
            </p>
          )}

          <div className="space-y-0.5">
            {summary.clients.map((order) => (
              <p
                key={order.id}
                className="flex items-center gap-1.5 truncate text-[11px] text-slate-700 dark:text-slate-200"
              >
                <Package className="h-3 w-3 shrink-0 text-slate-400" />
                <span className="truncate font-medium">{order.clientName || "—"}</span>
                {order.ville && (
                  <span className="truncate text-slate-400">{order.ville}</span>
                )}
              </p>
            ))}
            {summary.count > 3 && (
              <p className="ps-4 text-[10px] font-medium text-slate-400">
                +{summary.count - 3}
              </p>
            )}
          </div>
        </div>
      )}

      {clickHint && (
        <p className="border-t border-slate-100 px-3 py-1.5 text-[10px] font-semibold text-[#B12B89] dark:border-[#2e2e2e]">
          {clickHint}
        </p>
      )}
    </div>,
    document.body,
  );
};

export const PlanningMiniCalendar = ({
  planningData,
  calMonth,
  setCalMonth,
  selectedDay,
  onDayClick,
  enableAllMonthDays = false,
  compact = false,
  showLegend = true,
  clickHint,
}) => {
  const { t, i18n } = useTranslation("plannings");
  const [hover, setHover] = useState(null);

  const dayInfoMap = useMemo(() => {
    const m = {};
    planningData?.forEach(({ date, advancedBonLivraisons }) => {
      m[date] = {
        count: advancedBonLivraisons?.length ?? 0,
        orders: advancedBonLivraisons ?? [],
        inRange: true,
      };
    });
    return m;
  }, [planningData]);

  const startOfMonth = calMonth.startOf("month");
  const daysInMonth = calMonth.daysInMonth();
  const firstDow = startOfMonth.day();
  const blanks = Array.from({ length: firstDow });
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const fmtKey = (d) =>
    `${String(d).padStart(2, "0")}/${String(calMonth.month() + 1).padStart(2, "0")}/${calMonth.year()}`;

  const isSelected = (d) => selectedDay === fmtKey(d);
  const isToday = (d) =>
    dayjs().date() === d &&
    dayjs().month() === calMonth.month() &&
    dayjs().year() === calMonth.year();

  const formatHoverLabel = (key) => {
    const parsed = parseDayKey(key);
    if (!parsed?.isValid()) return key;
    if (parsed.isSame(dayjs(), "day")) return t("today_badge");
    if (parsed.isSame(dayjs().add(1, "day"), "day")) return t("tomorrow_badge");
    return formatWithLocale(parsed, "dddd D MMM", i18n.language);
  };

  const cellSize = compact
    ? "h-7 w-7 text-[10px] sm:h-8 sm:w-8 sm:text-[11px]"
    : "h-8 w-8 text-[11px] sm:h-9 sm:w-9 sm:text-[13px] md:h-10 md:w-10";

  return (
    <div
      className={`overflow-hidden bg-white dark:bg-[#1c1c1c] ${
        compact
          ? "rounded-xl"
          : "rounded-2xl border border-slate-200 shadow-sm dark:border-[#2e2e2e]"
      }`}
    >
      <div
        className={`flex items-center justify-between ${
          compact ? "px-1 py-1.5" : "border-b border-slate-100 px-3 py-3 dark:border-[#2e2e2e] sm:px-4"
        }`}
      >
        <button
          type="button"
          onClick={() => setCalMonth((m) => m.subtract(1, "month"))}
          className="flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-slate-100 dark:hover:bg-[#222222]"
        >
          <ChevronLeft size={compact ? 14 : 16} className="text-slate-500" />
        </button>
        <p className={`font-bold capitalize text-slate-700 dark:text-slate-200 ${compact ? "text-[12px]" : "text-sm"}`}>
          {formatWithLocale(calMonth, "MMMM YYYY", i18n.language)}
        </p>
        <button
          type="button"
          onClick={() => setCalMonth((m) => m.add(1, "month"))}
          className="flex h-7 w-7 items-center justify-center rounded-lg transition hover:bg-slate-100 dark:hover:bg-[#222222]"
        >
          <ChevronRight size={compact ? 14 : 16} className="text-slate-500" />
        </button>
      </div>

      <div className={`grid grid-cols-7 ${compact ? "px-0.5 pb-0.5 pt-1" : "px-2 pb-1 pt-3 sm:px-4"}`}>
        {[t("day_sun"), t("day_mon"), t("day_tue"), t("day_wed"), t("day_thu"), t("day_fri"), t("day_sat")].map(
          (d) => (
            <div
              key={d}
              className={`py-1 text-center font-bold uppercase tracking-wider text-slate-400 ${
                compact ? "text-[8px]" : "text-[9px] sm:text-[10px]"
              }`}
            >
              {d}
            </div>
          ),
        )}
      </div>

      <div
        className={`grid grid-cols-7 gap-0.5 ${compact ? "px-0.5 pb-1 pt-0.5" : "px-2 pb-3 pt-2 sm:px-4 sm:pb-4"}`}
        onMouseLeave={() => setHover(null)}
      >
        {blanks.map((_, i) => (
          <div key={`b${i}`} />
        ))}
        {days.map((d) => {
          const key = fmtKey(d);
          const info = dayInfoMap[key];
          const count = info?.count ?? 0;
          const inRange = enableAllMonthDays || (info?.inRange ?? false);
          const hasDeliveries = count > 0;
          const selected = isSelected(d);
          const today = isToday(d);

          return (
            <button
              key={d}
              type="button"
              onClick={() => inRange && onDayClick?.(key, { inRange, selected, count })}
              onMouseEnter={(e) => {
                if (!inRange) return;
                setHover({
                  key,
                  rect: e.currentTarget.getBoundingClientRect(),
                  orders: info?.orders ?? [],
                  dateLabel: formatHoverLabel(key),
                });
              }}
              disabled={!inRange}
              aria-label={`${d}${hasDeliveries ? `, ${count}` : ""}`}
              className={[
                "relative mx-auto flex items-center justify-center rounded-full font-semibold transition-all",
                cellSize,
                selected
                  ? "text-white shadow-md"
                  : hasDeliveries
                    ? "text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
                    : inRange
                      ? "text-slate-800 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-[#222222]"
                      : "cursor-default text-slate-300 dark:text-slate-700",
                today && !selected ? "ring-2 ring-[#B12B89]/50" : "",
              ].join(" ")}
              style={selected ? { backgroundColor: BRAND_COLOR } : {}}
            >
              {hasDeliveries && !selected && (
                <span className="absolute inset-0 rounded-full bg-emerald-500 opacity-10" />
              )}
              <span className="relative z-10">{d}</span>
              {hasDeliveries && (
                <span
                  className={[
                    "absolute flex items-center justify-center rounded-full px-0.5 font-bold leading-none shadow-sm",
                    compact
                      ? "-right-0.5 -top-0.5 h-3 min-w-[12px] text-[7px]"
                      : "-right-0.5 -top-1 h-3.5 min-w-[14px] text-[8px] sm:-right-1 sm:h-4 sm:min-w-[16px] sm:px-1 sm:text-[9px]",
                    selected ? "bg-white text-[#B12B89]" : "bg-emerald-500 text-white",
                  ].join(" ")}
                >
                  {count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {showLegend && (
        <div className={`flex flex-wrap items-center gap-x-3 gap-y-1.5 ${compact ? "px-1 pb-1 pt-0.5" : "px-3 pb-3 pt-1 sm:px-4 sm:pb-4"}`}>
          <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-400" />
            {t("legend_with_deliveries")}
          </span>
          <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
            <span className="h-2 w-2 shrink-0 rounded-full bg-slate-300 dark:bg-[#2e2e2e]" />
            {t("legend_without")}
          </span>
          {!enableAllMonthDays && (
            <span className="flex items-center gap-1.5 text-[10px] text-slate-300 dark:text-slate-700">
              <span className="h-2 w-2 shrink-0 rounded-full bg-slate-200 dark:bg-[#222222]" />
              {t("legend_out_of_range")}
            </span>
          )}
        </div>
      )}

      <DayHoverPopover hover={hover} t={t} clickHint={clickHint} />
    </div>
  );
};
