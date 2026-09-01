import React, { useState, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useBlocker } from "react-router-dom";
import { toast } from "@/shared/utils/toast";
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Plus,
  Trash2,
  Loader2,
  X,
  ChevronUp,
  Building2,
  User,
  ShoppingCart,
  Truck,
  CheckCircle2,
  Clock,
  FileText,
  AlertTriangle,
  Tag,
} from "lucide-react";
import dayjs from "dayjs";

import {
  useCreateAdvancedBonLivraison,
  useAgences,
  useAdvDepots,
  useCheckPacksStockAvailability,
  useLivreurs,
  usePreparateurs,
} from "../hooks/useCommands";
import { ProductPickerModal } from "../components/ProductPickerModal";
import { MODE_REGLEMENT_OPTIONS } from "../api/commands.api";

import { Input } from "../../../../shared/components/Input";
import { SelectDropDown } from "../../../../shared/components/SelectDropDown";
import { FormDatePicker } from "../../../../shared/FormDatePicker";
import { FormPageHeader } from "../../../../shared/components/FormPageHeader";
import { FormCard } from "../../../../shared/components/FormCard";
import { FormActionBar } from "../../../../shared/components/FormActions";
import { SuccessOverlay } from "../../../../shared/components/animations/SuccessOverlay";
import { ConfirmationModal } from "../../../../shared/components/ConfirmationModal";
import { CitySearchDropdown } from "../components/CitySearchDropdown";
import { useDeliveryProviderConfigs } from "../../../stracture/deliveryProviderConfigs/hooks/useDeliveryProviderConfigs";

/* ─── Constants ─── */
const BRAND = "#B12B89";

const STEPS = [
  { id: 1, labelKey: "step_1", icon: Building2 },
  { id: 2, labelKey: "step_2", icon: User },
  { id: 3, labelKey: "step_3", icon: ShoppingCart },
  { id: 4, labelKey: "step_4", icon: Truck },
];

