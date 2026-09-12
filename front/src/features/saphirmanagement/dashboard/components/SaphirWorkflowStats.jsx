import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  BadgeCheck,
  CheckCircle2,
  ClipboardCheck,
  Package,
  PackageCheck,
  Truck,
  Wallet,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/features/auth";
import { getUserRoleName, isSuperAdmin } from "@/shared/utils/permissions";
import { useWorkflowCounts } from "../../commandes/hooks/useCommands";

const CARD_ORDER = ["aPreparer", "aCollecter", "enRoute", "aLivrer", "aPayer"];
const SUPER_ADMIN_CARD_ORDER = [
  "aPreparer",
  "aCollecter",
  "enRoute",
  "aLivrer",
  "livre",
  "paye",
];
const LIVREUR_CARD_ORDER = ["aCollecter", "enRoute", "aLivrer", "aPayer"];
const PREPARATEUR_CARD_ORDER = ["aPreparer"];

const CARD_META = {
  aPreparer: {
    titleKey: "saphir_stats.a_preparer",
    hintKey: "saphir_stats.hint_preparer",
    icon: Package,
    accent: "#B12B89",
  },
  aCollecter: {
    titleKey: "saphir_stats.a_collecter",
    hintKey: "saphir_stats.hint_collecter",
    icon: ClipboardCheck,
    accent: "#7C5CFC",
  },
  enRoute: {
    titleKey: "saphir_stats.en_route",
    hintKey: "saphir_stats.hint_en_route",
    icon: PackageCheck,
    accent: "#2563EB",
  },
  aLivrer: {
    titleKey: "saphir_stats.a_livrer",
    hintKey: "saphir_stats.hint_livrer",
    icon: Truck,
    accent: "#D97706",
  },
  aPayer: {
    titleKey: "saphir_stats.a_payer",
    hintKey: "saphir_stats.hint_payer",
    icon: Wallet,
    accent: "#059669",
  },
  livre: {
    titleKey: "saphir_stats.livre",
    hintKey: "saphir_stats.hint_livre",
    icon: CheckCircle2,
    accent: "#059669",
  },
  paye: {
    titleKey: "saphir_stats.paye",
    hintKey: "saphir_stats.hint_paye",
    icon: BadgeCheck,
    accent: "#0F766E",
  },
};

const CARD_TO_STATUS = {
  aPreparer: "CONFIRME",
  aCollecter: "PREPARE",
  enRoute: "COLLECTE",
  aLivrer: "EN_ROUTE",
  aPayer: "LIVRE",
  livre: "LIVRE",
  paye: "PAYE",
};

const hexToRgba = (hex, alpha) => {
  const h = hex.replace("#", "");
  const n = parseInt(h, 16);
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
};

