import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  User, Phone, MessageCircle, MapPin, Building2,
  CalendarClock, Truck, Package, ClipboardList, Receipt, History,
  ChevronLeft, ChevronRight,
} from "lucide-react";
import { useCommandById } from "../hooks/useCommands";
import { useCommandDetails } from "../hooks/useCommands";
import DeliveryProgressBar from "../../../../shared/components/DeliveryProgressBar";
import { SectionLoader } from "../../../../shared/components/loadersCollections/SectionLoader";
import { NotFound } from "../../../../shared/components/NotFound";
import { FormPageHeader } from "../../../../shared/components/FormPageHeader";

/* ─── Constants ─── */
const STATUS_META = {
  EN_COURS:  { label: "En cours",   color: "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800" },
  CONFIRME:  { label: "Confirmé",   color: "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800" },
  PREPARE:   { label: "Préparé",    color: "bg-blue-50 text-[#B12B89] border-blue-200 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800" },
  COLLECTE:  { label: "Collecté",   color: "bg-violet-50 text-violet-600 border-violet-200 dark:bg-violet-900/20 dark:text-violet-400 dark:border-violet-800" },
  EN_ROUTE:  { label: "En route",   color: "bg-sky-50 text-sky-600 border-sky-200 dark:bg-sky-900/20 dark:text-sky-400 dark:border-sky-800" },
  LIVRE:     { label: "Livré",      color: "bg-teal-50 text-teal-600 border-teal-200 dark:bg-teal-900/20 dark:text-teal-400 dark:border-teal-800" },
  PAYE:      { label: "Payé",       color: "bg-green-50 text-green-600 border-green-200 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800" },
  ANNULE:    { label: "Annulé",     color: "bg-red-50 text-red-500 border-red-200 dark:bg-red-900/20 dark:text-red-400 dark:border-red-800" },
};

/* ─── History type labels ─── */
const HISTORY_TYPE_LABELS = {
  creation:         "Commande créée",
  transitionStatus: (status) => STATUS_META[status]?.label ? `Statut → ${STATUS_META[status].label}` : `Statut → ${status}`,
  reporte:          "Reportée",
  suspended:        "Suspendue",
  continued:        "Reprise",
};

const getHistoryLabel = (item, t) => {
  if (item.type === "transitionStatus") {
    const statusLabel = t(`status_label_${item.status}`, STATUS_META[item.status]?.label ?? item.status);
    return t("history_transition", { label: statusLabel });
  }
  const keyMap = {
    creation:  "history_created",
    reporte:   "history_reported",
    suspended: "history_suspended",
    continued: "history_resumed",
  };
  return keyMap[item.type] ? t(keyMap[item.type]) : item.type;
};

