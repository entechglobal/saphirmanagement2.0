import React, { useEffect, useMemo, useState } from "react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Package,
  Truck,
  Calendar,
  Phone,
  MapPin,
  Clock,
  CreditCard,
  User,
  ChevronDown,
  ChevronUp,
  Hash,
  ClipboardList,
  MessageCircle,
  Search,
} from "lucide-react";
import { FiltersBar } from "../../../../shared/components/FiltersBar";
import {
  DashboardDateFilter,
  getPresetRange,
} from "@/features/dashboard/components/DashboardDateFilter";
import { usePlanningLivraison } from "../hooks/usePlanningLivraison";
import {
  parseDayKey,
  PlanningMiniCalendar,
  toDayKey,
} from "../components/PlanningMiniCalendar";
import { useDeliveriesList as useDeliveries } from "../../../stracture/delivries/hooks/useDeliveries";
import { useAuth } from "../../../auth/hooks/useAuth";
import { getUserRoleName } from "../../../../shared/utils/permissions";
import { SectionLoader } from "../../../../shared/components/loadersCollections/SectionLoader";
import { HeaderTable } from "../../../../shared/components/HeaderTable";
import { formatWithLocale } from "@/shared/lib/localizedDayjs";

const BRAND_COLOR = "#B12B89";