export const SaphirWorkflowStats = ({ dateFrom, dateTo }) => {
  const navigate = useNavigate();
  const { t } = useTranslation("dashboard");
  const { user } = useAuth();
  const superAdmin = isSuperAdmin(user);
  const role = getUserRoleName(user).trim().toLowerCase();
  const { data, isLoading, isFetching } = useWorkflowCounts({ dateFrom, dateTo });
  const counts = data?.data ?? {};

  const cardOrder = superAdmin
    ? SUPER_ADMIN_CARD_ORDER
    : role === "livreur"
      ? LIVREUR_CARD_ORDER
      : role === "preparateur"
        ? PREPARATEUR_CARD_ORDER
        : CARD_ORDER;
  const visibleKeys = cardOrder;
  const total = Number(counts.total ?? 0);
  const pipelineTotal = ["aPreparer", "aCollecter", "enRoute", "aLivrer", "aPayer"].reduce(
    (sum, key) => sum + Number(counts[key] ?? 0),
    0,
  );

  const handleCardClick = (cardKey) => {
    const status = CARD_TO_STATUS[cardKey];
    if (!status) return;
    const opsRole = role === "livreur" || role === "preparateur";
    navigate(opsRole ? `/commandes-ops?status=${status}` : `/commandes?status=${status}`);
  };

  if (isLoading && !data) {
    return (
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-[#2e2e2e] dark:bg-[#1c1c1c]">
        <div className="h-14 animate-pulse bg-slate-50 dark:bg-[#222222]" />
        <div className={`grid grid-cols-1 gap-px bg-slate-100 dark:bg-[#2e2e2e] md:grid-cols-3 ${superAdmin ? "xl:grid-cols-6" : "xl:grid-cols-5"}`}>
          {Array.from({ length: superAdmin ? 6 : 5 }).map((_, i) => (
            <div key={i} className="h-14 animate-pulse bg-white dark:bg-[#1c1c1c] md:h-28" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div
      className={`overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-[#2e2e2e] dark:bg-[#1c1c1c] transition-opacity ${
        isFetching ? "opacity-80" : ""
      }`}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#B12B89]/10">
          <Package className="h-4 w-4 text-[#B12B89]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-slate-800 dark:text-slate-100">
            {t("saphir_stats.total_period")}
          </p>
          <p className="text-[11px] text-slate-400">
            {t("saphir_stats.in_pipeline")} · {pipelineTotal.toLocaleString()}
          </p>
        </div>
        <p className="text-xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-slate-50">
          {total.toLocaleString()}
        </p>
      </div>

      <div
        className={`grid gap-px border-t border-slate-100 bg-slate-100 dark:border-[#2e2e2e] dark:bg-[#2e2e2e] ${
          visibleKeys.length <= 2
            ? "grid-cols-1 md:grid-cols-2"
            : visibleKeys.length >= 6
              ? "grid-cols-1 md:grid-cols-3 xl:grid-cols-6"
              : "grid-cols-1 md:grid-cols-3 xl:grid-cols-5"
        }`}
      >
        {visibleKeys.map((key) => {
            const meta = CARD_META[key];
            const Icon = meta.icon;
            const value = Number(counts[key] ?? 0);
            const share = pipelineTotal > 0 ? (value / pipelineTotal) * 100 : 0;
            const idle = value === 0;

            return (
              <button
                key={key}
                type="button"
                onClick={() => handleCardClick(key)}
                title={t(meta.hintKey)}
                className="group flex items-center gap-3 bg-white px-4 py-3 text-start transition-colors hover:bg-slate-50 active:bg-slate-100 dark:bg-[#1c1c1c] dark:hover:bg-[#222222] dark:active:bg-[#262626] md:flex-col md:items-stretch md:gap-0 md:px-3.5 md:py-3.5"
              >
                <div className="flex items-center justify-between md:mb-3">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-full"
                    style={{ backgroundColor: hexToRgba(meta.accent, idle ? 0.08 : 0.14) }}
                  >
                    <Icon
                      className="h-4 w-4"
                      style={{ color: idle ? "#94a3b8" : meta.accent }}
                      strokeWidth={1.75}
                    />
                  </div>
                  <ChevronRight className="hidden h-3.5 w-3.5 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 md:block dark:text-slate-600" />
                </div>

                <p className="min-w-0 flex-1 truncate text-[13px] font-medium text-slate-600 dark:text-slate-300 md:order-3 md:mt-0.5 md:flex-none md:text-[12px] md:text-slate-500 md:dark:text-slate-400">
                  {t(meta.titleKey)}
                </p>

                <p
                  className={`text-[15px] font-bold tabular-nums tracking-tight md:order-2 md:text-2xl ${
                    idle
                      ? "text-slate-300 dark:text-slate-600"
                      : "text-slate-900 dark:text-slate-50"
                  }`}
                >
                  {value.toLocaleString()}
                </p>

                <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 md:hidden dark:text-slate-600" />

                <div className="mt-2.5 hidden h-1 overflow-hidden rounded-full bg-slate-100 md:order-4 md:block dark:bg-[#2a2a2a]">
                  <div
                    className="h-full rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.max(idle ? 0 : 6, share)}%`,
                      backgroundColor: idle ? "transparent" : meta.accent,
                    }}
                  />
                </div>
              </button>
            );
          })}
      </div>
    </div>
  );
};
