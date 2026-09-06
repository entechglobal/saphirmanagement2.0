import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  ClipboardDocumentCheckIcon,
  ArchiveBoxArrowDownIcon,
  TruckIcon,
  MapPinIcon,
  CheckBadgeIcon,
} from "@heroicons/react/24/outline";
import { Package } from "lucide-react";
import { useWorkflowCounts } from "../../commandes/hooks/useCommands";

const CARD_ORDER = ["aPreparer", "aCollecter", "enRoute", "aLivrer", "aPayer"];

const CARD_META = {
  aPreparer: {
    titleKey: "saphir_stats.a_preparer",
    hintKey: "saphir_stats.hint_preparer",
    icon: CheckBadgeIcon,
    accent: "#1F72FF",
    border: "border-l-[#1F72FF] dark:border-l-[#3D8BFF]",
    bg: "bg-blue-50/80 dark:bg-blue-950/30",
  },
  aCollecter: {
    titleKey: "saphir_stats.a_collecter",
    hintKey: "saphir_stats.hint_collecter",
    icon: ClipboardDocumentCheckIcon,
    accent: "#6B44FF",
    border: "border-l-[#6B44FF] dark:border-l-[#8B6FFF]",
    bg: "bg-violet-50/80 dark:bg-violet-950/30",
  },
  enRoute: {
    titleKey: "saphir_stats.en_route",
    hintKey: "saphir_stats.hint_en_route",
    icon: ArchiveBoxArrowDownIcon,
    accent: "#FF3D8A",
    border: "border-l-[#FF3D8A] dark:border-l-[#FF5EA0]",
    bg: "bg-pink-50/80 dark:bg-pink-950/30",
  },
  aLivrer: {
    titleKey: "saphir_stats.a_livrer",
    hintKey: "saphir_stats.hint_livrer",
    icon: TruckIcon,
    accent: "#F5BC00",
    border: "border-l-[#F5BC00] dark:border-l-[#FFCC00]",
    bg: "bg-amber-50/80 dark:bg-amber-950/30",
  },
  aPayer: {
    titleKey: "saphir_stats.a_payer",
    hintKey: "saphir_stats.hint_payer",
    icon: MapPinIcon,
    accent: "#38C41A",
    border: "border-l-[#38C41A] dark:border-l-[#4ECC2A]",
    bg: "bg-emerald-50/80 dark:bg-emerald-950/30",
  },
};

const CARD_TO_STATUS = {
  aPreparer: "CONFIRME",
  aCollecter: "PREPARE",
  enRoute: "COLLECTE",
  aLivrer: "EN_ROUTE",
  aPayer: "LIVRE",
};

export const SaphirWorkflowStats = ({ dateFrom, dateTo }) => {
  const navigate = useNavigate();
  const { t } = useTranslation("dashboard");
  const { data, isLoading, isFetching } = useWorkflowCounts({ dateFrom, dateTo });
  const counts = data?.data ?? {};

  // Respect backend role scoping: only render keys the API returns
  const visibleKeys = CARD_ORDER.filter((key) => counts[key] !== undefined);
  const total = Number(counts.total ?? 0);
  const pipelineTotal = visibleKeys.reduce(
    (sum, key) => sum + Number(counts[key] ?? 0),
    0,
  );

  const handleCardClick = (cardKey) => {
    const status = CARD_TO_STATUS[cardKey];
    if (status) {
      navigate(`/saphir-management-dashboard/commandes-par-statut?status=${status}`);
    }
  };

  if (isLoading && !data) {
    return (
      <div className="space-y-4">
        <div className="h-20 animate-pulse rounded-xl bg-slate-100 dark:bg-[#222222]" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-xl bg-slate-100 dark:bg-[#222222]"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`space-y-4 transition-opacity ${isFetching ? "opacity-80" : ""}`}>
      {/* Period summary */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3.5 dark:border-[#2e2e2e] dark:bg-[#1c1c1c]">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[#B12B89]/10">
          <Package className="h-5 w-5 text-[#B12B89]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {t("saphir_stats.total_period")}
          </p>
          <p className="text-2xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-slate-50">
            {total.toLocaleString()}
          </p>
        </div>
        <div className="rounded-lg bg-slate-50 px-3 py-2 text-end dark:bg-[#222222]">
          <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
            {t("saphir_stats.in_pipeline")}
          </p>
          <p className="text-sm font-bold tabular-nums text-slate-700 dark:text-slate-200">
            {pipelineTotal.toLocaleString()}
          </p>
        </div>
      </div>

      {visibleKeys.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-400 dark:border-[#2e2e2e]">
          {t("saphir_stats.empty")}
        </div>
      ) : (
        <div
          className={`grid grid-cols-1 gap-3 sm:grid-cols-2 ${
            visibleKeys.length >= 4 ? "xl:grid-cols-3" : "xl:grid-cols-2"
          } ${visibleKeys.length === 1 ? "sm:grid-cols-1 xl:grid-cols-1 max-w-md" : ""}`}
        >
          {visibleKeys.map((key) => {
            const meta = CARD_META[key];
            const Icon = meta.icon;
            const value = Number(counts[key] ?? 0);

            return (
              <button
                key={key}
                type="button"
                onClick={() => handleCardClick(key)}
                className={`
                  group relative overflow-hidden rounded-xl border border-slate-200
                  border-l-[5px] bg-white p-4 text-start shadow-sm
                  transition-all duration-200
                  hover:-translate-y-0.5 hover:shadow-md
                  active:scale-[0.98]
                  dark:border-[#2e2e2e] dark:bg-[#1c1c1c]
                  ${meta.border}
                `}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                      {t(meta.titleKey)}
                    </p>
                    <p className="mt-1.5 text-3xl font-bold tabular-nums tracking-tight text-slate-900 dark:text-slate-50">
                      {value.toLocaleString()}
                    </p>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {t(meta.hintKey)}
                    </p>
                  </div>
                  <div
                    className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${meta.bg}`}
                  >
                    <Icon
                      className="h-5 w-5"
                      style={{ color: meta.accent }}
                      strokeWidth={1.5}
                    />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
