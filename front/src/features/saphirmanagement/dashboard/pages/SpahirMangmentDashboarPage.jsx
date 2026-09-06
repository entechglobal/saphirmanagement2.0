import { useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ClipboardList, Plus } from "lucide-react";
import { useAuth } from "@/features/auth";
import { useCurrentUser } from "@/features/users/hooks/useUsers";
import {
  DashboardDateFilter,
  DEFAULT_PRESET,
  getPresetRange,
} from "@/features/dashboard/components/DashboardDateFilter";
import { SaphirWorkflowStats } from "../components/SaphirWorkflowStats";
import { PlanningSidebar } from "../components/PlanningSidebar";
import { TopCommercialsSidebar } from "../components/TopCommercialsSidebar";
import { ShiftStatusBanner } from "../../shifts/components/ShiftStatusBanner";

const CREATE_ROLES = new Set([
  "super_admin",
  "societe_admin",
  "commercial",
  "gerant",
]);

export const SpahirMangmentDashboarPage = () => {
  const { t } = useTranslation("dashboard");
  const { user } = useAuth();
  const { data: currentUser } = useCurrentUser();
  const activeUser = currentUser?.data || {};
  const displayName = activeUser.name || user?.name || t("greeting.default_user");
  const roleName = user?.roleName ?? user?.role ?? "";

  const [range, setRange] = useState(() => {
    const [from, to] = getPresetRange(DEFAULT_PRESET);
    return { from, to };
  });

  const dateFrom = range.from?.format("YYYY-MM-DDTHH:mm:ss");
  const dateTo = range.to?.format("YYYY-MM-DDTHH:mm:ss");

  const hour = new Date().getHours();
  const greeting =
    hour < 12
      ? t("greeting.morning")
      : hour < 18
        ? t("greeting.afternoon")
        : t("greeting.evening");

  const canCreate = CREATE_ROLES.has(String(roleName).trim().toLowerCase()) || !!user?.isSuperAdmin;

  return (
    <div className="min-h-screen p-4 md:p-8 transition-colors duration-300">
      <ShiftStatusBanner />
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-[#B12B89]">
            {t("saphir_home.badge")}
          </p>
          <h1 className="mt-1 text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50 md:text-2xl">
            {`${greeting}, ${displayName}`}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {t("saphir_home.subtitle")}
          </p>
        </div>

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
      </div>

      <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:gap-6">
        <div className="min-w-0 flex-1 space-y-5">
          <DashboardDateFilter
            from={range.from}
            to={range.to}
            onChange={(from, to) => setRange({ from, to })}
          />

          <SaphirWorkflowStats dateFrom={dateFrom} dateTo={dateTo} />
        </div>

        <div className="flex w-full shrink-0 flex-col gap-4 xl:w-[340px]">
          <TopCommercialsSidebar dateFrom={dateFrom} dateTo={dateTo} />
          <PlanningSidebar roleName={roleName} />
        </div>
      </div>
    </div>
  );
};