/* ─── Helpers ─── */
const fmtMoney = (n) =>
  Number(n ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const fmtDateTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

/* ─── StatusBadge ─── */
const StatusBadge = ({ status }) => {
  const { t } = useTranslation("commands");
  const metaRaw = STATUS_META[status] ?? {
    label: status,
    color: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
  };
  const label = t(`status_label_${status}`, metaRaw.label);
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold border ${metaRaw.color}`}>
      {label}
    </span>
  );
};

/* ─── SectionCard ─── */
const SectionCard = ({ title, icon: Icon, children, className = "" }) => (
  <div className={`bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden ${className}`}>
    <div className="px-7 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
      {Icon && <Icon size={14} className="text-blue-500" />}
      <h3 className="font-bold text-[11px] uppercase tracking-[0.15em] text-slate-400 dark:text-slate-500">{title}</h3>
    </div>
    <div className="p-7">{children}</div>
  </div>
);

/* ─── DetailField ─── */
const DetailField = ({ label, value, icon: Icon, href }) => (
  <div className="flex flex-col">
    <div className="flex items-center gap-1.5 mb-1">
      {Icon && <Icon size={12} className="text-slate-400 dark:text-slate-500" />}
      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">{label}</span>
    </div>
    {href && value ? (
      <a href={href} target="_blank" rel="noopener noreferrer"
        className="text-sm font-bold text-green-600 hover:text-green-500 hover:underline transition-colors break-words">
        {value}
      </a>
    ) : (
      <span className="text-sm font-bold text-slate-800 dark:text-slate-200 break-words">{value || "—"}</span>
    )}
  </div>
);

/* ─── Constants ─── */
const HISTORY_PAGE_SIZE = 10;

/* ─── Main Component ─── */
export const CommandDetailsPage = () => {
  const { t } = useTranslation("commands");
  const { id } = useParams();
  const navigate = useNavigate();

  const [historyPage, setHistoryPage] = useState(1);

  const liveOptions = { refetchOnWindowFocus: true, refetchInterval: 3000 };

  const { data: response, isLoading, isError } = useCommandById(id, liveOptions);
  const { data: detailsResponse, isLoading: isDetailsLoading } = useCommandDetails(id, liveOptions);

  const command = response?.data ?? null;
  const details = detailsResponse?.data ?? null;

  if (isLoading || isDetailsLoading) return <SectionLoader />;
  if (isError || !command) {
    return <NotFound onAction={() => navigate("/commandes")} />;
  }

  const {
    document: doc,
    telephone,
    whatsapp,
    ville,
    localisation,
    dateLivraison,
    agence,
    livreur,
    preparateur,
    observation,
  } = command;

  const clientName = doc?.clientName ?? details?.destinataire?.clientName ?? "—";
  const lines = doc?.lines ?? [];
  const amountDue   = details?.blInfo?.montantDue   ?? Number(doc?.amountDue   ?? 0);
  const amountPaid  = details?.blInfo?.montantPaid  ?? Number(doc?.amountPaid  ?? 0);
  const products    = details?.blInfo?.products     ?? [];

  const cleanedWhatsapp = (whatsapp ?? "").toString().replace(/\D/g, "");
  const normalizedWhatsapp = cleanedWhatsapp.startsWith("0")
    ? "212" + cleanedWhatsapp.slice(1) : cleanedWhatsapp;
  const whatsappUrl = normalizedWhatsapp ? `https://wa.me/${normalizedWhatsapp}` : null;

  const documentNumber = doc?.documentNumber ?? `#${command.id}`;

  // ─── Derived from details ───
  const timelineSteps = details?.timeline ?? [];
  const history       = details?.history  ?? [];
  const propos        = details?.propos   ?? {};
  const destinataire  = details?.destinataire ?? {};

  const displayPhone    = destinataire.telephone    || telephone;
  const displayWhatsapp = destinataire.whatsapp     || whatsapp;
  const displayVille    = destinataire.ville        || ville;
  const displayLoc      = destinataire.localisation || localisation;
  const displayObs      = propos.observation        ?? observation ?? "—";

  const productRows = products.length > 0 ? products : lines.map((line) => ({
    kind: line.variantId ? "variant" : "article",
    name: line.description || line.variant?.article?.name || line.article?.name || "Article sans nom",
    quantity: Number(line.quantity ?? 1),
    unitPrice: Number(line.unitPrice ?? 0),
    total: Number(line.totalTTC ?? line.totalHT ?? 0),
  }));

  // ─── History pagination ───
  const historyPageCount = Math.ceil(history.length / HISTORY_PAGE_SIZE);
  const paginatedHistory = history.slice(
    (historyPage - 1) * HISTORY_PAGE_SIZE,
    historyPage * HISTORY_PAGE_SIZE
  );

  return (
    <div className="min-h-screen pb-24 lg:pb-12">
      <FormPageHeader
        entityName={t("entity_name")}
        backPath="/commandes"
        isEdit={false}
        createTitle={t("detail_title", { number: documentNumber })}
        backLabel={t("back_label")}
      />

      <div className="max-w-6xl mx-auto px-4 md:px-6 mt-6 md:mt-8 space-y-5">

        {/* ─── Status summary bar ─── */}
        <div className="flex items-center justify-between flex-wrap gap-3 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 px-7 py-5 shadow-sm">
          <div className="flex items-center gap-4 flex-wrap">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">{t("detail_number")}</p>
              <p className="text-base font-black text-slate-800 dark:text-slate-100">{documentNumber}</p>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">{t("detail_status")}</p>
              <StatusBadge status={command.commandStatus} />
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-slate-700" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">{t("detail_created_at")}</p>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">{fmtDateTime(command.createdAt)}</p>
            </div>
          </div>
        </div>

        {/* ─── Progress Bar ─── */}
        {timelineSteps.length > 0 && (
          <SectionCard title={t("section_delivery_tracking")} icon={Truck}>
            <DeliveryProgressBar steps={timelineSteps} />
          </SectionCard>
        )}

        {/* ─── Two-column layout ─── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">

          {/* ─── Destinataire ─── */}
          <SectionCard title={t("section_recipient")} icon={User}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <DetailField label={t("field_name")}         value={destinataire.clientName || clientName} icon={User} />
              <DetailField label={t("field_telephone")}    value={displayPhone}    icon={Phone} />
              <DetailField label={t("field_whatsapp")}     value={displayWhatsapp} icon={MessageCircle} href={whatsappUrl} />
              <DetailField label={t("field_ville")}        value={displayVille}    icon={MapPin} />
              <div className="sm:col-span-2">
                <DetailField label={t("field_localisation")} value={displayLoc} icon={MapPin} />
              </div>
            </div>
          </SectionCard>

          {/* ─── À propos ─── */}
          <SectionCard title={t("section_about")} icon={ClipboardList}>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <DetailField label={t("field_delivery_date_to")} value={propos.dateLivraison   || fmtDateTime(dateLivraison)} icon={CalendarClock} />
              <DetailField label={t("field_agence")}            value={propos.agenceName      || agence?.name}               icon={Building2} />
              <DetailField label={t("field_livreur")}           value={propos.livreurName     || livreur?.name}               icon={Truck} />
              <DetailField label={t("field_preparateur")}       value={propos.preparateurName || preparateur?.name}           icon={Package} />
              <div className="sm:col-span-2">
                <DetailField label={t("field_notes")} value={displayObs} icon={ClipboardList} />
              </div>
            </div>
          </SectionCard>
        </div>

        {/* ─── Commande (Products & Amount) ─── */}
        <SectionCard title={t("section_order")} icon={Receipt}>
          <div className="flex flex-wrap gap-4 mb-6 p-5 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
            <div className="flex-1 min-w-[140px]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">{t("amount_total")}</p>
              <p className="text-2xl font-black text-slate-800 dark:text-slate-100">{fmtMoney(amountDue)} MAD</p>
            </div>
            <div className="flex-1 min-w-[140px]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">{t("amount_paid_label")}</p>
              <p className="text-2xl font-black text-emerald-600 dark:text-emerald-400">{fmtMoney(amountPaid)} MAD</p>
            </div>
            <div className="flex-1 min-w-[140px]">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1">{t("amount_reste")}</p>
              <p className="text-2xl font-black text-orange-600 dark:text-orange-400">{fmtMoney(amountDue - amountPaid)} MAD</p>
            </div>
          </div>

          <div>
            <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3">
              {t("products_count", { count: productRows.length })}
            </h4>
            {productRows.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 opacity-40">
                <Package size={36} className="mb-3 text-slate-400" />
                <p className="text-sm font-semibold text-slate-500">{t("no_products")}</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                      <th className="px-4 py-3 text-start  text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t("col_hash")}</th>
                      <th className="px-4 py-3 text-start  text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t("col_article")}</th>
                      <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t("col_qty")}</th>
                      <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t("col_unit_price")}</th>
                      <th className="px-4 py-3 text-end   text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t("col_total")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {productRows.map((row, idx) => (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition">
                        <td className="px-4 py-3">
                          <span className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-bold text-slate-500">
                            {idx + 1}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{row.name}</p>
                          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${row.kind === "variant" ? "bg-purple-50 dark:bg-purple-900/20 text-purple-500" : "bg-blue-50 dark:bg-blue-900/20 text-blue-500"}`}>
                            {row.kind?.toUpperCase() ?? "ARTICLE"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{row.quantity}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{fmtMoney(row.unitPrice)} MAD</span>
                        </td>
                        <td className="px-4 py-3 text-end">
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{fmtMoney(row.total)} MAD</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </SectionCard>

        {/* ─── Historique ─── */}
        <SectionCard title={t("section_history")} icon={History}>
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 opacity-40">
              <History size={36} className="mb-3 text-slate-400" />
              <p className="text-sm font-semibold text-slate-500">{t("no_history")}</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                      <th className="px-4 py-3 text-start text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t("col_hash")}</th>
                      <th className="px-4 py-3 text-start text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t("col_action_header")}</th>
                      <th className="px-4 py-3 text-start text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t("col_user")}</th>
                      <th className="px-4 py-3 text-end  text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t("col_date_header")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {paginatedHistory.map((item, idx) => {
                      const globalIdx = (historyPage - 1) * HISTORY_PAGE_SIZE + idx;
                      return (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition">
                          <td className="px-4 py-3">
                            <span className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-[10px] font-bold text-[#B12B89]">
                              {globalIdx + 1}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                              {getHistoryLabel(item, t)}
                            </p>
                            {item.note && (
                              <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5 italic">"{item.note}"</p>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{t("history_by", { user: item.user })}</p>
                          </td>
                          <td className="px-4 py-3 text-end">
                            <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{item.datetime}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* ─── Pagination ─── */}
              {historyPageCount > 1 && (
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                  <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                    {t("pagination_info", { from: (historyPage - 1) * HISTORY_PAGE_SIZE + 1, to: Math.min(historyPage * HISTORY_PAGE_SIZE, history.length), total: history.length })}
                  </p>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                      disabled={historyPage === 1}
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    >
                      <ChevronLeft size={14} className="rtl:scale-x-[-1]" />
                    </button>
                    {Array.from({ length: historyPageCount }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setHistoryPage(page)}
                        className={`w-8 h-8 rounded-xl text-[11px] font-bold transition ${
                          page === historyPage
                            ? "bg-[#B12B89] text-white"
                            : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => setHistoryPage((p) => Math.min(historyPageCount, p + 1))}
                      disabled={historyPage === historyPageCount}
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:cursor-not-allowed transition"
                    >
                      <ChevronRight size={14} className="rtl:scale-x-[-1]" />
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </SectionCard>

      </div>
    </div>
  );
};