import React, { useState, useMemo } from "react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import {
  Package,
  Truck,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Phone,
  MapPin,
  Clock,
  CreditCard,
  User,
  ChevronDown,
  ChevronUp,
  Hash,
  ClipboardList,
  MessageCircle
} from "lucide-react";
import { FormDatePicker } from "../../../../shared/FormDatePicker";
import { SelectDropDown as Select } from "../../../../shared/components/SelectDropDown";
import { usePlanningLivraison } from "../hooks/usePlanningLivraison";
import { useDeliveriesList as useDeliveries } from "../../../stracture/delivries/hooks/useDeliveries";
import { useAuth } from "../../../auth/hooks/useAuth";
import { SectionLoader } from "../../../../shared/components/loadersCollections/SectionLoader";
import { HeaderTable } from "../../../../shared/components/HeaderTable";
const BRAND_COLOR = "#B12B89";

// ─── Status badge config ───────────────────────────────────────────────────
const STATUS_MAP = {
  PAYE: {
    labelKey: "status_paye",
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    text: "text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  EN_ATTENTE: {
    labelKey: "status_en_attente",
    bg: "bg-amber-50 dark:bg-amber-950/40",
    text: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-400",
  },
  ANNULE: {
    labelKey: "status_annule",
    bg: "bg-red-50 dark:bg-red-950/40",
    text: "text-red-700 dark:text-red-400",
    dot: "bg-red-500",
  },
};

// ─── Stat Card ─────────────────────────────────────────────────────────────
const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white dark:bg-[#1c1c1c] rounded-2xl border border-slate-200 dark:border-[#2e2e2e] shadow-sm px-3 sm:px-5 py-3 sm:py-4 flex items-center gap-3 sm:gap-4">
    <div
      className="w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center shrink-0"
      style={{ backgroundColor: `${color}18` }}
    >
      <Icon size={16} style={{ color }} />
    </div>
    <div className="min-w-0">
      <p className="text-[10px] sm:text-[11px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 leading-none mb-0.5">
        {label}
      </p>
      <p className="text-base sm:text-xl font-bold text-slate-800 dark:text-slate-100 leading-tight truncate">
        {value ?? "—"}
      </p>
    </div>
  </div>
);