const STATUS_MAP = {
  CONFIRME: {
    labelKey: "status_label_CONFIRME",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-400",
  },
  PREPARE: {
    labelKey: "status_label_PREPARE",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  COLLECTE: {
    labelKey: "status_label_COLLECTE",
    bg: "bg-violet-50 dark:bg-violet-950/40",
    text: "text-violet-700 dark:text-violet-400",
    dot: "bg-violet-500",
  },
  EN_ROUTE: {
    labelKey: "status_label_EN_ROUTE",
    bg: "bg-indigo-50 dark:bg-indigo-950/40",
    text: "text-indigo-700 dark:text-indigo-400",
    dot: "bg-indigo-500",
  },
  LIVRE: {
    labelKey: "status_label_LIVRE",
    bg: "bg-green-50 dark:bg-green-950/40",
    text: "text-green-700 dark:text-green-400",
    dot: "bg-green-500",
  },
  PAYE: {
    labelKey: "status_label_PAYE",
    bg: "bg-teal-50 dark:bg-teal-950/40",
    text: "text-teal-700 dark:text-teal-400",
    dot: "bg-teal-500",
  },
  ANNULE: {
    labelKey: "status_label_ANNULE",
    bg: "bg-red-50 dark:bg-red-950/40",
    text: "text-red-700 dark:text-red-400",
    dot: "bg-red-500",
  },
};

const STATUS_FILTER_VALUES = [
  "CONFIRME",
  "PREPARE",
  "COLLECTE",
  "EN_ROUTE",
  "LIVRE",
  "PAYE",
  "ANNULE",
];

const PLANNING_PRESET = "this_week";

const readDateParam = (value) => {
  if (!value) return null;
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed : null;
};

const fmtMad = (n) =>
  Number(n ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-3 dark:border-[#2e2e2e] dark:bg-[#1c1c1c] sm:px-4">
    <div
      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
      style={{ backgroundColor: `${color}18` }}
    >
      <Icon size={16} style={{ color }} />
    </div>
    <div className="min-w-0">
      <p className="text-[11px] font-medium text-slate-400 leading-none">{label}</p>
      <p className="mt-1 truncate text-base font-bold tabular-nums text-slate-800 dark:text-slate-100 sm:text-lg">
        {value ?? "—"}
      </p>
    </div>
  </div>
);

const BLCard = ({ bl }) => {
  const { t } = useTranslation("plannings");
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState(false);
  const whatsappRaw = (bl.whatsapp ?? bl.telephone ?? "").toString();
  const cleanedWhatsapp = whatsappRaw.replace(/\D/g, "");
  const normalizedWhatsapp = cleanedWhatsapp.startsWith("0")
    ? `212${cleanedWhatsapp.slice(1)}`
    : cleanedWhatsapp;
  const whatsappUrl = normalizedWhatsapp ? `https://wa.me/${normalizedWhatsapp}` : null;

  const statusCfg = STATUS_MAP[bl.commandStatus] ?? {
    labelKey: null,
    bg: "bg-slate-50 dark:bg-[#222222]",
    text: "text-slate-600 dark:text-slate-300",
    dot: "bg-slate-400",
  };
  const status = {
    ...statusCfg,
    label: statusCfg.labelKey ? t(statusCfg.labelKey) : bl.commandStatus,
  };

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-[#2e2e2e] dark:bg-[#1c1c1c]">
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition hover:bg-slate-50 dark:hover:bg-[#222222]/60"
      >
        <span className={`h-2 w-2 shrink-0 rounded-full ${status.dot}`} />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
            {bl.clientName}
          </p>
          <p className="truncate text-[11px] text-slate-400">
            {[bl.documentNumber, bl.ville, bl.livreurName].filter(Boolean).join(" · ")}
          </p>
        </div>

        <span className={`hidden shrink-0 items-center gap-1 rounded-md px-2 py-0.5 text-[10px] font-semibold sm:inline-flex ${status.bg} ${status.text}`}>
          <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
          {status.label}
        </span>

        {bl.heureLivraison && (
          <span className="hidden shrink-0 items-center gap-1 text-[11px] text-slate-400 sm:flex">
            <Clock size={11} />
            {bl.heureLivraison}
          </span>
        )}

        <span className="shrink-0 rounded-md bg-[#B12B89]/10 px-2 py-0.5 text-[11px] font-bold text-[#B12B89]">
          {t("bl_colis", { count: bl.nombreDeColis })}
        </span>

        <span className="shrink-0 text-slate-400">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {expanded && (
        <div className="grid grid-cols-1 gap-x-4 gap-y-2.5 border-t border-slate-100 px-4 pb-4 pt-3 dark:border-[#2e2e2e] sm:grid-cols-2">
          <DetailRow icon={Hash} label={t("detail_document")} value={bl.documentNumber} />
          <DetailRow icon={User} label={t("detail_created_by")} value={bl.createdBy ?? "—"} />
          <DetailRow icon={Truck} label={t("detail_livreur")} value={bl.livreurName ?? "—"} />
          {bl.telephone && (
            <DetailRow icon={Phone} label={t("detail_telephone")} value={bl.telephone} />
          )}
          {(bl.whatsapp || bl.telephone) && (
            <DetailRow
              icon={MessageCircle}
              label={t("detail_whatsapp")}
              value={bl.whatsapp ?? bl.telephone}
              href={whatsappUrl}
            />
          )}
          {bl.ville && <DetailRow icon={MapPin} label={t("detail_ville")} value={bl.ville} />}
          {bl.localisation && (
            <DetailRow icon={MapPin} label={t("detail_localisation")} value={bl.localisation} full />
          )}
          <DetailRow
            icon={CreditCard}
            label={t("detail_reglement")}
            value={t(`mode_${bl.modeReglement}`, bl.modeReglement)}
          />
          <DetailRow
            icon={Package}
            label={t("detail_montant")}
            value={bl.amountDue != null ? `${fmtMad(bl.amountDue)} MAD` : "—"}
          />
          {bl.observation && (
            <DetailRow
              icon={ClipboardList}
              label={t("detail_notes")}
              value={bl.observation}
              full
              isNotes
            />
          )}
          {bl.reste != null && bl.reste > 0 && (
            <DetailRow
              icon={Package}
              label={t("detail_reste")}
              value={`${fmtMad(bl.reste)} MAD`}
            />
          )}

          <div className="col-span-2 flex flex-wrap items-center gap-2 pt-1">
            <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold ${status.bg} ${status.text}`}>
              <span className={`h-1.5 w-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>
            {bl.isReported && (
              <span className="inline-flex items-center rounded-lg bg-orange-50 px-2.5 py-1 text-[11px] font-semibold text-orange-600 dark:bg-orange-950/40 dark:text-orange-400">
                {t("badge_reported")}
              </span>
            )}
            {bl.isSuspended && (
              <span className="inline-flex items-center rounded-lg bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-600 dark:bg-red-950/40 dark:text-red-400">
                {t("badge_suspended")}
              </span>
            )}
            {bl.agenceName && (
              <span className="inline-flex items-center rounded-lg bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-slate-600 dark:bg-[#222222] dark:text-slate-300">
                {bl.agenceName}
              </span>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/commandes/${bl.id}`);
              }}
              className="ms-auto inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-[11px] font-semibold text-[#B12B89] transition hover:bg-slate-50 dark:border-[#2e2e2e] dark:hover:bg-[#222222]"
            >
              <ClipboardList size={12} />
              {t("open_details")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const DetailRow = ({ icon: Icon, label, value, full, href, isNotes }) => (
  <div className={`flex items-start gap-2 ${full ? "col-span-2" : ""}`}>
    <Icon size={13} className="mt-0.5 shrink-0 text-slate-400" />
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      {isNotes ? (
        <p className="max-h-28 overflow-y-auto whitespace-pre-wrap break-words rounded-xl border border-amber-100 bg-amber-50 px-2.5 py-2 text-[12px] font-semibold leading-relaxed text-slate-700 dark:border-amber-800/60 dark:bg-amber-900/30 dark:text-slate-100">
          {value ?? "—"}
        </p>
      ) : href && value ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="break-words text-[12px] font-semibold text-emerald-600 hover:underline dark:text-emerald-400"
        >
          {value}
        </a>
      ) : (
        <p className="break-words text-[12px] font-semibold text-slate-700 dark:text-slate-200">
          {value ?? "—"}
        </p>
      )}
    </div>
  </div>
);

export const PlanningLivraisonPage = () => {
  const { t, i18n } = useTranslation("plannings");
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const roleName = getUserRoleName(user);
  const canFilterByLivreur =
    !!user?.isSuperAdmin || ["Societe_Admin", "Gerant"].includes(roleName);

  const [startDateTime, setStartDateTime] = useState(() => {
    const parsed = readDateParam(searchParams.get("date"));
    return parsed ? parsed.startOf("month") : getPresetRange(PLANNING_PRESET)[0];
  });
  const [endDateTime, setEndDateTime] = useState(() => {
    const parsed = readDateParam(searchParams.get("date"));
    return parsed ? parsed.endOf("month") : getPresetRange(PLANNING_PRESET)[1];
  });
  const [selectedLivreur, setSelectedLivreur] = useState(null);
  const [statusFilter, setStatusFilter] = useState(null);
  const [cityFilter, setCityFilter] = useState(null);
  const [search, setSearch] = useState("");
  const [flagFilter, setFlagFilter] = useState(null);
  const [calMonth, setCalMonth] = useState(() => {
    const parsed = readDateParam(searchParams.get("date"));
    return parsed ?? getPresetRange(PLANNING_PRESET)[0];
  });
  const [selectedDay, setSelectedDay] = useState(() => {
    const parsed = readDateParam(searchParams.get("date"));
    return parsed ? toDayKey(parsed) : null;
  });

  const startDate = startDateTime?.format("YYYY-MM-DD");
  const endDate = endDateTime?.format("YYYY-MM-DD");

  const {
    data: planningResponse,
    isLoading,
    isFetching,
  } = usePlanningLivraison({
    startDate,
    endDate,
    livreurId: selectedLivreur?.id || undefined,
  });

  const { data: deliveriesResponse } = useDeliveries({ pageSize: 1000 });

  const planningData = planningResponse?.data ?? [];
  const livreurs = deliveriesResponse?.data ?? [];

  const cityOptions = useMemo(() => {
    const set = new Set();
    planningData.forEach((day) => {
      day.advancedBonLivraisons?.forEach((bl) => {
        const city = (bl.ville || "").trim();
        if (city) set.add(city);
      });
    });
    return Array.from(set)
      .sort((a, b) => a.localeCompare(b, "fr"))
      .map((city) => ({ value: city, label: city }));
  }, [planningData]);

  const statusOptions = useMemo(
    () => STATUS_FILTER_VALUES.map((value) => ({ value, label: t(`status_label_${value}`) })),
    [t],
  );

  const matchesBl = (bl) => {
    if (statusFilter?.value && bl.commandStatus !== statusFilter.value) return false;
    if (cityFilter?.value && (bl.ville || "").trim() !== cityFilter.value) return false;
    if (flagFilter?.value === "reported" && !bl.isReported) return false;
    if (flagFilter?.value === "suspended" && !bl.isSuspended) return false;
    const q = search.trim().toLowerCase();
    if (q) {
      const hay = [
        bl.clientName,
        bl.documentNumber,
        bl.ville,
        bl.localisation,
        bl.telephone,
        bl.whatsapp,
        bl.livreurName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  };

  const filteredPlanning = useMemo(
    () =>
      planningData.map((day) => ({
        ...day,
        advancedBonLivraisons: (day.advancedBonLivraisons ?? []).filter(matchesBl),
      })),
    [planningData, statusFilter, cityFilter, flagFilter, search],
  );

  const filteredBls = useMemo(
    () => filteredPlanning.flatMap((d) => d.advancedBonLivraisons),
    [filteredPlanning],
  );

  const displayedDays = useMemo(() => {
    if (selectedDay) return filteredPlanning.filter((d) => d.date === selectedDay);
    return filteredPlanning.filter((d) => d.advancedBonLivraisons.length > 0);
  }, [filteredPlanning, selectedDay]);

  const metrics = useMemo(() => {
    const daysWith = filteredPlanning.filter((d) => d.advancedBonLivraisons.length > 0).length;
    return {
      totalAdvancedBonLivraisons: filteredBls.length,
      totalColis: filteredBls.reduce((s, bl) => s + Number(bl.nombreDeColis || 0), 0),
      totalMontantAdvancedBonLivraisons: filteredBls.reduce((s, bl) => s + Number(bl.reste || 0), 0),
      totalDays: daysWith,
    };
  }, [filteredPlanning, filteredBls]);

  const hasActiveFilters = !!(
    search.trim() ||
    statusFilter ||
    cityFilter ||
    selectedLivreur ||
    flagFilter ||
    selectedDay
  );

  const clearDateParam = () => {
    if (!searchParams.get("date")) return;
    const next = new URLSearchParams(searchParams);
    next.delete("date");
    setSearchParams(next, { replace: true });
  };

  const handleReset = () => {
    const [start, end] = getPresetRange(PLANNING_PRESET);
    setStartDateTime(start);
    setEndDateTime(end);
    setCalMonth(start);
    setSelectedLivreur(null);
    setStatusFilter(null);
    setCityFilter(null);
    setSearch("");
    setFlagFilter(null);
    setSelectedDay(null);
    clearDateParam();
  };

  const handleDateChange = (from, to) => {
    setStartDateTime(from);
    setEndDateTime(to);
    if (from?.isValid() && to?.isValid() && from.isSame(to, "day")) {
      setSelectedDay(toDayKey(from));
    } else {
      setSelectedDay(null);
    }
    clearDateParam();
  };

  const dateParam = searchParams.get("date");

  useEffect(() => {
    const parsed = readDateParam(dateParam);
    if (!parsed) return;
    setStartDateTime(parsed.startOf("month"));
    setEndDateTime(parsed.endOf("month"));
    setCalMonth(parsed);
    setSelectedDay(toDayKey(parsed));
  }, [dateParam]);

  useEffect(() => {
    if (startDateTime?.isValid()) setCalMonth(startDateTime);
  }, [startDate]);

  const formatDayTitle = (dateStr) => {
    const d = parseDayKey(dateStr);
    if (!d?.isValid()) return dateStr;
    if (d.isSame(dayjs(), "day")) return t("today_badge");
    if (d.isSame(dayjs().add(1, "day"), "day")) return t("tomorrow_badge");
    return formatWithLocale(d, "dddd D MMM", i18n.language);
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <HeaderTable
        title={t("page_title")}
        count={isLoading ? undefined : metrics.totalAdvancedBonLivraisons}
      />

      <div className="mb-5">
        <DashboardDateFilter
          from={startDateTime}
          to={endDateTime}
          onChange={handleDateChange}
        />
      </div>

      <FiltersBar
        t={t}
        hasActiveFilters={hasActiveFilters}
        onReset={handleReset}
        cols={{
          xs: "1fr",
          sm: "repeat(2, 1fr)",
          md: `repeat(${canFilterByLivreur ? 4 : 3}, 1fr)`,
        }}
        filters={[
          {
            type: "select",
            id: "status",
            label: t("filter_status"),
            options: statusOptions,
            value: statusFilter,
            onChange: setStatusFilter,
          },
          {
            type: "select",
            id: "city",
            label: t("filter_city"),
            options: cityOptions,
            value: cityFilter,
            onChange: setCityFilter,
            searchable: true,
          },
          {
            type: "select",
            id: "flag",
            label: t("filter_flags"),
            options: [
              { value: "reported", label: t("flag_reported") },
              { value: "suspended", label: t("flag_suspended") },
            ],
            value: flagFilter,
            onChange: setFlagFilter,
          },
          ...(canFilterByLivreur
            ? [
                {
                  type: "async-select",
                  id: "livreur",
                  label: t("filter_livreur"),
                  icon: Truck,
                  options: livreurs,
                  value: selectedLivreur,
                  onChange: setSelectedLivreur,
                  getOptionLabel: (o) => o?.name ?? "",
                  allLabel: t("filter_all_livreurs"),
                },
              ]
            : []),
        ]}
        searchValue={search}
        onSearchChange={setSearch}
        searchPlaceholder={t("search_placeholder")}
      />

      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard
            icon={Truck}
            label={t("stat_bl")}
            value={metrics.totalAdvancedBonLivraisons}
            color={BRAND_COLOR}
          />
          <StatCard
            icon={Package}
            label={t("stat_colis")}
            value={metrics.totalColis}
            color="#10b981"
          />
          <StatCard
            icon={CreditCard}
            label={t("stat_montant")}
            value={`${fmtMad(metrics.totalMontantAdvancedBonLivraisons)} MAD`}
            color="#f59e0b"
          />
          <StatCard
            icon={Calendar}
            label={t("stat_jours")}
            value={metrics.totalDays}
            color="#8b5cf6"
          />
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-12">
          <div className="md:col-span-5 lg:col-span-4">
            <PlanningMiniCalendar
              planningData={filteredPlanning}
              calMonth={calMonth}
              setCalMonth={setCalMonth}
              selectedDay={selectedDay}
              onDayClick={(key, { inRange, selected }) => {
                if (!inRange) return;
                setSelectedDay(selected ? null : key);
              }}
              clickHint={t("hover_filter")}
            />
            {selectedDay && (
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="mt-2 ml-1 text-[12px] font-semibold text-[#B12B89] hover:underline"
              >
                {t("back_all_days")}
              </button>
            )}
          </div>

          <div className="space-y-5 md:col-span-7 lg:col-span-8">
            {isLoading || isFetching ? (
              <SectionLoader />
            ) : displayedDays.length === 0 ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center dark:border-[#2e2e2e] dark:bg-[#1c1c1c]">
                <Search size={32} className="mx-auto mb-3 text-slate-300 dark:text-slate-700" />
                <p className="text-sm font-semibold text-slate-400">
                  {hasActiveFilters ? t("empty_filters") : t("empty_period")}
                </p>
              </div>
            ) : (
              displayedDays.map(({ date, advancedBonLivraisons }) => (
                <div key={date}>
                  <div className="mb-2 flex items-center gap-3">
                    <p className="text-[13px] font-bold capitalize text-slate-700 dark:text-slate-200">
                      {formatDayTitle(date)}
                    </p>
                    <span className="text-[11px] text-slate-400">{date}</span>
                    {advancedBonLivraisons.length > 0 ? (
                      <span
                        className="rounded-lg px-2 py-0.5 text-[11px] font-bold"
                        style={{ backgroundColor: "#10b98118", color: "#10b981" }}
                      >
                        {t("delivery_count", { count: advancedBonLivraisons.length })}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-300 dark:text-slate-700">
                        {t("no_delivery")}
                      </span>
                    )}
                    <div className="h-px flex-1 bg-slate-100 dark:bg-[#222222]" />
                  </div>

                  {advancedBonLivraisons.length > 0 ? (
                    <div className="space-y-2">
                      {advancedBonLivraisons.map((bl) => (
                        <BLCard key={bl.id} bl={bl} />
                      ))}
                    </div>
                  ) : (
                    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 px-5 py-4 dark:border-[#2e2e2e] dark:bg-[#1c1c1c]/50">
                      <p className="text-center text-[12px] text-slate-400">{t("day_no_delivery")}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
