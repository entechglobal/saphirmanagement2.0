import { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import { ArrowDownRight, ArrowUpRight, Scale } from "lucide-react";
import { useAuth } from "@/features/auth";
import { isSuperAdmin as checkSuperAdmin } from "@/shared/utils/permissions";
import { HeaderTable } from "@/shared/components/HeaderTable";
import { useDashboardOverview } from "../hooks/useDashboard";
import {
  DashboardDateFilter,
  DEFAULT_PRESET,
  getPresetRange,
} from "../components/DashboardDateFilter";
import { PartnerChartsSection, formatMAD } from "../components/PartnerChartsSection";
import { WalletsSidebar } from "../components/WalletsSidebar";

export const DashboardPage = () => {
  const { t } = useTranslation("dashboard");
  const { user } = useAuth();
  const isSuperAdmin = checkSuperAdmin(user);

  const [range, setRange] = useState(() => {
    const [from, to] = getPresetRange(DEFAULT_PRESET);
    return { from, to };
  });

  const dateFrom = range.from?.format("YYYY-MM-DDTHH:mm:ss");
  const dateTo = range.to?.format("YYYY-MM-DDTHH:mm:ss");

  const { data, isLoading } = useDashboardOverview({ dateFrom, dateTo });

  const summaryCards = useMemo(
    () => [
      {
        label: t("summary.income"),
        value: data?.clients?.totals?.collected,
        icon: ArrowUpRight,
        cls: "text-emerald-600 dark:text-emerald-400",
        bg: "bg-emerald-50 dark:bg-emerald-900/20",
      },
      {
        label: t("summary.expense"),
        value: data?.fournisseurs?.totals?.collected,
        icon: ArrowDownRight,
        cls: "text-amber-600 dark:text-amber-400",
        bg: "bg-amber-50 dark:bg-amber-900/20",
      },
      {
        label: t("summary.net"),
        value: data?.net,
        icon: Scale,
        cls:
          (data?.net ?? 0) >= 0
            ? "text-[#B12B89]"
            : "text-red-600 dark:text-red-400",
        bg: "bg-fuchsia-50 dark:bg-fuchsia-900/20",
      },
    ],
    [data, t],
  );

  return (
    <div className="p-4 md:p-8 min-h-screen transition-colors duration-300">
      <HeaderTable title={t("home_title")} />

      <div className={`flex flex-col gap-6 ${isSuperAdmin ? "lg:flex-row lg:items-start lg:gap-6" : ""}`}>
        <div className="min-w-0 flex-1 space-y-6">
          <DashboardDateFilter
            from={range.from}
            to={range.to}
            onChange={(from, to) => setRange({ from, to })}
          />

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            {summaryCards.map((card) => {
              const Icon = card.icon;
              return (
                <div
                  key={card.label}
                  className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 dark:border-[#2e2e2e] dark:bg-[#1c1c1c]"
                >
                  <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${card.bg}`}>
                    <Icon className={`h-5 w-5 ${card.cls}`} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{card.label}</p>
                    <p className={`truncate text-lg font-bold tabular-nums ${card.cls}`}>
                      {isLoading && data == null ? "—" : `${formatMAD(card.value)} MAD`}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          <PartnerChartsSection
            variant="clients"
            data={data?.clients}
            isLoading={isLoading}
            granularity={data?.granularity}
          />

          <PartnerChartsSection
            variant="fournisseurs"
            data={data?.fournisseurs}
            isLoading={isLoading}
            granularity={data?.granularity}
          />
        </div>

        {isSuperAdmin && <WalletsSidebar />}
      </div>
    </div>
  );
};