// ─── BL Card (expandable) ──────────────────────────────────────────────────
const BLCard = ({ bl }) => {
  const { t } = useTranslation("plannings");
  const [expanded, setExpanded] = useState(false);
  const whatsappRaw = (bl.whatsapp ?? bl.telephone ?? "").toString();
  const cleanedWhatsapp = whatsappRaw.replace(/\D/g, "");
  const normalizedWhatsapp = cleanedWhatsapp.startsWith("0")
    ? `212${cleanedWhatsapp.slice(1)}`
    : cleanedWhatsapp;
  const whatsappUrl = normalizedWhatsapp
    ? `https://wa.me/${normalizedWhatsapp}`
    : null;

  const statusCfg = STATUS_MAP[bl.commandStatus] ?? {
    labelKey: null,
    bg: "bg-slate-50 dark:bg-[#222222]",
    text: "text-slate-600 dark:text-slate-300",
    dot: "bg-slate-400",
  };
  const status = { ...statusCfg, label: statusCfg.labelKey ? t(statusCfg.labelKey) : bl.commandStatus };

  return (
    <div className="bg-white dark:bg-[#1c1c1c] rounded-2xl border border-slate-200 dark:border-[#2e2e2e] shadow-sm overflow-hidden transition-all">
      {/* Collapsed header – always visible */}
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-[#222222]/60 transition"
      >
        {/* Status dot */}
        <span className={`w-2 h-2 rounded-full shrink-0 ${status.dot}`} />

        {/* Client + doc number */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
            {bl.clientName}
          </p>
          <p className="text-[11px] text-slate-400 font-mono">{bl.documentNumber}</p>
        </div>

        {/* Colis badge */}
        <span className="shrink-0 text-[11px] font-bold bg-blue-50 dark:bg-blue-950/50 text-[#B12B89] dark:text-blue-400 px-2 py-0.5 rounded-lg">
          {t("bl_colis", { count: bl.nombreDeColis })}
        </span>

        {/* Time */}
        {bl.heureLivraison && (
          <span className="shrink-0 text-[11px] text-slate-400 flex items-center gap-1">
            <Clock size={11} />
            {bl.heureLivraison}
          </span>
        )}

        {/* Expand toggle */}
        <span className="shrink-0 text-slate-400">
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </span>
      </button>

      {/* Expanded details */}
      {expanded && (
        <div className="border-t border-slate-100 dark:border-[#2e2e2e] px-4 pb-4 pt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2.5">
          <DetailRow icon={Hash} label={t("detail_document")} value={bl.documentNumber} />
          <DetailRow icon={User} label={t("detail_created_by")} value={bl.createdBy ?? "—"} />
          <DetailRow
            icon={Truck}
            label={t("detail_livreur")}
            value={bl.livreurName ?? "—"}
          />
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
          {bl.ville && (
            <DetailRow icon={MapPin} label={t("detail_ville")} value={bl.ville} />
          )}

          {bl.localisation && (
            <DetailRow
              icon={MapPin}
              label={t("detail_localisation")}
              value={bl.localisation}
              full
            />
          )}
          <DetailRow
            icon={CreditCard}
            label={t("detail_reglement")}
            value={t(`mode_${bl.modeReglement}`, bl.modeReglement)}
          />
          <DetailRow
            icon={Package}
            label={t("detail_montant")}
            value={
              bl.amountDue != null
                ? `${Number(bl.amountDue).toFixed(2)} MAD`
                : "—"
            }
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
              value={`${Number(bl.reste).toFixed(2)} MAD`}
            />
          )}

          {/* Flags */}
          <div className="col-span-2 flex flex-wrap gap-2 pt-1">
            <span
              className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-lg ${status.bg} ${status.text}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${status.dot}`} />
              {status.label}
            </span>
            {bl.isReported && (
              <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                {t("badge_reported")}
              </span>
            )}
            {bl.isSuspended && (
              <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400">
                {t("badge_suspended")}
              </span>
            )}
            {bl.agenceName && (
              <span className="inline-flex items-center text-[11px] font-semibold px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-[#222222] text-slate-600 dark:text-slate-300">
                {bl.agenceName}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const DetailRow = ({ icon: Icon, label, value, full, href, isNotes }) => (
  <div className={`flex items-start gap-2 ${full ? "col-span-2" : ""}`}>
    <Icon size={13} className="text-slate-400 mt-0.5 shrink-0" />
    <div>
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
        {label}
      </p>
      {isNotes ? (
        <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-100 bg-amber-50 dark:bg-amber-900/30 border border-amber-100 dark:border-amber-800/60 rounded-xl px-2.5 py-2 whitespace-pre-wrap break-words leading-relaxed max-h-28 overflow-y-auto">
          {value ?? "—"}
        </p>
      ) : href && value ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[12px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline break-words"
        >
          {value}
        </a>
      ) : (
        <p className="text-[12px] font-semibold text-slate-700 dark:text-slate-200 break-words">
          {value ?? "—"}
        </p>
      )}

    </div>
  </div>
);


// ─── Mini Calendar ─────────────────────────────────────────────────────────
const MiniCalendar = ({ planningData, calMonth, setCalMonth, onDaySelect, selectedDay }) => {
  const { t } = useTranslation("plannings");
  const startOfMonth = calMonth.startOf("month");
  const daysInMonth = calMonth.daysInMonth();
  const firstDow = startOfMonth.day(); // 0=Sun

  // Map "DD/MM/YYYY" → { count, inRange }
  // inRange = true if the backend returned this date (even with empty array)
  const dayInfoMap = useMemo(() => {
    const m = {};
    planningData?.forEach(({ date, advancedBonLivraisons }) => {
      m[date] = {
        count: advancedBonLivraisons?.length ?? 0,
        inRange: true,
      };
    });
    return m;
  }, [planningData]);

  const blanks = Array.from({ length: firstDow });
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const fmtKey = (d) =>
    `${String(d).padStart(2, "0")}/${String(calMonth.month() + 1).padStart(2, "0")}/${calMonth.year()}`;

  const isSelected = (d) => selectedDay === fmtKey(d);
  const isToday = (d) =>
    dayjs().date() === d &&
    dayjs().month() === calMonth.month() &&
    dayjs().year() === calMonth.year();

  return (
    <div className="bg-white dark:bg-[#1c1c1c] rounded-3xl border border-slate-200 dark:border-[#2e2e2e] shadow-sm overflow-hidden">
      {/* Month nav */}
      <div className="flex items-center justify-between px-3 sm:px-5 py-3 sm:py-4 border-b border-slate-100 dark:border-[#2e2e2e]">
        <button
          type="button"
          onClick={() => setCalMonth((m) => m.subtract(1, "month"))}
          className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-[#222222] transition"
        >
          <ChevronLeft size={16} className="text-slate-500" />
        </button>
        <p className="text-sm font-bold text-slate-700 dark:text-slate-200 capitalize">
          {calMonth.format("MMMM YYYY")}
        </p>
        <button
          type="button"
          onClick={() => setCalMonth((m) => m.add(1, "month"))}
          className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-slate-100 dark:hover:bg-[#222222] transition"
        >
          <ChevronRight size={16} className="text-slate-500" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 px-2 sm:px-4 pt-3 pb-1">
        {[t("day_sun"), t("day_mon"), t("day_tue"), t("day_wed"), t("day_thu"), t("day_fri"), t("day_sat")].map((d) => (
          <div key={d} className="text-center text-[9px] sm:text-[10px] font-bold uppercase tracking-wider text-slate-400 py-1">
            {d}
          </div>
        ))}
      </div>

      {/* Grid — pt-2 so top-row badges aren't clipped */}
      <div className="grid grid-cols-7 gap-0.5 px-2 sm:px-4 pt-2 pb-3 sm:pb-4">
        {blanks.map((_, i) => (
          <div key={`b${i}`} />
        ))}
        {days.map((d) => {
          const key = fmtKey(d);
          const info = dayInfoMap[key];
          const count = info?.count ?? 0;
          const inRange = info?.inRange ?? false;
          const hasDeliveries = count > 0;
          const selected = isSelected(d);
          const today = isToday(d);

          return (
            <button
              key={d}
              type="button"
              onClick={() => inRange && onDaySelect(selected ? null : key)}
              disabled={!inRange}
              className={[
                "relative mx-auto flex items-center justify-center w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10 rounded-full transition-all text-[11px] sm:text-[13px] font-semibold",
                selected
                  ? "text-white shadow-md"
                  : hasDeliveries
                    ? "text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
                    : inRange
                      ? "text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#222222]"
                      : "text-slate-300 dark:text-slate-700 cursor-default",
                today && !selected ? "ring-2 ring-blue-400" : "",
              ].join(" ")}
              style={selected ? { backgroundColor: BRAND_COLOR } : {}}
            >
              {hasDeliveries && !selected && (
                <span className="absolute inset-0 rounded-full opacity-10 bg-emerald-500" />
              )}

              <span className="relative z-10">{d}</span>

              {hasDeliveries && (
                <span
                  className={[
                    "absolute -top-1 -right-0.5 sm:-right-1 min-w-[14px] sm:min-w-[16px] h-3.5 sm:h-4 px-0.5 sm:px-1 rounded-full text-[8px] sm:text-[9px] font-bold leading-none flex items-center justify-center shadow-sm",
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

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-3 sm:px-5 pb-3 sm:pb-4 pt-1">
        <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
          {t("legend_with_deliveries")}
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-slate-400">
          <span className="w-2 h-2 rounded-full bg-slate-300 dark:bg-[#2e2e2e] shrink-0" />
          {t("legend_without")}
        </span>
        <span className="flex items-center gap-1.5 text-[10px] text-slate-300 dark:text-slate-700">
          <span className="w-2 h-2 rounded-full bg-slate-200 dark:bg-[#222222] shrink-0" />
          {t("legend_out_of_range")}
        </span>
      </div>
    </div>
  );
};
// ─── Main Page ─────────────────────────────────────────────────────────────
export const PlanningLivraisonPage = () => {
  const { t } = useTranslation("plannings");
  const { user } = useAuth();
  const canFilterByLivreur = !!(user?.isSuperAdmin || user?.role === "Societe_Admin");
  const today = dayjs();

  const [startDateTime, setStartDateTime] = useState(today.startOf("week"));
  const [endDateTime, setEndDateTime] = useState(today.endOf("week"));
  const [selectedLivreurId, setSelectedLivreurId] = useState("");
  const [calMonth, setCalMonth] = useState(today);
  const [selectedDay, setSelectedDay] = useState(null); // "DD/MM/YYYY"

  // Format for API: YYYY-MM-DD
  const startDate = startDateTime?.format("YYYY-MM-DD");
  const endDate = endDateTime?.format("YYYY-MM-DD");

  const {
    data: planningResponse,
    isLoading,
    isFetching,
  } = usePlanningLivraison({
    startDate,
    endDate,
    livreurId: selectedLivreurId || undefined,
  });

  const { data: deliveriesResponse } = useDeliveries({ pageSize: 1000 });

  const metrics = planningResponse?.metrics ?? {};
  const planningData = planningResponse?.data ?? [];

  const livreurOptions = useMemo(() => {
    const list = deliveriesResponse?.data ?? [];
    return [
      { value: "", label: t("filter_all_livreurs") },
      ...list.map((l) => ({ value: l.id, label: l.name })),
    ];
  }, [deliveriesResponse, t]);

  // Days to display: if a day is selected show only that one, else all
  const displayedDays = useMemo(() => {
    if (!selectedDay) return planningData;
    return planningData.filter((d) => d.date === selectedDay);
  }, [planningData, selectedDay]);

  return (
    <div className="min-h-screen pb-16">
      {/* ── Page header ── */}
      <div className="px-4 md:px-8 pt-6 pb-4 ">
        <HeaderTable
          title={t("page_title")}
          icon={<Calendar className="w-6 h-6 text-[#B12B89]" />}
        />

      </div>

      <div className="px-4 md:px-8 space-y-6">
        {/* ── Filters ── */}
        <div className="bg-white dark:bg-[#1c1c1c] rounded-3xl border border-slate-200 dark:border-[#2e2e2e] shadow-sm p-5">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-4">
            {t("filter_label")}
          </p>
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormDatePicker
                label={t("filter_start_date")}
                name="startDate"
                value={startDateTime?.format("YYYY-MM-DD") ?? ""}
                onChange={(e) => {
                  const nextStart = e.target.value
                    ? dayjs(e.target.value).startOf("day")
                    : null;
                  setStartDateTime(nextStart);
                  if (nextStart && endDateTime && nextStart.isAfter(endDateTime, "day")) {
                    setEndDateTime(nextStart.endOf("day"));
                  }
                }}
              />
              <FormDatePicker
                label={t("filter_end_date")}
                name="endDate"
                value={endDateTime?.format("YYYY-MM-DD") ?? ""}
                onChange={(e) => {
                  const nextEnd = e.target.value
                    ? dayjs(e.target.value).endOf("day")
                    : null;
                  setEndDateTime(nextEnd);
                }}
              />
            </div>
            {canFilterByLivreur && (
              <div className="w-full sm:max-w-xs">
                <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 ml-1">
                  {t("filter_livreur")}
                </label>
                <Select
                  name="livreurId"
                  value={selectedLivreurId}
                  onChange={(e) => setSelectedLivreurId(e.target.value)}
                  options={livreurOptions}
                  title={t("filter_all_livreurs")}
                />
              </div>
            )}
          </div>
        </div>

        {/* ── Metrics ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
            value={
              metrics.totalMontantAdvancedBonLivraisons != null
                ? `${Number(metrics.totalMontantAdvancedBonLivraisons).toFixed(2)} MAD`
                : "—"
            }
            color="#f59e0b"
          />
          <StatCard
            icon={Calendar}
            label={t("stat_jours")}
            value={metrics.totalDays}
            color="#8b5cf6"
          />
        </div>

        {/* ── Calendar + List ── */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Calendar */}
          <div className="md:col-span-5 lg:col-span-4">
            <MiniCalendar
              planningData={planningData}
              calMonth={calMonth}
              setCalMonth={setCalMonth}
              onDaySelect={setSelectedDay}
              selectedDay={selectedDay}
            />
            {selectedDay && (
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="mt-2 text-[12px] font-semibold text-blue-500 hover:underline ml-1"
              >
                {t("back_all_days")}
              </button>
            )}
          </div>

          {/* Daily list */}
          <div className="md:col-span-7 lg:col-span-8 space-y-5">
            {isLoading || isFetching ? (
              <SectionLoader />
            ) : displayedDays.length === 0 ? (
              <div className="bg-white dark:bg-[#1c1c1c] rounded-3xl border border-slate-200 dark:border-[#2e2e2e] shadow-sm p-10 text-center">
                <Truck size={36} className="text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <p className="text-sm font-semibold text-slate-400">
                  {t("empty_period")}
                </p>
              </div>
            ) : (
              displayedDays.map(({ date, advancedBonLivraisons }) => (
                <div key={date}>
                  {/* Day header */}
                  <div className="flex items-center gap-3 mb-2">
                    <p className="text-[13px] font-bold text-slate-700 dark:text-slate-200">
                      {date}
                    </p>
                    {advancedBonLivraisons.length > 0 ? (
                      <span
                        className="text-[11px] font-bold px-2 py-0.5 rounded-lg"
                        style={{
                          backgroundColor: "#10b98118",
                          color: "#10b981",
                        }}
                      >
                        {t("delivery_count", { count: advancedBonLivraisons.length })}
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-300 dark:text-slate-700">
                        {t("no_delivery")}
                      </span>
                    )}
                    <div className="flex-1 h-px bg-slate-100 dark:bg-[#222222]" />
                  </div>

                  {/* BL cards */}
                  {advancedBonLivraisons.length > 0 ? (
                    <div className="space-y-2">
                      {advancedBonLivraisons.map((bl) => (
                        <BLCard key={bl.id} bl={bl} />
                      ))}
                    </div>
                  ) : (
                    <div className="bg-slate-50 dark:bg-[#1c1c1c]/50 rounded-2xl border border-dashed border-slate-200 dark:border-[#2e2e2e] py-4 px-5">
                      <p className="text-[12px] text-slate-400 text-center">
                        {t("day_no_delivery")}
                      </p>
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