const fmt = (n) =>
  Number(n ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ─── StepIndicator ─── */
const StepIndicator = ({ currentStep }) => {
  const { t } = useTranslation("commands");
  return (
    <div className="flex items-start justify-center mb-10">
      {STEPS.map((step, idx) => {
        const Icon = step.icon;
        const done = currentStep > step.id;
        const active = currentStep === step.id;
        return (
          <React.Fragment key={step.id}>
            <div className="flex flex-col items-center w-20">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 border-2 ${done
                  ? "bg-emerald-500 border-emerald-500 text-white shadow-lg"
                  : active
                    ? "bg-[#B12B89] border-[#B12B89] text-white shadow-xl"
                    : "bg-gray-100 border-gray-300 text-gray-400 dark:bg-gray-800 dark:border-gray-600"
                  }`}
              >
                {done ? <Check size={20} strokeWidth={3} /> : <Icon size={20} />}
              </div>
              <span
                className={`text-xs font-semibold text-center leading-tight mt-2 transition-colors duration-300 ${active
                  ? "text-[#B12B89] dark:text-[#B12B89]"
                  : done
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-gray-400 dark:text-gray-500"
                  } hidden sm:block`}
              >
                {t(step.labelKey)}
              </span>
            </div>
            {idx < STEPS.length - 1 && (
              <div
                className={`h-0.5 w-12 sm:w-16 md:w-20 lg:w-24 mt-6 transition-all duration-500 ${currentStep > step.id ? "bg-emerald-400" : "bg-gray-300 dark:bg-gray-600"
                  }`}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

/* ─── WizardNav ─── */
const WizardNav = ({ step, onPrev, onNext, onShowConfirm, canNext }) => {
  const { t } = useTranslation("commands");
  return (
    <FormActionBar>
      {step > 1 && (
        <button
          type="button"
          onClick={onPrev}
          className="flex items-center gap-2 px-4 h-10 rounded-md border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <ChevronLeft size={16} className="rtl:scale-x-[-1]" /> {t("btn_prev")}
        </button>
      )}
      {step < 4 ? (
        <button
          type="button"
          onClick={onNext}
          disabled={!canNext}
          className="inline-flex items-center justify-center gap-2 px-5 h-10 rounded-md text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: BRAND }}
        >
          {t("btn_next")} <ChevronRight size={16} className="rtl:scale-x-[-1]" />
        </button>
      ) : (
        <button
          type="button"
          onClick={onShowConfirm}
          disabled={!canNext}
          className="inline-flex items-center justify-center gap-2 px-5 h-10 rounded-md text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ backgroundColor: BRAND }}
        >
          <CheckCircle2 size={16} /> {t("btn_create_order")}
        </button>
      )}
    </FormActionBar>
  );
};

/* ─── Status Badge helper ─── */
const statusMeta = {
  EN_COURS: { label: "En cours", color: "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400" },
  CONFIRME: { label: "Confirmé", color: "bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400" },
  LIVRE: { label: "Livré", color: "bg-blue-50 dark:bg-blue-900/20 text-[#B12B89] dark:text-blue-400" },
  ANNULE: { label: "Annulé", color: "bg-red-50 dark:bg-red-900/20 text-red-500 dark:text-red-400" },
};

/* ─── ConfirmModal ─── */
const ConfirmModal = ({ form, lines, packLines, agences, depots, livreurs, preparateurs, onConfirm, onCancel, isSubmitting }) => {
  const { t } = useTranslation("commands");
  const totalLines = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const totalPacks = packLines.reduce((s, p) => s + p.quantity * p.prixVente, 0);
  const totalCommande = totalLines + totalPacks;

  const agenceName = agences.find((a) => String(a.id) === String(form.agenceId))?.name ?? "—";
  const depotName = depots.find((d) => String(d.id) === String(form.depotId))?.name ?? "—";
  const livreurName = livreurs.find((l) => String(l.id) === String(form.livreurId))?.name ?? "—";
  const preparateurName = preparateurs.find((p) => String(p.id) === String(form.preparateurId))?.name ?? "—";
  const statusInfoRaw = statusMeta[form.commandStatus] ?? { label: form.commandStatus, color: "" };
  const statusInfo = { ...statusInfoRaw, label: t(`status_label_${form.commandStatus}`, statusInfoRaw.label) };

  const Row = ({ label, value, highlight }) => (
    <div className="flex items-start justify-between gap-1 py-2.5 border-b border-slate-100 dark:border-slate-800 last:border-0">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 flex-shrink-0 w-32">{label}</span>
      <span className={`text-sm font-bold text- break-word ${highlight ? "text-[#B12B89] dark:text-blue-400" : "text-slate-700 dark:text-slate-200"}`}>{value}</span>
    </div>
  );

  const ObservationBlock = ({ value }) => (
    <div className="pt-2">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
        {t("confirm_row_observation")}
      </p>
      <div className="text-sm font-semibold text-slate-700 dark:text-slate-100 bg-amber-50 dark:bg-amber-900/30 border border-amber-100 dark:border-amber-800/60 rounded-lg px-3 py-2.5 whitespace-pre-wrap break-words leading-relaxed max-h-28 overflow-y-auto">
        {value}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 modal-backdrop p-4" onClick={onCancel}>
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="px-8 py-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-4">
          <div className="w-12 h-12 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle size={20} className="text-amber-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{t("confirm_order_title")}</h2>
            <p className="text-xs text-slate-400 mt-0.5">{t("confirm_order_subtitle")}</p>
          </div>
          <button onClick={onCancel} className="ms-auto p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition">
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-8 space-y-6">

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">{t("confirm_section_client")}</p>
              <Row label={t("confirm_row_client")} value={form.clientName || "—"} />
              <Row label={t("confirm_row_telephone")} value={form.telephone || "—"} />
              <Row label={t("confirm_row_whatsapp")} value={form.whatsapp || "—"} />
              <Row label={t("confirm_row_ville")} value={typeof form.ville === "object" ? form.ville?.name || "—" : form.ville || "—"} />
              {form.localisation && <Row label={t("confirm_row_localisation")} value={form.localisation} />}
              <Row label={t("confirm_row_colis")} value={form.nombreDeColis || "—"} />
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">{t("confirm_section_livraison")}</p>
              <Row label={t("confirm_row_agence")} value={agenceName} />
              <Row label={t("confirm_row_depot")} value={depotName} />
              <Row label={t("confirm_row_date")} value={form.dateLivraison} />
              {form.heureLivraison && <Row label={t("confirm_row_heure")} value={form.heureLivraison} />}
              <Row label={t("confirm_row_livreur")} value={livreurName} />
              <Row label={t("confirm_row_preparateur")} value={preparateurName} />
              {form.observation && <ObservationBlock value={form.observation} />}
            </div>
          </div>

          {(form.ice || form.raisonSocial) && (
            <div className="bg-slate-50 dark:bg-slate-800/50 rounded-lg p-5">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-3">{t("confirm_section_facture")}</p>
              {form.ice && <Row label={t("confirm_row_ice")} value={form.ice} />}
              {form.raisonSocial && <Row label={t("confirm_row_raison_sociale")} value={form.raisonSocial} />}
              {form.siegeSocial && <Row label={t("confirm_row_siege_social")} value={form.siegeSocial} />}
            </div>
          )}

          {lines.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">{t("confirm_articles", { count: lines.length })}</p>
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase tracking-wider text-slate-400">
                      <th className="px-4 py-2.5 text-left font-semibold">{t("confirm_col_article")}</th>
                      <th className="px-4 py-2.5 text-center font-semibold">{t("confirm_col_qty")}</th>
                      <th className="px-4 py-2.5 text-center font-semibold">{t("confirm_col_price")}</th>
                      <th className="px-4 py-2.5 text-right font-semibold">{t("confirm_col_total")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {lines.map((l, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">{l.name}</td>
                        <td className="px-4 py-2.5 text-sm text-center text-slate-500">{l.quantity}</td>
                        <td className="px-4 py-2.5 text-sm text-center text-slate-500">{fmt(l.unitPrice)} MAD</td>
                        <td className="px-4 py-2.5 text-sm font-bold text-right text-slate-700 dark:text-slate-200">{fmt(l.quantity * l.unitPrice)} MAD</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {packLines.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">{t("confirm_packs", { count: packLines.length })}</p>
              <div className="rounded-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/50 text-[10px] uppercase tracking-wider text-slate-400">
                      <th className="px-4 py-2.5 text-left font-semibold">{t("confirm_col_pack")}</th>
                      <th className="px-4 py-2.5 text-center font-semibold">{t("confirm_col_qty")}</th>
                      <th className="px-4 py-2.5 text-center font-semibold">{t("confirm_col_price")}</th>
                      <th className="px-4 py-2.5 text-right font-semibold">{t("confirm_col_total")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {packLines.map((p, i) => (
                      <tr key={i}>
                        <td className="px-4 py-2.5 text-sm font-semibold text-slate-700 dark:text-slate-200">{p.name}</td>
                        <td className="px-4 py-2.5 text-sm text-center text-slate-500">{p.quantity}</td>
                        <td className="px-4 py-2.5 text-sm text-center text-slate-500">{fmt(p.prixVente)} MAD</td>
                        <td className="px-4 py-2.5 text-sm font-bold text-right text-slate-700 dark:text-slate-200">{fmt(p.quantity * p.prixVente)} MAD</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Résumé financier */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/10 rounded-lg p-5 border border-blue-100 dark:border-blue-800">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-400 mb-3">{t("confirm_financial_summary")}</p>
            <Row label={t("confirm_financial_articles")} value={`${fmt(totalLines)} MAD`} />
            <Row label={t("confirm_financial_packs")} value={`${fmt(totalPacks)} MAD`} />
            <div className="flex items-center justify-between pt-3 mt-1 border-t border-blue-100 dark:border-blue-800">
              <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{t("confirm_financial_total")}</span>
              <span className="text-xl font-black text-[#B12B89] dark:text-blue-400">{fmt(totalCommande)} MAD</span>
            </div>
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400">{t("confirm_financial_mode")}</span>
              <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{form.modeReglement}</span>
            </div>
            {form.montantPaid && (
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">{t("confirm_financial_paid")}</span>
                <span className="text-xs font-bold text-emerald-600">{fmt(form.montantPaid)} MAD</span>
              </div>
            )}
            <div className="flex items-center justify-between pt-2">
              <span className="text-xs text-slate-400">{t("confirm_financial_status")}</span>
              <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${statusInfo.color}`}>
                {statusInfo.label}
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-8 py-5 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4">
          <button type="button" onClick={onCancel}
            className="px-4 h-10 rounded-md border border-slate-300 dark:border-slate-700 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors">
            {t("confirm_btn_modify")}
          </button>
          <button type="button" onClick={onConfirm} disabled={isSubmitting}
            className="inline-flex items-center justify-center gap-2 px-5 h-10 rounded-md text-sm font-medium text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: BRAND }}>
            {isSubmitting ? (
              <><Loader2 size={16} className="animate-spin" /> {t("confirm_btn_creating")}</>
            ) : (
              <><CheckCircle2 size={16} /> {t("confirm_btn_submit")}</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};


/* ─── LinesTable ─── */
const LinesTable = ({ lines, onUpdateLine, onRemoveLine }) => {
  const { t } = useTranslation("commands");
  if (lines.length === 0) return null;
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 mt-4">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t("table_col_article")}</th>
            <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t("table_col_qty")}</th>
            <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t("table_col_unit_price")}</th>
            <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t("table_col_total")}</th>
            <th className="px-4 py-3 w-10" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {lines.map((line, idx) => (
            <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition">
              <td className="px-4 py-3">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{line.name}</p>
                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${line.type === "VARIANT" ? "bg-purple-50 dark:bg-purple-900/20 text-purple-500" : "bg-blue-50 dark:bg-blue-900/20 text-blue-500"}`}>{line.type}</span>
              </td>
              <td className="px-4 py-3 text-center">
                <input type="number" min={1} value={line.quantity}
                  onChange={(e) => onUpdateLine(idx, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-center text-sm font-bold outline-none focus:ring-2 focus:ring-[#B12B89] transition bg-white dark:bg-slate-800 dark:text-slate-100" />
              </td>
              <td className="px-4 py-3 text-center">
                <input type="number" min={0} step={0.01} value={line.unitPrice}
                  onChange={(e) => onUpdateLine(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                  className="w-24 px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-center text-sm font-bold outline-none focus:ring-2 focus:ring-[#B12B89] transition bg-white dark:bg-slate-800 dark:text-slate-100" />
              </td>
              <td className="px-4 py-3 text-center">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{fmt(line.quantity * line.unitPrice)} MAD</span>
              </td>
              <td className="px-4 py-3">
                <button type="button" onClick={() => onRemoveLine(idx)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                  <Trash2 size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/* ─── PacksTable ─── */
const PacksTable = ({ packs, onUpdatePack, onRemovePack }) => {
  const { t } = useTranslation("commands");
  if (packs.length === 0) return null;
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800 mt-4">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t("table_col_pack")}</th>
            <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t("table_col_qty")}</th>
            <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t("table_col_sale_price")}</th>
            <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t("table_col_total")}</th>
            <th className="px-4 py-3 w-10" />
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
          {packs.map((pack, idx) => (
            <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition">
              <td className="px-4 py-3">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{pack.name}</p>
                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20 text-amber-500">PACK</span>
              </td>
              <td className="px-4 py-3 text-center">
                <input type="number" min={1} value={pack.quantity}
                  onChange={(e) => onUpdatePack(idx, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-16 px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-center text-sm font-bold outline-none focus:ring-2 focus:ring-[#B12B89] transition bg-white dark:bg-slate-800 dark:text-slate-100" />
              </td>
              <td className="px-4 py-3 text-center">
                <input type="number" min={0} step={0.01} value={pack.prixVente}
                  onChange={(e) => onUpdatePack(idx, "prixVente", parseFloat(e.target.value) || 0)}
                  className="w-24 px-2 py-1.5 border border-slate-200 dark:border-slate-700 rounded-lg text-center text-sm font-bold outline-none focus:ring-2 focus:ring-[#B12B89] transition bg-white dark:bg-slate-800 dark:text-slate-100" />
              </td>
              <td className="px-4 py-3 text-center">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{fmt(pack.quantity * pack.prixVente)} MAD</span>
              </td>
              <td className="px-4 py-3">
                <button type="button" onClick={() => onRemovePack(idx)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                  <Trash2 size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/* ═══════════════════════════════════════════════════════════════
   MAIN WIZARD COMPONENT
══════════════════════════════════════════════════════════════════ */
export const AdvancedBonLivraisonForm = () => {
  const { t } = useTranslation("commands");

  const COMMAND_STATUS_OPTIONS = [
    { value: "EN_COURS", label: t("status_label_EN_COURS") },
    { value: "CONFIRME", label: t("status_label_CONFIRME") },
  ];

  const isMoroccoPhone = (val) => /^0[567]\d{8}$/.test(val.replace(/\s/g, ""));
  const navigate = useNavigate();
  const createMutation = useCreateAdvancedBonLivraison();
  const checkPacksAvailabilityMutation = useCheckPacksStockAvailability();

  const [step, setStep] = useState(1);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [showFacture, setShowFacture] = useState(false);
  const [showHeureInput, setShowHeureInput] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [pendingBack, setPendingBack] = useState(false);

  const savingRef = useRef(false);

  const [form, setForm] = useState({
    agenceId: "",
    dateLivraison: dayjs().add(1, "day").format("YYYY-MM-DD"),
    heureLivraison: "",
    depotId: "",
    clientName: "",
    telephone: "",
    whatsapp: "",
    sameAsPhone: false,
    ville: "",
    localisation: "",
    nombreDeColis: "",
    ice: "",
    raisonSocial: "",
    siegeSocial: "",
    modeReglement: "VIREMENT",
    montantPaid: "",
    livreurId: "",
    preparateurId: "",
    observation: "",
    commandStatus: "CONFIRME", // ← NEW
    providerConfigId: "",
  });

  const [lines, setLines] = useState([]);
  const [packLines, setPackLines] = useState([]);
  const [livreurType, setLivreurType] = useState("intern");

  const { data: agencesData, isLoading: agencesLoading } = useAgences();
  const { data: depotsData, isLoading: depotsLoading } = useAdvDepots();


  const agences = agencesData?.data ?? [];
  const depots = depotsData?.data ?? [];



  // ── Depot filtering by agence societeId ──────────────────────
  const selectedAgence = agences.find((a) => String(a.id) === String(form.agenceId));
  const filteredDepots = selectedAgence
    ? depots.filter((d) => String(d.societeId) === String(selectedAgence.societeId))
    : depots;
  const { data: livreursData, isLoading: livreursLoading } = useLivreurs({ type: livreurType, societeId: selectedAgence?.societeId });
  const livreurs = livreursData?.data ?? [];
  const selectedLivreur = livreurs.find((l) => String(l.id) === String(form.livreurId));
  const showBusinessConfig = livreurType === "extern" && selectedLivreur?.entityType === "SOCIETE";

  const { data: providerConfigsData, isLoading: providerConfigsLoading } = useDeliveryProviderConfigs({
    pageIndex: 0,
    pageSize: 1000,
    provider: selectedLivreur?.name,
    enabled: showBusinessConfig,
  });
  const providerConfigs = providerConfigsData?.data ?? [];

  const { data: preparateursData, isLoading: preparateursLoading } = usePreparateurs({ societeId: selectedAgence?.societeId });
  const preparateurs = preparateursData?.data ?? [];

  // ─────────────────────────────────────────────────────────────

  const isDirty = step > 1 || !!(form.agenceId || form.clientName || form.telephone || lines.length > 0 || packLines.length > 0);

  const blockNavigation = useCallback(
    ({ currentLocation, nextLocation }) =>
      isDirty && !savingRef.current && currentLocation.pathname !== nextLocation.pathname,
    [isDirty]
  );
  const blocker = useBlocker(blockNavigation);

  const set = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const getVilleValue = (ville) => (typeof ville === "object" ? ville?.name ?? "" : ville ?? "");
  const isVilleValid = (ville) => !!getVilleValue(ville).trim();

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;

    // Reset depotId when agence changes
    if (name === "agenceId") {
      setForm((prev) => ({ ...prev, agenceId: value, depotId: "", livreurId: "", preparateurId: "", providerConfigId: "" }));
      return;
    }

    if (name === "livreurId") {
      setForm((prev) => ({ ...prev, livreurId: value, providerConfigId: "" }));
      return;
    }

    if (name === "sameAsPhone") {
      setForm((prev) => ({ ...prev, sameAsPhone: checked, whatsapp: checked ? prev.telephone : prev.whatsapp }));
      return;
    }
    if (name === "telephone" && form.sameAsPhone) {
      setForm((prev) => ({ ...prev, telephone: value, whatsapp: value }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const totalLines = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const totalPacks = packLines.reduce((s, p) => s + p.quantity * p.prixVente, 0);
  const totalCommande = totalLines + totalPacks;

  const handlePickerConfirm = async (newProducts, newPacks) => {
    if (newPacks.length > 0) {
      try {
        const response = await checkPacksAvailabilityMutation.mutateAsync({
          depotId: Number(form.depotId),
          packIds: newPacks.map((p) => p.id),
        });

        const availabilityData = response?.data ?? {};
        const unavailableResults = (availabilityData.results ?? []).filter(
          (r) => !r.available,
        );

        if (availabilityData.allAvailable === false || unavailableResults.length > 0) {
          unavailableResults.forEach((result) => {
            toast.error(result.message || `Pack "${result.packName}" indisponible.`);
          });
          return false;
        }
      } catch (err) {
        toast.error(
          err?.response?.data?.message ||
          t("toast.packs_error"),
        );
        return false;
      }
    }

    setLines((prev) => {
      const existingKeys = new Set(
        prev.map((l) => `${l.type}-${l.variantId ?? l.articleId}`)
      );
      return [...prev, ...newProducts.filter((p) => !existingKeys.has(`${p.variantId ?? p.articleId ?? ""}`))];
    });
    setPackLines((prev) => {
      const existingIds = new Set(prev.map((p) => p.id));
      return [...prev, ...newPacks.filter((p) => !existingIds.has(p.id))];
    });
    return true;
  };

  const updateLine = (idx, field, value) => setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  const removeLine = (idx) => setLines((prev) => prev.filter((_, i) => i !== idx));
  const updatePack = (idx, field, value) => setPackLines((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)));
  const removePack = (idx) => setPackLines((prev) => prev.filter((_, i) => i !== idx));

  const canGoNext = useCallback(() => {
    if (step === 1) return !!form.agenceId && !!form.dateLivraison && !!form.depotId;
    if (step === 2) return (
      !!form.clientName.trim() &&
      !!form.telephone.trim() && isMoroccoPhone(form.telephone) &&
      (!form.whatsapp || isMoroccoPhone(form.whatsapp)) &&
      isVilleValid(form.ville) &&
      !!form.localisation.trim()
    );
    if (step === 3) return (lines.length + packLines.length) > 0 && !!form.modeReglement;
    if (step === 4) {
      const selLiv = livreurs.find((l) => String(l.id) === String(form.livreurId));
      const needsConfig = livreurType === "extern" && selLiv?.entityType === "SOCIETE";
      return !!form.livreurId && !!form.preparateurId && !!form.commandStatus && (!needsConfig || !!form.providerConfigId);
    }
    return false;
  }, [step, form, lines, packLines, livreurs, livreurType]);

  const handleSubmit = async () => {
    const payload = {
      clientName: form.clientName,
      depotId: Number(form.depotId),
      dateLivraison: form.dateLivraison,
      agenceId: Number(form.agenceId),
      telephone: form.telephone,
      whatsapp: form.whatsapp,
      ville: form.ville,
      localisation: form.localisation,
      nombreDeColis: Number(form.nombreDeColis),
      modeReglement: form.modeReglement,
      observation: form.observation.trim() || undefined,
      livreurId: Number(form.livreurId),
      preparateurId: Number(form.preparateurId),
      montantPaid: form.montantPaid ? Number(form.montantPaid) : undefined,
      commandStatus: form.commandStatus, // ← NEW
      lines: lines.map((l) => ({
        variantId: l.variantId ?? undefined,
        articleId: !l.variantId ? l.articleId ?? undefined : undefined,
        quantity: l.quantity,
        unitPrice: l.unitPrice,
        priceField: l.priceField ?? "prixVente1",
      })),
      packLines: packLines.map((p) => ({ id: p.id, quantity: p.quantity, prixVente: p.prixVente })),
    };

    if (form.providerConfigId) payload.providerConfigId = Number(form.providerConfigId);
    if (form.heureLivraison) payload.heureLivraison = form.heureLivraison;
    if (form.ice.trim()) payload.ice = form.ice.trim();
    if (form.raisonSocial.trim()) payload.raisonSocial = form.raisonSocial.trim();
    if (form.siegeSocial.trim()) payload.siegeSocial = form.siegeSocial.trim();

    createMutation.mutate(payload, {
      onSuccess: () => {
        setShowConfirm(false);
        setShowSuccess(true);
      },
      onError: (err) => {
        toast.error(err?.response?.data?.message || t("toast.create_error"));
      },
    });
  };

  /* ── Step renderers ── */
  const renderStep1 = () => (
    <FormCard title={t("card_agency_delivery")} icon={<Building2 />}>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <SelectDropDown
          label={t("form_agence")}
          name="agenceId"
          value={form.agenceId}
          options={agences.map((a) => ({ value: a.id, label: a.name, subLabel: a.localisation }))}
          isLoading={agencesLoading}
          onChange={handleChange}
          required
        />

        <SelectDropDown
          label={t("form_depot")}
          name="depotId"
          value={form.depotId}
          options={filteredDepots.map((d) => ({ value: d.id, label: d.name, subLabel: d.societe?.raisonSocial }))}
          isLoading={depotsLoading}
          onChange={handleChange}
          disabled={!form.agenceId}
          placeholder={!form.agenceId ? t("form_select_agence_first") : filteredDepots.length === 0 ? t("form_no_depot") : t("form_select_depot")}
          required
        />

        <FormDatePicker
          label={t("form_date_livraison")}
          name="dateLivraison"
          value={form.dateLivraison}
          onChange={handleChange}
          required
        />

        {/* Heure optional toggle */}
        <div className="flex flex-col">
          <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 ml-1">
            {t("form_heure_livraison")}
          </label>
          {!showHeureInput ? (
            <button
              type="button"
              onClick={() => setShowHeureInput(true)}
              className="flex items-center gap-2 h-10 px-4 rounded-md border-2 border-dashed border-slate-200 dark:border-slate-700 text-sm font-medium text-slate-400 dark:text-slate-500 hover:border-blue-300 hover:text-blue-500 transition-all w-full"
            >
              <Clock size={15} />
              {t("form_add_heure")}
            </button>
          ) : (
            <div className="relative">
              <input
                type="time"
                name="heureLivraison"
                value={form.heureLivraison}
                onChange={handleChange}
                autoFocus
                className="w-full h-10 px-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-[#B12B89] outline-none transition pr-10"
              />
              <button
                type="button"
                onClick={() => { setShowHeureInput(false); set("heureLivraison", ""); }}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-400 transition"
              >
                <X size={14} />
              </button>
            </div>
          )}
        </div>
      </div>
    </FormCard>
  );

  const renderStep2 = () => (
    <div className="space-y-5">
      <FormCard title={t("card_client_info")} icon={<User />}>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Input label={t("form_client_name")} name="clientName" value={form.clientName} onChange={handleChange} placeholder={t("form_client_name_placeholder")} required />

          <Input
            label={t("form_telephone")}
            name="telephone"
            value={form.telephone}
            onChange={handleChange}
            placeholder="0612345678"
            error={form.telephone && !isMoroccoPhone(form.telephone) ? t("form_telephone_error") : undefined}
            required
          />

          {/* WhatsApp with toggle switch */}
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">
                WhatsApp
              </label>
              <label className="flex items-center gap-2 cursor-pointer select-none group">
                <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 group-hover:text-slate-600 transition">
                  {t("form_same_as_phone")}
                </span>
                <div className="relative">
                  <input type="checkbox" name="sameAsPhone" checked={form.sameAsPhone} onChange={handleChange} className="sr-only peer" />
                  <div className="w-9 h-5 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:bg-[#B12B89] transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:w-4 after:h-4 after:transition-all peer-checked:after:translate-x-4 shadow-inner" />
                </div>
              </label>
            </div>
            <Input
              name="whatsapp"
              value={form.whatsapp}
              onChange={handleChange}
              disabled={form.sameAsPhone}
              placeholder="0612345678"
              error={form.whatsapp && !form.sameAsPhone && !isMoroccoPhone(form.whatsapp) ? t("form_whatsapp_error") : undefined}
            />
          </div>

          <CitySearchDropdown
            label={t("form_city")}
            value={form.ville}
            onChange={handleChange}
            placeholder={t("form_city_placeholder")}
            required
          />
          <Input label={t("form_localisation")} name="localisation" value={form.localisation} onChange={handleChange} placeholder={t("form_localisation_placeholder")} required />
          <Input label={t("form_colis")} name="nombreDeColis" type="number" value={form.nombreDeColis} onChange={handleChange} placeholder="5" />
        </div>
      </FormCard>

      {/* Détails de facture collapsible */}
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        <button
          type="button"
          onClick={() => setShowFacture((v) => !v)}
          className="w-full px-7 py-5 flex items-center justify-between hover:bg-slate-50 dark:hover:bg-slate-800/50 transition group"
        >
          <div className="flex items-center gap-3">
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center transition-all ${showFacture ? "bg-[#B12B89] text-white" : "bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/20 group-hover:text-blue-500"
              }`}>
              {showFacture ? <ChevronUp size={14} /> : <Plus size={14} />}
            </div>
            <div className="text-left">
              <span className="font-bold text-[11px] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">
                {t("form_invoice_title")}
              </span>
              <span className="ms-2 text-[10px] text-slate-300 dark:text-slate-600">{t("form_facture_optional")}</span>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {(form.ice || form.raisonSocial) && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-500">
                {t("form_facture_filled")}
              </span>
            )}
            <FileText size={15} className="text-slate-300 dark:text-slate-600" />
          </div>
        </button>
        {showFacture && (
          <div className="px-7 pb-7 pt-6 border-t border-slate-100 dark:border-slate-800">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Input label={t("form_ice")} name="ice" value={form.ice} onChange={handleChange} placeholder="001234567890123" />
              <Input label={t("form_raison_sociale")} name="raisonSocial" value={form.raisonSocial} onChange={handleChange} placeholder={t("form_raison_sociale_placeholder")} />
              <div className="sm:col-span-2">
                <Input label={t("form_siege_social")} name="siegeSocial" value={form.siegeSocial} onChange={handleChange} placeholder={t("form_siege_social_placeholder")} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-5">
      <FormCard title={t("card_articles_packs")} icon={<ShoppingCart />}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {lines.length + packLines.length === 0 ? t("form_no_articles") : t("form_articles_summary", { lines: lines.length, packs: packLines.length })}
          </p>
          <button
            type="button"
            onClick={() => {
              if (!form.depotId) { toast.error(t("form_error_no_depot")); return; }
              setIsPickerOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 px-4 h-10 rounded-md text-sm font-medium text-white transition-colors"
            style={{ backgroundColor: BRAND }}
          >
            <Plus size={14} /> {t("form_add_articles")}
          </button>
        </div>

        {lines.length > 0 && (
          <>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-4 mb-1">{t("form_articles_section")}</p>
            <LinesTable lines={lines} onUpdateLine={updateLine} onRemoveLine={removeLine} />
          </>
        )}

        {packLines.length > 0 && (
          <>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-4 mb-1">{t("form_packs_section")}</p>
            <PacksTable packs={packLines} onUpdatePack={updatePack} onRemovePack={removePack} />
          </>
        )}

        {lines.length + packLines.length === 0 && (
          <div className="flex flex-col items-center justify-center py-14 opacity-40">
            <ShoppingCart size={36} className="mb-3 text-slate-400" />
            <p className="text-sm font-semibold text-slate-500">{t("form_no_article_selected")}</p>
            <p className="text-xs text-slate-400 mt-1">{t("form_click_to_add")}</p>
          </div>
        )}
      </FormCard>

      {/* Règlement */}
      <FormCard title={t("card_amount_reglement")}>
        <div className="flex items-center justify-between p-5 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 mb-6">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t("form_total_order")}</p>
            <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{fmt(totalCommande)} MAD</p>
          </div>
          <div className="text-end text-xs text-slate-400 space-y-1">
            <p>{t("form_articles_amount", { amount: fmt(totalLines) })}</p>
            <p>{t("form_packs_amount", { amount: fmt(totalPacks) })}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <SelectDropDown
            label={t("form_mode_reglement")}
            name="modeReglement"
            value={form.modeReglement}
            options={MODE_REGLEMENT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
            onChange={handleChange}
            required
          />
          <Input label={t("form_montant_regle")} name="montantPaid" type="number" value={form.montantPaid} onChange={handleChange} placeholder="0.00" />
        </div>
      </FormCard>
    </div>
  );

  const renderStep4 = () => (
    <div className="space-y-5">
      <FormCard title={t("card_livreur")} icon={<Truck />}>
        <div className="flex gap-2 mb-6">
          {["intern", "extern"].map((ltype) => (
            <button key={ltype} type="button"
              onClick={() => { setLivreurType(ltype); setForm((prev) => ({ ...prev, livreurId: "", providerConfigId: "" })); }}
              className={`px-4 h-10 rounded-md text-xs font-semibold border transition-all ${livreurType === ltype}
                ? "border-[#B12B89] text-[#B12B89] dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                : "border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300"
                }`}>
              {ltype === "intern" ? t("form_livreur_intern") : t("form_livreur_extern")}
            </button>
          ))}
        </div>
        <SelectDropDown
          label={t("form_livreur_label")}
          name="livreurId"
          value={form.livreurId}
          options={livreurs.map((l) => ({ value: l.id, label: l.name, subLabel: l.entityType }))}
          isLoading={livreursLoading}
          onChange={handleChange}
          required
        />
        {showBusinessConfig && (
          <div className="mt-6">
            <SelectDropDown
              label={t("form_business_config")}
              name="providerConfigId"
              value={form.providerConfigId}
              options={providerConfigs.map((c) => ({ value: c.id, label: c.name }))}
              isLoading={providerConfigsLoading}
              onChange={handleChange}
              placeholder={providerConfigsLoading ? t("form_loading") : providerConfigs.length === 0 ? t("form_no_config") : t("form_select_config")}
              required
            />
          </div>
        )}
      </FormCard>

      <FormCard title={t("card_preparateur_status_obs")} icon={<Tag />}>
        <div className="space-y-6">
          <SelectDropDown
            label={t("form_preparateur")}
            name="preparateurId"
            value={form.preparateurId}
            options={preparateurs.map((p) => ({ value: p.id, label: p.name, subLabel: p.entityType }))}
            isLoading={preparateursLoading}
            onChange={handleChange}
            required
          />

          {/* ── Statut de la commande ── */}
          <SelectDropDown
            label={t("form_status_commande")}
            name="commandStatus"
            value={form.commandStatus}
            options={COMMAND_STATUS_OPTIONS}
            onChange={handleChange}
            required
          />

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 ml-1">
              {t("form_observation")}
            </label>
            <textarea
              name="observation"
              value={form.observation}
              onChange={handleChange}
              rows={3}
              placeholder={t("form_observation_placeholder")}
              className="w-full px-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-[#B12B89] outline-none transition resize-none"
            />
          </div>
        </div>
      </FormCard>
    </div>
  );

  return (
    <div className="-m-4 lg:-m-6 px-3 pt-3">
      <FormPageHeader
        entityName={t("entity_name")}
        backPath="/commandes"
        isEdit={false}
        createTitle={t("create_title")}
        backLabel={t("back_label")}
        onBack={() => {
          if (isDirty) setPendingBack(true);
          else { savingRef.current = true; navigate("/commandes"); }
        }}
      />

      <div className="w-full mt-3">
        <StepIndicator currentStep={step} />

        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}

        <WizardNav
          step={step}
          onPrev={() => setStep((s) => s - 1)}
          onNext={() => setStep((s) => s + 1)}
          onShowConfirm={() => setShowConfirm(true)}
          canNext={canGoNext()}
        />
      </div>

      <ProductPickerModal
        isOpen={isPickerOpen}
        depotId={Number(form.depotId)}
        onClose={() => setIsPickerOpen(false)}
        onConfirm={handlePickerConfirm}
        alreadyLines={lines}
        alreadyPacks={packLines}
        isCheckingPacks={checkPacksAvailabilityMutation.isPending}
      />

      {showConfirm && (
        <ConfirmModal
          form={form}
          lines={lines}
          packLines={packLines}
          agences={agences}
          depots={depots}
          livreurs={livreurs}
          preparateurs={preparateurs}
          onConfirm={handleSubmit}
          onCancel={() => setShowConfirm(false)}
          isSubmitting={createMutation.isPending}
        />
      )}

      {showSuccess && (
        <SuccessOverlay
          onClose={() => {
            setShowSuccess(false);
            savingRef.current = true;
            navigate("/commandes");
          }}
        />
      )}

      <ConfirmationModal
        isOpen={blocker.state === "blocked" || pendingBack}
        onClose={() => { blocker.reset?.(); setPendingBack(false); }}
        onConfirm={() => {
          if (blocker.state === "blocked") blocker.proceed?.();
          else { savingRef.current = true; navigate("/commandes"); }
          setPendingBack(false);
        }}
        title={t("leave_modal_title")}
        message={t("leave_modal_message")}
        confirmText={t("leave_modal_confirm")}
        cancelText={t("leave_modal_cancel")}
        variant="danger"
      />
    </div>
  );
};