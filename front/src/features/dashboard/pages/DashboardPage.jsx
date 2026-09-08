import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ArrowDownRight, ArrowUpRight, ClipboardList, Plus, Scale, Warehouse } from "lucide-react";
import { useAuth } from "@/features/auth";
import { useCurrentUser } from "@/features/users/hooks/useUsers";
import {
  getUserRoleName,
  hasAnyPermission,
  isAdminUser,
  isSuperAdmin as checkSuperAdmin,
  PERMISSIONS,
} from "@/shared/utils/permissions";
import { SaphirWorkflowStats } from "@/features/saphirmanagement/dashboard/components/SaphirWorkflowStats";
import { useDashboardOverview } from "../hooks/useDashboard";
import {
  DashboardDateFilter,
  DEFAULT_PRESET,
  getPresetRange,
} from "../components/DashboardDateFilter";
import { CashflowOverview } from "../components/CashflowOverview";
import { StockValueOverview } from "../components/StockValueOverview";
import { DebtCreditOverview } from "../components/DebtCreditOverview";
import { DashboardRightRail } from "../components/DashboardRightRail";
import { formatMAD } from "../utils/formatMoney";

const FINANCE_HIDDEN_ROLES = new Set(["Livreur", "Preparateur"]);
const CREATE_ROLES = new Set(["super_admin", "societe_admin", "commercial", "gerant"]);

export const DashboardPage = () => {
  const { t } = useTranslation("dashboard");
  const { user } = useAuth();
  const { data: currentUser } = useCurrentUser();
  const isSuperAdmin = checkSuperAdmin(user);
  const isAdmin = isAdminUser(user);
  const roleName = getUserRoleName(user);
  const isOperational = FINANCE_HIDDEN_ROLES.has(roleName) || roleName === "Commercial";

  const showFinance = !FINANCE_HIDDEN_ROLES.has(roleName);
  const showSaphir =
    hasAnyPermission(user, [PERMISSIONS.VIEW_ADVANCED_BL]) || isOperational;
  const showWallets = isSuperAdmin;
  const showCommercials = showSaphir;
  const showPlanning = showSaphir;
  const showRail = showWallets || showCommercials || showPlanning;

  const activeUser = currentUser?.data || {};
  const displayName = activeUser.name || user?.name || t("greeting.default_user");
  const canCreate =
    CREATE_ROLES.has(String(roleName).trim().toLowerCase()) || !!user?.isSuperAdmin;

  const [range, setRange] = useState(() => {
    const [from, to] = getPresetRange(DEFAULT_PRESET);
    return { from, to };
  });

  const dateFrom = range.from?.format("YYYY-MM-DDTHH:mm:ss");
  const dateTo = range.to?.format("YYYY-MM-DDTHH:mm:ss");

  const { data, isLoading } = useDashboardOverview({
    dateFrom,
    dateTo,
    enabled: showFinance || showWallets,
  });

  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? t("greeting.morning")
      : hour < 18
        ? t("greeting.afternoon")
        : t("greeting.evening");

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
      {
        label: t("summary.stock_value"),
        value: data?.stockValue?.total,
        digits: 2,
        icon: Warehouse,
        cls: "text-sky-600 dark:text-sky-400",
        bg: "bg-sky-50 dark:bg-sky-900/20",
      },
    ],
    [data, t],
  );

  return (
    <div className="min-h-screen p-4 transition-colors duration-300 md:p-8">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 md:text-2xl">
            {`${greeting}, ${displayName}`}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t(isAdmin ? "greeting.subtitle" : "greeting.subtitle_personal")}
          </p>
        </div>

        {showSaphir && (
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to="/commandes"
              className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[12px] font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-[#2e2e2e] dark:bg-[#1c1c1c] dark:text-slate-200 dark:hover:bg-[#222222]"
            >
              <ClipboardList className="h-3.5 w-3.5" />
              {t("saphir_home.all_orders")}
            </Link>
            {canCreate && (
              <Link
                to="/commandes/create"
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#B12B89] px-3 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#9a2478]"
              >
                <Plus className="h-3.5 w-3.5" />
                {t("saphir_home.new_order")}
              </Link>
            )}
          </div>
        )}
      </div>

      <div className={`flex flex-col gap-6 ${showRail ? "lg:flex-row lg:items-start lg:gap-6" : ""}`}>
        <div className="min-w-0 flex-1 space-y-6">
          <DashboardDateFilter
            from={range.from}
            to={range.to}
            onChange={(from, to) => setRange({ from, to })}
          />

          {showFinance && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
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
                      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-400">
                        {card.label}
                      </p>
                      <p className={`truncate text-lg font-bold tabular-nums ${card.cls}`}>
                        {isLoading && data == null
                          ? "—"
                          : `${formatMAD(card.value, card.digits ?? 0)} MAD`}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {showSaphir && <SaphirWorkflowStats dateFrom={dateFrom} dateTo={dateTo} />}

          {showWallets && (
            <DebtCreditOverview
              data={data}
              isLoading={isLoading}
              granularity={data?.granularity}
            />
          )}

          {showFinance && (
            <StockValueOverview
              data={data}
              isLoading={isLoading}
              granularity={data?.granularity}
            />
          )}

          {showFinance && (
            <CashflowOverview
              data={data}
              isLoading={isLoading}
              granularity={data?.granularity}
            />
          )}
        </div>

        {showRail && (
          <DashboardRightRail
            dateFrom={dateFrom}
            dateTo={dateTo}
            roleName={roleName}
            showWallets={showWallets}
            showCommercials={showCommercials}
            showPlanning={showPlanning}
          />
        )}
      </div>
    </div>
  );
};
