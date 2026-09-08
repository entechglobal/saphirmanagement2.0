import { useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useCommandById, useCommandDetails } from "../hooks/useCommands";
import DeliveryProgressBar from "../../../../shared/components/DeliveryProgressBar";
import { SectionLoader } from "../../../../shared/components/loadersCollections/SectionLoader";
import { NotFound } from "../../../../shared/components/NotFound";
import { HeaderTable } from "../../../../shared/components/HeaderTable";

const STATUS_META = {
  EN_COURS: {
    label: "En cours",
    color:
      "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-900/20 dark:text-amber-300 dark:border-amber-800",
  },
  CONFIRME: {
    label: "Confirmé",
    color:
      "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-300 dark:border-emerald-800",
  },
  PREPARE: {
    label: "Préparé",
    color:
      "bg-violet-50 text-violet-700 border-violet-200 dark:bg-violet-900/20 dark:text-violet-300 dark:border-violet-800",
  },
  COLLECTE: {
    label: "Collecté",
    color:
      "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/20 dark:text-blue-300 dark:border-blue-800",
  },
  EN_ROUTE: {
    label: "En route",
    color:
      "bg-sky-50 text-sky-700 border-sky-200 dark:bg-sky-900/20 dark:text-sky-300 dark:border-sky-800",
  },
  LIVRE: {
    label: "Livré",
    color:
      "bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-900/20 dark:text-teal-300 dark:border-teal-800",
  },
  PAYE: {
    label: "Payé",
    color:
      "bg-green-50 text-green-700 border-green-200 dark:bg-green-900/20 dark:text-green-300 dark:border-green-800",
  },
  ANNULE: {
    label: "Annulé",
    color:
      "bg-red-50 text-red-600 border-red-200 dark:bg-red-900/20 dark:text-red-300 dark:border-red-800",
  },
};

const getHistoryLabel = (item, t) => {
  if (item.type === "transitionStatus") {
    const statusLabel = t(
      `status_label_${item.status}`,
      STATUS_META[item.status]?.label ?? item.status,
    );
    return t("history_transition", { label: statusLabel });
  }
  const keyMap = {
    creation: "history_created",
    reporte: "history_reported",
    suspended: "history_suspended",
    continued: "history_resumed",
    annulation: "history_cancelled",
    update: "history_updated",
  };
  return keyMap[item.type] ? t(keyMap[item.type]) : item.type;
};

