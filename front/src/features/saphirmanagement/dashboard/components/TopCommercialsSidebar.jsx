import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Crown, ShoppingBag, Trophy, Users } from "lucide-react";
import { useTopCommercials } from "../../commandes/hooks/useCommands";

const PREVIEW_LIMIT = 3;

const fmt = (n) =>
  Number(n || 0).toLocaleString("fr-MA", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

export const TopCommercialsSidebar = ({ dateFrom, dateTo, embedded = false }) => {
  const { t } = useTranslation("dashboard");
  const { data, isLoading, isError } = useTopCommercials({
    dateFrom,
    dateTo,
    limit: 5,
  });
  const [showAll, setShowAll] = useState(false);

  const payload = data?.data ?? data ?? {};
  const commercials = payload.commercials ?? [];
  const summary = payload.summary ?? {};
  const hidden = commercials.length - PREVIEW_LIMIT;
  const visible = showAll ? commercials : commercials.slice(0, PREVIEW_LIMIT);

  const body = (
    <>
      <div className="mb-3 grid grid-cols-2 gap-2">
        <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-[#222222]">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            {t("saphir_top_commercials.orders")}
          </p>
          <p className="mt-0.5 text-sm font-bold text-slate-800 dark:text-slate-100">
            {summary.orderCount ?? 0}
          </p>
        </div>
        <div className="rounded-xl bg-fuchsia-50/80 px-3 py-2 dark:bg-fuchsia-900/10">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#B12B89]/80">
            {t("saphir_top_commercials.commission")}
          </p>
          <p className="mt-0.5 text-sm font-bold text-[#B12B89]">
            {fmt(summary.totalCommission)} MAD
          </p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2 py-2">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-12 animate-pulse rounded-xl bg-slate-100 dark:bg-[#222222]"
            />
          ))}
        </div>
      ) : isError ? (
        <p className="py-6 text-center text-xs text-red-500">
          {t("saphir_top_commercials.error")}
        </p>
      ) : commercials.length === 0 ? (
        <div className="flex flex-col items-center py-8 text-center opacity-50">
          <Users className="mb-2 h-8 w-8 text-slate-400" />
          <p className="text-xs font-semibold text-slate-500">
            {t("saphir_top_commercials.empty")}
          </p>
        </div>
      ) : (
        <>
          <ul className="space-y-1.5">
            {visible.map((c, idx) => (
              <li
                key={c.id}
                className="flex items-center gap-2.5 rounded-xl px-2.5 py-2 transition hover:bg-slate-50 dark:hover:bg-[#222222]"
              >
                <div
                  className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[11px] font-black ${
                    idx === 0
                      ? "bg-[#B12B89] text-white"
                      : "bg-slate-100 text-slate-500 dark:bg-[#2a2a2a] dark:text-slate-300"
                  }`}
                >
                  {idx === 0 ? <Crown className="h-3.5 w-3.5" /> : idx + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                    {c.name}
                  </p>
                  <p className="flex items-center gap-1 text-[10px] text-slate-400">
                    <ShoppingBag className="h-3 w-3" />
                    {t("saphir_top_commercials.order_count", {
                      count: c.orderCount,
                    })}
                  </p>
                </div>
                <p className="shrink-0 text-[12px] font-bold tabular-nums text-[#B12B89]">
                  {fmt(c.totalCommission)}
                </p>
              </li>
            ))}
          </ul>
          {hidden > 0 && (
            <button
              type="button"
              onClick={() => setShowAll((v) => !v)}
              className="mt-1.5 w-full rounded-lg px-2 py-1.5 text-start text-[11px] font-semibold text-[#B12B89] hover:bg-[#B12B89]/5"
            >
              {showAll
                ? t("right_rail.see_less")
                : t("right_rail.see_more_count", { count: hidden })}
            </button>
          )}
        </>
      )}
    </>
  );

  if (embedded) return <div>{body}</div>;

  return (
    <div className="w-full overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-[#2e2e2e] dark:bg-[#1c1c1c]">
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3 dark:border-[#2e2e2e]">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-fuchsia-50 dark:bg-fuchsia-900/20">
            <Trophy className="h-4 w-4 text-[#B12B89]" />
          </div>
          <div>
            <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">
              {t("saphir_top_commercials.title")}
            </p>
            <p className="text-[10px] text-slate-400">
              {t("saphir_top_commercials.subtitle")}
            </p>
          </div>
        </div>
        <Link
          to="/statistiques-commerciaux"
          className="text-[11px] font-semibold text-[#B12B89] hover:underline"
        >
          {t("saphir_top_commercials.see_all")}
        </Link>
      </div>
      <div className="px-4 py-3">{body}</div>
    </div>
  );
};
