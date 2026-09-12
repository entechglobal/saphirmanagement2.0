import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { CalendarDays } from "lucide-react";
import { usePlanningLivraison } from "../../plannings/hooks/usePlanningLivraison";
import {
  parseDayKey,
  PlanningMiniCalendar,
} from "../../plannings/components/PlanningMiniCalendar";

export const PlanningSidebar = ({ embedded = false }) => {
  const { t } = useTranslation("dashboard");
  const { t: tp } = useTranslation("plannings");
  const navigate = useNavigate();
  const [calMonth, setCalMonth] = useState(() => dayjs());

  const startDate = calMonth.startOf("month").format("YYYY-MM-DD");
  const endDate = calMonth.endOf("month").format("YYYY-MM-DD");

  const { data, isLoading } = usePlanningLivraison({ startDate, endDate });
  const planningData = data?.data ?? [];

  const openDay = (key) => {
    const parsed = parseDayKey(key);
    if (!parsed?.isValid()) return;
    navigate(`/planning-livraison?date=${parsed.format("YYYY-MM-DD")}`);
  };

  const body = (
    <div className={embedded ? "px-0.5 py-0.5" : "overflow-y-auto px-3 py-3"}>
      {isLoading ? (
        <div className="grid grid-cols-7 gap-1 px-1 py-2">
          {Array.from({ length: 28 }).map((_, i) => (
            <div
              key={i}
              className="mx-auto h-7 w-7 animate-pulse rounded-full bg-slate-200 dark:bg-[#2e2e2e]"
            />
          ))}
        </div>
      ) : (
        <PlanningMiniCalendar
          planningData={planningData}
          calMonth={calMonth}
          setCalMonth={setCalMonth}
          onDayClick={(key) => openDay(key)}
          enableAllMonthDays
          compact
          showLegend={false}
          clickHint={tp("hover_open")}
        />
      )}
      <p className="mt-1 px-1 text-[10px] leading-relaxed text-slate-400">
        {t("saphir_planning.hover_hint")}
      </p>
    </div>
  );

  if (embedded) return body;

  return (
    <aside className="flex w-full shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-[#2e2e2e] dark:bg-[#1c1c1c] xl:sticky xl:top-8 xl:max-h-[calc(100vh-4rem)]">
      <div className="border-b border-slate-100 px-4 py-3 dark:border-[#2e2e2e]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-[#B12B89]" />
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-50">
              {t("saphir_planning.title")}
            </h2>
          </div>
          <Link
            to="/planning-livraison"
            className="text-[11px] font-semibold text-[#B12B89] hover:underline"
          >
            {t("saphir_planning.see_all")}
          </Link>
        </div>
      </div>
      {body}
    </aside>
  );
};