const fmtMoney = (n) =>
  Number(n ?? 0).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const fmtDateTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (isNaN(d)) return iso;
  return d.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const StatusBadge = ({ status }) => {
  const { t } = useTranslation("commands");
  const meta = STATUS_META[status] ?? {
    label: status,
    color:
      "bg-slate-100 text-slate-600 border-slate-200 dark:bg-[#222222] dark:text-slate-300 dark:border-[#2e2e2e]",
  };
  return (
    <span
      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium ${meta.color}`}
    >
      {t(`status_label_${status}`, meta.label)}
    </span>
  );
};

const Card = ({ title, children, className = "" }) => (
  <section
    className={`overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-[#2e2e2e] dark:bg-[#1c1c1c] ${className}`}
  >
    {title && (
      <h2 className="border-b border-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-800 dark:border-[#2e2e2e] dark:text-slate-100">
        {title}
      </h2>
    )}
    <div className="p-4">{children}</div>
  </section>
);

const Field = ({ label, value, href }) => (
  <div className="min-w-0">
    <p className="text-xs text-slate-400">{label}</p>
    {href && value ? (
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-0.5 block truncate text-sm font-medium text-emerald-600 hover:underline"
      >
        {value}
      </a>
    ) : (
      <p className="mt-0.5 truncate text-sm font-medium text-slate-800 dark:text-slate-200">
        {value || "—"}
      </p>
    )}
  </div>
);

export const CommandDetailsPage = () => {
  const { t } = useTranslation("commands");
  const { id } = useParams();
  const navigate = useNavigate();

  const liveOptions = { refetchOnWindowFocus: true, refetchInterval: 3000 };

  const { data: response, isLoading, isError } = useCommandById(id, liveOptions);
  const { data: detailsResponse, isLoading: isDetailsLoading } =
    useCommandDetails(id, liveOptions);

  const command = response?.data ?? null;
  const details = detailsResponse?.data ?? null;

  const historyNewestFirst = useMemo(() => {
    const items = details?.history ?? [];
    return [...items].reverse();
  }, [details?.history]);

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

  const clientName =
    doc?.clientName ?? details?.destinataire?.clientName ?? "—";
  const lines = doc?.lines ?? [];
  const amountDue =
    details?.blInfo?.montantDue ?? Number(doc?.amountDue ?? 0);
  const amountPaid =
    details?.blInfo?.montantPaid ?? Number(doc?.amountPaid ?? 0);
  const products = details?.blInfo?.products ?? [];

  const cleanedWhatsapp = (whatsapp ?? "").toString().replace(/\D/g, "");
  const normalizedWhatsapp = cleanedWhatsapp.startsWith("0")
    ? `212${cleanedWhatsapp.slice(1)}`
    : cleanedWhatsapp;
  const whatsappUrl = normalizedWhatsapp
    ? `https://wa.me/${normalizedWhatsapp}`
    : null;

  const documentNumber = doc?.documentNumber ?? `#${command.id}`;
  const timelineSteps = details?.timeline ?? [];
  const propos = details?.propos ?? {};
  const destinataire = details?.destinataire ?? {};

  const displayPhone = destinataire.telephone || telephone;
  const displayWhatsapp = destinataire.whatsapp || whatsapp;
  const displayVille = destinataire.ville || ville;
  const displayLoc = destinataire.localisation || localisation;
  const displayObs = propos.observation ?? observation ?? "—";

  const productRows =
    products.length > 0
      ? products
      : lines.map((line) => ({
          kind: line.variantId ? "variant" : "article",
          name:
            line.description ||
            line.variant?.article?.name ||
            line.article?.name ||
            "—",
          quantity: Number(line.quantity ?? 1),
          unitPrice: Number(line.unitPrice ?? 0),
          total: Number(line.totalTTC ?? line.totalHT ?? 0),
        }));

  const showInvoice =
    (destinataire.withFacture || command.withFacture) &&
    (destinataire.ice ||
      destinataire.raisonSocial ||
      destinataire.siegeSocial ||
      command.ice ||
      command.raisonSocial);

  return (
    <div>
      <HeaderTable
        title={t("detail_title", { number: documentNumber })}
        backPath="/commandes"
        backLabel={t("back_label")}
        rightContent={<StatusBadge status={command.commandStatus} />}
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
        <div className="space-y-4">
          <Card>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
              <div>
                <p className="text-xs text-slate-400">{t("detail_number")}</p>
                <p className="font-semibold text-slate-800 dark:text-slate-100">
                  {documentNumber}
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">{t("detail_created_at")}</p>
                <p className="font-medium text-slate-700 dark:text-slate-200">
                  {fmtDateTime(command.createdAt)}
                </p>
              </div>
            </div>
          </Card>

          {timelineSteps.length > 0 && (
            <Card title={t("section_delivery_tracking")}>
              <div className="-mx-2 -my-2">
                <DeliveryProgressBar steps={timelineSteps} />
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Card title={t("section_recipient")}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field
                  label={t("field_name")}
                  value={destinataire.clientName || clientName}
                />
                {destinataire.linkedClientName &&
                  destinataire.linkedClientName !==
                    (destinataire.clientName || clientName) && (
                    <Field
                      label={t("confirm_row_linked_client")}
                      value={destinataire.linkedClientName}
                    />
                  )}
                <Field label={t("field_telephone")} value={displayPhone} />
                <Field
                  label={t("field_whatsapp")}
                  value={displayWhatsapp}
                  href={whatsappUrl}
                />
                <Field label={t("field_ville")} value={displayVille} />
                <Field label={t("field_localisation")} value={displayLoc} />
                <Field
                  label={t("form_facture_mode")}
                  value={
                    destinataire.withFacture || command.withFacture
                      ? t("form_with_facture")
                      : t("form_sans_facture")
                  }
                />
              </div>
            </Card>

            <Card title={t("section_about")}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field
                  label={t("field_delivery_date_to")}
                  value={propos.dateLivraison || fmtDateTime(dateLivraison)}
                />
                <Field
                  label={t("field_agence")}
                  value={propos.agenceName || agence?.name}
                />
                <Field
                  label={t("field_livreur")}
                  value={propos.livreurName || livreur?.name}
                />
                <Field
                  label={t("field_preparateur")}
                  value={propos.preparateurName || preparateur?.name}
                />
                <div className="sm:col-span-2">
                  <p className="text-xs text-slate-400">{t("field_notes")}</p>
                  <p className="mt-0.5 whitespace-pre-wrap text-sm font-medium text-slate-800 dark:text-slate-200">
                    {displayObs || "—"}
                  </p>
                </div>
              </div>
            </Card>
          </div>

          {showInvoice && (
            <Card title={t("confirm_section_facture")}>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Field
                  label={t("form_ice")}
                  value={destinataire.ice || command.ice}
                />
                <Field
                  label={t("form_raison_sociale")}
                  value={destinataire.raisonSocial || command.raisonSocial}
                />
                <div className="sm:col-span-2">
                  <Field
                    label={t("form_siege_social")}
                    value={destinataire.siegeSocial || command.siegeSocial}
                  />
                </div>
              </div>
            </Card>
          )}

          <Card title={t("section_order")}>
            <div className="mb-4 grid grid-cols-3 gap-3">
              <div>
                <p className="text-xs text-slate-400">{t("amount_total")}</p>
                <p className="text-base font-semibold text-slate-800 dark:text-slate-100">
                  {fmtMoney(amountDue)} MAD
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">{t("amount_paid_label")}</p>
                <p className="text-base font-semibold text-emerald-600">
                  {fmtMoney(amountPaid)} MAD
                </p>
              </div>
              <div>
                <p className="text-xs text-slate-400">{t("amount_reste")}</p>
                <p className="text-base font-semibold text-orange-600">
                  {fmtMoney(amountDue - amountPaid)} MAD
                </p>
              </div>
            </div>

            {productRows.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">
                {t("no_products")}
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-[#2e2e2e]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50 text-left text-xs text-slate-500 dark:border-[#2e2e2e] dark:bg-[#222222]">
                      <th className="px-3 py-2 font-medium">{t("col_article")}</th>
                      <th className="px-3 py-2 text-center font-medium">
                        {t("col_qty")}
                      </th>
                      <th className="px-3 py-2 text-end font-medium">
                        {t("col_unit_price")}
                      </th>
                      <th className="px-3 py-2 text-end font-medium">
                        {t("col_total")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-[#2e2e2e]">
                    {productRows.map((row, idx) => (
                      <tr key={idx}>
                        <td className="px-3 py-2 text-slate-800 dark:text-slate-200">
                          {row.name}
                        </td>
                        <td className="px-3 py-2 text-center text-slate-600 dark:text-slate-300">
                          {row.quantity}
                        </td>
                        <td className="px-3 py-2 text-end text-slate-600 dark:text-slate-300">
                          {fmtMoney(row.unitPrice)}
                        </td>
                        <td className="px-3 py-2 text-end font-medium text-slate-800 dark:text-slate-200">
                          {fmtMoney(row.total)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {(details?.blInfo?.totalCommission > 0 ||
              details?.blInfo?.commercialName) && (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-sm dark:border-[#2e2e2e]">
                {details?.blInfo?.commercialName && (
                  <p className="text-slate-500">
                    {t("detail_commercial")}:{" "}
                    <span className="font-medium text-slate-800 dark:text-slate-100">
                      {details.blInfo.commercialName}
                    </span>
                  </p>
                )}
                <p className="font-medium text-[#B12B89]">
                  {t("detail_total_commission")}:{" "}
                  {fmtMoney(details?.blInfo?.totalCommission || 0)} MAD
                </p>
              </div>
            )}
          </Card>
        </div>

        <aside className="lg:sticky lg:top-0">
          <section className="flex max-h-[calc(100vh-7rem)] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white dark:border-[#2e2e2e] dark:bg-[#1c1c1c]">
            <h2 className="shrink-0 border-b border-slate-100 px-4 py-2.5 text-sm font-semibold text-slate-800 dark:border-[#2e2e2e] dark:text-slate-100">
              {t("section_history")}
            </h2>
            {historyNewestFirst.length === 0 ? (
              <p className="px-4 py-10 text-center text-sm text-slate-400">
                {t("no_history")}
              </p>
            ) : (
              <ol className="min-h-0 flex-1 overflow-y-auto p-3">
                {historyNewestFirst.map((item, idx) => (
                  <li
                    key={`${item.type}-${item.datetime}-${idx}`}
                    className="relative ps-4 pb-4 last:pb-1"
                  >
                    {idx < historyNewestFirst.length - 1 && (
                      <span className="absolute start-[5px] top-3 bottom-0 w-px bg-slate-200 dark:bg-[#2e2e2e]" />
                    )}
                    <span className="absolute start-0 top-1.5 h-2.5 w-2.5 rounded-full bg-[#B12B89]" />
                    <p className="text-sm font-medium text-slate-800 dark:text-slate-100">
                      {getHistoryLabel(item, t)}
                    </p>
                    {item.payments?.length > 0 && (
                      <ul className="mt-1 space-y-0.5">
                        {item.payments.map((p, pIdx) => (
                          <li
                            key={pIdx}
                            className="text-xs font-medium text-slate-600 dark:text-slate-300"
                          >
                            {fmtMoney(p.amount)} MAD ·{" "}
                            {t(`mode_${p.modeReglement}`, {
                              ns: "reglement",
                              defaultValue: p.modeReglement,
                            })}
                            {p.banqueName ? ` · ${p.banqueName}` : ""}
                          </li>
                        ))}
                      </ul>
                    )}
                    {item.note && !item.payments?.length && (
                      <p className="mt-0.5 text-xs text-slate-500">{item.note}</p>
                    )}
                    <p className="mt-1 text-xs text-slate-400">
                      {item.datetime}
                      {item.user ? ` · ${item.user}` : ""}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
};
