import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { CalendarDays, ChevronDown, Trophy, Wallet } from "lucide-react";
import { WalletsSidebar } from "./WalletsSidebar";
import { formatMAD } from "../utils/formatMoney";
import { useDashboardWallets } from "../hooks/useDashboard";
import { TopCommercialsSidebar } from "@/features/saphirmanagement/dashboard/components/TopCommercialsSidebar";
import { PlanningSidebar } from "@/features/saphirmanagement/dashboard/components/PlanningSidebar";
import { useTopCommercials } from "@/features/saphirmanagement/commandes/hooks/useCommands";
import { usePlanningLivraison } from "@/features/saphirmanagement/plannings/hooks/usePlanningLivraison";

const parseDayKey = (dateStr) => {
  if (!dateStr || typeof dateStr !== "string") return null;
  const [dd, mm, yyyy] = dateStr.split("/");
  if (!dd || !mm || !yyyy) return null;
  return dayjs(`${yyyy}-${mm}-${dd}`);
};

const AccordionSection = ({
  id,
  icon: Icon,
  title,
  preview,
  extra,
  open,
  onToggle,
  locked = false,
  children,
}) => (
  <div className={`flex min-h-0 flex-col ${open ? "flex-1" : "shrink-0"}`}>
    <div className="flex items-center gap-1 pe-3">
      <button
        type="button"
        onClick={() => !locked && onToggle(id)}
        aria-expanded={open}
        className="flex min-w-0 flex-1 items-center gap-2.5 px-4 py-3 text-start transition hover:bg-slate-50 dark:hover:bg-[#222222]"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#B12B89]/10">
          <Icon className="h-4 w-4 text-[#B12B89]" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold text-slate-800 dark:text-slate-100">{title}</p>
          {!open && preview && (
            <p className="truncate text-[11px] text-slate-400">{preview}</p>
          )}
        </div>
        {!locked && (
          <ChevronDown
            className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        )}
      </button>
      {extra}
    </div>
    {open && (
      <div className="min-h-0 flex-1 overflow-y-auto border-t border-slate-100 px-3 pb-3 pt-2 dark:border-[#2e2e2e]">
        {children}
      </div>
    )}
  </div>
);

export const DashboardRightRail = ({
  dateFrom,
  dateTo,
  roleName,
  showWallets,
  showCommercials,
  showPlanning,
}) => {
  const { t } = useTranslation("dashboard");
  const normalizedRole = String(roleName ?? "").trim().toLowerCase();

  const defaultOpen = showWallets
    ? "wallets"
    : normalizedRole === "livreur" || normalizedRole === "preparateur"
      ? "planning"
      : showCommercials
        ? "commercials"
        : showPlanning
          ? "planning"
          : null;

  const [open, setOpen] = useState(defaultOpen);

  const { data: wallets } = useDashboardWallets({ enabled: showWallets });
  const { data: commercialsData } = useTopCommercials({
    dateFrom,
    dateTo,
    limit: 5,
    enabled: showCommercials,
  });
  const todayKey = dayjs().format("YYYY-MM-DD");
  const tomorrowKey = dayjs().add(1, "day").format("YYYY-MM-DD");
  const { data: planningData } = usePlanningLivraison({
    startDate: todayKey,
    endDate: tomorrowKey,
    enabled: showPlanning,
  });

  const walletPreview = showWallets
    ? `${formatMAD(wallets?.totals?.grand, 2)} MAD`
    : "";

  const commercialsPayload = commercialsData?.data ?? commercialsData ?? {};
  const commercialsPreview = showCommercials
    ? t("right_rail.commercials_preview", {
        count: commercialsPayload.summary?.orderCount ?? 0,
        amount: formatMAD(commercialsPayload.summary?.totalCommission, 0),
      })
    : "";

  const todayCount = useMemo(() => {
    if (!showPlanning) return 0;
    const days = planningData?.data ?? [];
    const today = dayjs(todayKey);
    const key = today.format("DD/MM/YYYY");
    const match =
      days.find((row) => row.date === key) ??
      days.find((row) => parseDayKey(row.date)?.isSame(today, "day"));
    return match?.advancedBonLivraisons?.length ?? 0;
  }, [planningData, showPlanning, todayKey]);

  const visibleCount = [showWallets, showCommercials, showPlanning].filter(Boolean).length;
  const locked = visibleCount === 1;
  const toggle = (id) => {
    if (locked) return;
    setOpen((cur) => (cur === id ? null : id));
  };

  if (!visibleCount) return null;

  return (
    <aside className="flex w-full shrink-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-[#2e2e2e] dark:bg-[#1c1c1c] xl:sticky xl:top-8 xl:max-h-[calc(100vh-4rem)] xl:w-[340px]">
      {showWallets && (
        <div className="border-b border-slate-100 last:border-b-0 dark:border-[#2e2e2e]">
          <AccordionSection
            id="wallets"
            icon={Wallet}
            title={t("wallets_panel.title")}
            preview={walletPreview}
            extra={
              <Link
                to="/caisse-users"
                className="shrink-0 text-[11px] font-semibold text-[#B12B89] hover:underline"
              >
                {t("wallets_panel.see_all")}
              </Link>
            }
            open={open === "wallets"}
            onToggle={toggle}
            locked={locked}
          >
            <WalletsSidebar embedded />
          </AccordionSection>
        </div>
      )}

      {showCommercials && (
        <div className="border-b border-slate-100 last:border-b-0 dark:border-[#2e2e2e]">
          <AccordionSection
            id="commercials"
            icon={Trophy}
            title={t("saphir_top_commercials.title")}
            preview={commercialsPreview}
            extra={
              <Link
                to="/statistiques-commerciaux"
                className="shrink-0 text-[11px] font-semibold text-[#B12B89] hover:underline"
              >
                {t("saphir_top_commercials.see_all")}
              </Link>
            }
            open={open === "commercials"}
            onToggle={toggle}
            locked={locked}
          >
            <TopCommercialsSidebar dateFrom={dateFrom} dateTo={dateTo} embedded />
          </AccordionSection>
        </div>
      )}

      {showPlanning && (
        <div className="last:border-b-0">
          <AccordionSection
            id="planning"
            icon={CalendarDays}
            title={t("saphir_planning.title")}
            preview={t("right_rail.today_count", { count: todayCount })}
            extra={
              <Link
                to="/planning-livraison"
                className="shrink-0 text-[11px] font-semibold text-[#B12B89] hover:underline"
              >
                {t("saphir_planning.see_all")}
              </Link>
            }
            open={open === "planning"}
            onToggle={toggle}
            locked={locked}
          >
            <PlanningSidebar roleName={roleName} embedded />
          </AccordionSection>
        </div>
      )}
    </aside>
  );
};
