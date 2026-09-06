import React, { useState, useEffect, useCallback, useRef } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams, useBlocker } from "react-router-dom";
import { toast } from "@/shared/utils/toast";
import {
  Check,
  Plus,
  Trash2,
  Loader2,
  Package,
  Boxes,
  X,
  Search,
  ChevronLeft,
  ShoppingCart,
  Truck,
  AlertTriangle,
  Tag,
  Lock,
  Clock,
  ChevronDown,
  Save,
  Info,
} from "lucide-react";
import dayjs from "dayjs";

import {
  useCommandById,
  useUpdateCommand,
  useAgences,
  useAdvDepots,
  usePickerProducts,
  usePickerPacks,
  useLivreurs,
  usePreparateurs,
} from "../hooks/useCommands";
import { MODE_REGLEMENT_OPTIONS, MODES_WITH_BANQUE } from "../api/commands.api";
import { useBanques } from "../../../reglement/hooks/useReglementClient";

import { Input } from "../../../../shared/components/Input";
import { SelectDropDown } from "../../../../shared/components/SelectDropDown";
import { PRICE_FIELD_OPTIONS, PriceFieldDropDown } from "../../../../shared/components/PriceFieldDropDown";
import { FormDatePicker } from "../../../../shared/FormDatePicker";
import { FormPageHeader } from "../../../../shared/components/FormPageHeader";
import { FormCard } from "../../../../shared/components/FormCard";
import { FormActionBar } from "../../../../shared/components/FormActions";
import { SuccessOverlay } from "../../../../shared/components/animations/SuccessOverlay";
import { ConfirmationModal } from "../../../../shared/components/ConfirmationModal";
import { SectionLoader } from "../../../../shared/components/loadersCollections/SectionLoader";
import { CitySearchDropdown } from "../components/CitySearchDropdown";
import { OrderSection, FactureToggle } from "../components/OrderSection";

/* ─── Constants ─── */
const BRAND = "#B12B89";

/* Statuses that allow full editing (lines, articles, depot, etc.) */
const FULL_EDIT_STATUSES = new Set(["EN_COURS", "CONFIRME"]);

/* Status display metadata */
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

const fmt = (n) =>
  Number(n ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/* ─── StatusBadge ─── */
const StatusBadge = ({ status }) => {
  const { t } = useTranslation("commands");
  const metaRaw = STATUS_META[status] ?? { label: status, color: "bg-slate-100 text-slate-600 border-slate-200" };
  const label = t(`status_label_${status}`, metaRaw.label);
  return (
    <span className={`inline-flex items-center px-3 py-1 rounded-full text-[11px] font-bold border ${metaRaw.color}`}>
      {label}
    </span>
  );
};

/* ─── RestrictedBanner ─── */
const RestrictedBanner = ({ status }) => {
  const { t } = useTranslation("commands");
  const statusLabel = t(`status_label_${status}`, STATUS_META[status]?.label ?? status);
  return (
    <div className="flex items-start gap-3 px-5 py-4 rounded-lg bg-amber-50 dark:bg-amber-900/10 border border-amber-200 dark:border-amber-800 mb-6">
      <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
        <Lock size={14} className="text-amber-500" />
      </div>
      <div>
        <p className="text-sm font-bold text-amber-700 dark:text-amber-400">{t("edit_restricted_title")}</p>
        <p className="text-xs text-amber-600/80 dark:text-amber-500 mt-0.5">
          {t("edit_restricted_desc", { status: statusLabel })}
        </p>
      </div>
    </div>
  );
};

/* ─── LinesTable (read-only for restricted mode) ─── */
const LinesTable = ({ lines, onUpdateLine, onRemoveLine, locked = false }) => {
  const { t } = useTranslation("commands");
  if (lines.length === 0) return null;
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-[#2e2e2e] mt-4">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-50 dark:bg-[#222222]/50 border-b border-slate-200 dark:border-[#2e2e2e]">
            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t("table_col_article")}</th>
            <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t("table_col_qty")}</th>
            <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t("table_col_unit_price")}</th>
            <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t("table_col_total")}</th>
            {!locked && <th className="px-4 py-3 w-10" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-[#2e2e2e]">
          {lines.map((line, idx) => (
            <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-[#222222]/20 transition">
              <td className="px-4 py-3">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{line.name}</p>
                <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${line.type === "VARIANT" ? "bg-purple-50 dark:bg-purple-900/20 text-purple-500" : "bg-blue-50 dark:bg-blue-900/20 text-blue-500"}`}>
                  {line.type}
                </span>
              </td>
              <td className="px-4 py-3 text-center">
                {locked ? (
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{line.quantity}</span>
                ) : (
                  <input type="number" min={1} value={line.quantity}
                    onChange={(e) => onUpdateLine(idx, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 px-2 py-1.5 border border-slate-200 dark:border-[#2e2e2e] rounded-lg text-center text-sm font-bold outline-none focus:ring-2 focus:ring-[#B12B89] transition bg-white dark:bg-[#222222] dark:text-slate-100" />
                )}
              </td>
              <td className="px-4 py-3 text-center">
                {locked ? (
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{fmt(line.unitPrice)} MAD</span>
                ) : (
                  <input type="number" min={0} step={0.01} value={line.unitPrice}
                    onChange={(e) => onUpdateLine(idx, "unitPrice", parseFloat(e.target.value) || 0)}
                    className="w-24 px-2 py-1.5 border border-slate-200 dark:border-[#2e2e2e] rounded-lg text-center text-sm font-bold outline-none focus:ring-2 focus:ring-[#B12B89] transition bg-white dark:bg-[#222222] dark:text-slate-100" />
                )}
              </td>
              <td className="px-4 py-3 text-center">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{fmt(line.quantity * line.unitPrice)} MAD</span>
              </td>
              {!locked && (
                <td className="px-4 py-3">
                  <button type="button" onClick={() => onRemoveLine(idx)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                    <Trash2 size={14} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/* ─── PacksTable ─── */
const PacksTable = ({ packs, onUpdatePack, onRemovePack, locked = false }) => {
  const { t } = useTranslation("commands");
  if (packs.length === 0) return null;
  return (
    <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-[#2e2e2e] mt-4">
      <table className="w-full">
        <thead>
          <tr className="bg-slate-50 dark:bg-[#222222]/50 border-b border-slate-200 dark:border-[#2e2e2e]">
            <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t("table_col_pack")}</th>
            <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t("table_col_qty")}</th>
            <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t("table_col_sale_price")}</th>
            <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t("table_col_total")}</th>
            {!locked && <th className="px-4 py-3 w-10" />}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 dark:divide-[#2e2e2e]">
          {packs.map((pack, idx) => (
            <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-[#222222]/20 transition">
              <td className="px-4 py-3">
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">{pack.name}</p>
                <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20 text-amber-500">PACK</span>
              </td>
              <td className="px-4 py-3 text-center">
                {locked ? (
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{pack.quantity}</span>
                ) : (
                  <input type="number" min={1} value={pack.quantity}
                    onChange={(e) => onUpdatePack(idx, "quantity", Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-16 px-2 py-1.5 border border-slate-200 dark:border-[#2e2e2e] rounded-lg text-center text-sm font-bold outline-none focus:ring-2 focus:ring-[#B12B89] transition bg-white dark:bg-[#222222] dark:text-slate-100" />
                )}
              </td>
              <td className="px-4 py-3 text-center">
                {locked ? (
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-300">{fmt(pack.prixVente)} MAD</span>
                ) : (
                  <input type="number" min={0} step={0.01} value={pack.prixVente}
                    onChange={(e) => onUpdatePack(idx, "prixVente", parseFloat(e.target.value) || 0)}
                    className="w-24 px-2 py-1.5 border border-slate-200 dark:border-[#2e2e2e] rounded-lg text-center text-sm font-bold outline-none focus:ring-2 focus:ring-[#B12B89] transition bg-white dark:bg-[#222222] dark:text-slate-100" />
                )}
              </td>
              <td className="px-4 py-3 text-center">
                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{fmt(pack.quantity * pack.prixVente)} MAD</span>
              </td>
              {!locked && (
                <td className="px-4 py-3">
                  <button type="button" onClick={() => onRemovePack(idx)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                    <Trash2 size={14} />
                  </button>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

/* ─── ProductPickerModal (identical to create form) ─── */
const ProductPickerModal = ({ depotId, onClose, onConfirm, alreadyLines, alreadyPacks }) => {
  const { t } = useTranslation("commands");
  const [tab, setTab] = useState("products");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [priceField, setPriceField] = useState("prixVente1");
  const timerRef = React.useRef(null);

  const [pendingProducts, setPendingProducts] = useState([]);
  const [pendingPacks, setPendingPacks] = useState([]);

  const handleSearch = (val) => {
    setSearch(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { setDebouncedSearch(val); setPage(1); }, 350);
  };

  const { data: productsData, isLoading: loadingProducts } = usePickerProducts({
    depotId, priceField, search: debouncedSearch || undefined, page, limit: 10,
  });
  const { data: packsData, isLoading: loadingPacks } = usePickerPacks({ page: 1, limit: 50 });

  const products = productsData?.data ?? [];
  const packs = packsData?.data ?? [];
  const totalPages = Math.max(productsData?.pagination?.totalPages ?? 1, 1);

  useEffect(() => {
    if (pendingProducts.length === 0 || products.length === 0) return;
    const freshMap = new Map(products.map((p) => [`${p.type}-${p.variantId ?? p.id}`, p]));
    setPendingProducts((prev) => {
      let changed = false;
      const next = prev.map((pending) => {
        const fresh = freshMap.get(pending._key);
        if (!fresh) return pending;
        if (fresh.prixVente === pending.unitPrice && priceField === pending.priceField) return pending;
        changed = true;
        return { ...pending, unitPrice: fresh.prixVente, priceField };
      });
      return changed ? next : prev;
    });
  }, [products]);

  const alreadyProductKeys = new Set(alreadyLines.map((l) => `${l.type}-${l.variantId ?? l.articleId}`));
  const alreadyPackIds = new Set(alreadyPacks.map((p) => p.id));

  const isProductPending = (p) => pendingProducts.some((x) => x._key === `${p.type}-${p.variantId ?? p.id}`);
  const isPackPending = (p) => pendingPacks.some((x) => x.id === p.id);

  const toggleProduct = (p) => {
    const key = `${p.type}-${p.variantId ?? p.id}`;
    if (alreadyProductKeys.has(key)) return;
    if (isProductPending(p)) {
      setPendingProducts((prev) => prev.filter((x) => x._key !== key));
    } else {
      setPendingProducts((prev) => [...prev, {
        _key: key, variantId: p.variantId ?? null, articleId: p.articleId ?? null,
        name: p.name, quantity: 1, unitPrice: p.prixVente, priceField,
        commission: Number(p.commission || 0), stock: p.stock, type: p.type,
      }]);
    }
  };

  const togglePack = (p) => {
    if (alreadyPackIds.has(p.id)) return;
    if (isPackPending(p)) setPendingPacks((prev) => prev.filter((x) => x.id !== p.id));
    else setPendingPacks((prev) => [...prev, { id: p.id, name: p.name, quantity: 1, prixVente: p.prixVentePack, commission: Number(p.commission || 0) }]);
  };

  const handleConfirm = () => { onConfirm(pendingProducts, pendingPacks); onClose(); };
  const totalSelected = pendingProducts.length + pendingPacks.length;

  return (
    <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-white dark:bg-[#1c1c1c] rounded-lg border border-slate-200 dark:border-[#2e2e2e] max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="px-8 py-6 border-b border-slate-100 dark:border-[#2e2e2e] flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">{t("picker_title")}</h2>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {totalSelected > 0 && <span className="text-blue-500 font-semibold">{t("picker_subtitle_selected", { count: totalSelected })}</span>}
            </p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-[#222222] rounded-md transition">
            <X size={18} className="text-slate-500" />
          </button>
        </div>

        <div className="px-8 pt-4 pb-0 flex gap-2 border-b border-slate-100 dark:border-[#2e2e2e]">
          {["products", "packs"].map((tabKey) => (
            <button key={tabKey} type="button"
              onClick={() => { setTab(tabKey); setPage(1); setSearch(""); setDebouncedSearch(""); }}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all -mb-px border-b-2 ${tab === tabKey ? "border-[#B12B89] text-[#B12B89] dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10" : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"}`}>
              {tabKey === "products" ? <Package size={14} /> : <Boxes size={14} />}
              {tabKey === "products" ? t("picker_tab_articles") : t("picker_tab_packs")}
            </button>
          ))}
        </div>

        {tab === "products" && (
          <div className="px-8 py-4 border-b border-slate-100 dark:border-[#2e2e2e] space-y-3">
            <div className="relative">
              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              <input type="text" placeholder={t("picker_search_article")} value={search}
                onChange={(e) => handleSearch(e.target.value)}
                className="w-full pl-10 pr-4 h-10 bg-slate-50 dark:bg-[#222222] border border-slate-200 dark:border-[#2e2e2e] rounded-md text-sm focus:ring-2 focus:ring-[#B12B89] outline-none transition dark:text-slate-100"
                autoFocus />
            </div>
            <PriceFieldDropDown
              value={priceField}
              onChange={(e) => { setPriceField(e.target.value); setPage(1); }}
              placeholder={t("picker_price_grid", "Grille de prix")}
            />
          </div>
        )}

        <div className="flex-1 overflow-y-auto">
          {tab === "products" ? (
            loadingProducts ? (
              <div className="flex items-center justify-center h-48"><Loader2 size={28} className="animate-spin text-slate-300" /></div>
            ) : products.length === 0 ? (
              <div className="flex items-center justify-center h-48"><p className="text-sm text-slate-400">{t("picker_no_articles")}</p></div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-[#2e2e2e] bg-slate-50/80 dark:bg-[#222222]/50">
                    <th className="w-10 px-4 py-3" />
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t("picker_col_article")}</th>
                    <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t("picker_col_price")}</th>
                    <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t("picker_col_stock")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-[#2e2e2e]">
                  {products.map((p) => {
                    const key = `${p.type}-${p.variantId ?? p.id}`;
                    const disabled = alreadyProductKeys.has(key);
                    const pending = isProductPending(p);
                    return (
                      <tr key={key} onClick={() => toggleProduct(p)}
                        className={`transition-colors ${disabled ? "opacity-40 cursor-not-allowed" : pending ? "bg-blue-50/60 dark:bg-blue-900/10 cursor-pointer" : "hover:bg-slate-50 dark:hover:bg-[#222222]/30 cursor-pointer"}`}>
                        <td className="px-4 py-3 text-center">
                          <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center mx-auto transition-all ${pending ? "bg-[#B12B89] border-[#B12B89]" : "border-slate-300 dark:border-[#3a3a3a]"}`}>
                            {pending && <Check size={11} className="text-white" strokeWidth={3} />}
                          </div>
                        </td>
                        <td className="px-4 py-3.5">
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                            {p.name}
                            {disabled && <span className="ml-2 text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-[#2e2e2e] px-1.5 py-0.5 rounded">{t("picker_already_added")}</span>}
                          </p>
                          <span className={`text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${p.type === "VARIANT" ? "bg-purple-50 dark:bg-purple-900/20 text-purple-500" : "bg-blue-50 dark:bg-blue-900/20 text-blue-500"}`}>
                            {p.type}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">{fmt(p.prixVente)} MAD</span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={`text-xs font-semibold ${(p.stock?.quantityAvailable ?? 0) > 0 ? "text-emerald-600" : "text-slate-400"}`}>
                            {p.stock?.quantityAvailable ?? 0}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )
          ) : loadingPacks ? (
            <div className="flex items-center justify-center h-48"><Loader2 size={28} className="animate-spin text-slate-300" /></div>
          ) : packs.length === 0 ? (
            <div className="flex items-center justify-center h-48"><p className="text-sm text-slate-400">{t("picker_no_packs")}</p></div>
          ) : (
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {packs.map((p) => {
                const disabled = alreadyPackIds.has(p.id);
                const pending = isPackPending(p);
                return (
                  <button key={p.id} type="button" onClick={() => togglePack(p)} disabled={disabled}
                    className={`text-left p-4 rounded-lg border-2 transition-all ${disabled ? "opacity-40 cursor-not-allowed border-slate-200 dark:border-[#2e2e2e]" : pending ? "border-[#B12B89] bg-blue-50/60 dark:bg-blue-900/10" : "border-slate-200 dark:border-[#2e2e2e] hover:border-blue-300 hover:bg-slate-50 dark:hover:bg-[#222222]/50"}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{p.name}</p>
                        <p className="text-xs font-semibold text-blue-500 mt-1">{fmt(p.prixVentePack)} MAD</p>
                      </div>
                      <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${pending ? "bg-[#B12B89] border-[#B12B89]" : "border-slate-300 dark:border-[#3a3a3a]"}`}>
                        {pending && <Check size={11} className="text-white" strokeWidth={3} />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {tab === "products" && totalPages > 1 && (
          <div className="px-8 py-3 border-t border-slate-100 dark:border-[#2e2e2e] flex items-center gap-2 justify-center">
            <button onClick={() => setPage((p) => p - 1)} disabled={page === 1}
              className="p-2 rounded-lg border border-slate-200 dark:border-[#2e2e2e] hover:bg-slate-50 dark:hover:bg-[#222222] disabled:opacity-40 transition">
              <ChevronLeft size={14} className="text-slate-600 dark:text-slate-300" />
            </button>
            <span className="text-xs text-slate-500 tabular-nums">{page} / {totalPages}</span>
            <button onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}
              className="p-2 rounded-lg border border-slate-200 dark:border-[#2e2e2e] hover:bg-slate-50 dark:hover:bg-[#222222] disabled:opacity-40 transition">
              <ChevronLeft size={14} className="text-slate-600 dark:text-slate-300 rotate-180" />
            </button>
          </div>
        )}

        <div className="px-8 py-4 border-t border-slate-100 dark:border-[#2e2e2e] flex items-center justify-end gap-3">
          <button type="button" onClick={onClose}
            className="px-4 h-10 rounded-md border border-slate-300 dark:border-[#2e2e2e] text-slate-700 dark:text-slate-200 text-sm font-medium hover:bg-slate-50 dark:hover:bg-[#222222] transition-colors">
            {t("picker_cancel")}
          </button>
          <button type="button" onClick={handleConfirm} disabled={totalSelected === 0}
            className="inline-flex items-center justify-center gap-2 px-5 h-10 rounded-md text-sm font-medium text-white transition-colors disabled:opacity-50"
            style={{ backgroundColor: BRAND }}>
            <Plus size={14} /> {t("picker_add", { count: totalSelected })}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ══════════════════════════════════════════════════
   MAIN EDIT FORM
══════════════════════════════════════════════════ */
export const AdvancedBonLivraisonEditForm = () => {
  const { t } = useTranslation("commands");
  const { id } = useParams();
  const navigate = useNavigate();
  const updateMutation = useUpdateCommand();

  const { data: commandData, isLoading: isLoadingCommand } = useCommandById(id);
  const command = commandData?.data;

  const [form, setForm] = useState(null);
  const [lines, setLines] = useState([]);
  const [packLines, setPackLines] = useState([]);
  const [livreurType, setLivreurType] = useState("intern");
  const [showHeureInput, setShowHeureInput] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [pendingBack, setPendingBack] = useState(false);

  const savingRef = useRef(false);

  const blockNavigation = useCallback(
    ({ currentLocation, nextLocation }) =>
      isDirty && !savingRef.current && currentLocation.pathname !== nextLocation.pathname,
    [isDirty]
  );
  const blocker = useBlocker(blockNavigation);

  /* Derive edit mode from status */
  const isFullEdit = command ? FULL_EDIT_STATUSES.has(command.commandStatus) : false;
  const isRestricted = command && !isFullEdit;

  /* ── Populate form from API response ── */
  useEffect(() => {
    if (!command) return;

    const doc = command.document;

    setForm({
      clientName: doc.clientName ?? "",
      agenceId: String(command.agenceId ?? ""),
      depotId: String(command.depotId ?? ""),
      dateLivraison: command.dateLivraison ? dayjs(command.dateLivraison).format("YYYY-MM-DD") : "",
      heureLivraison: command.heureLivraison ?? "",
      telephone: command.telephone ?? "",
      whatsapp: command.whatsapp ?? "",
      sameAsPhone: command.telephone === command.whatsapp && !!command.telephone,
      ville: command.ville ?? "",
      localisation: command.localisation ?? "",
      withFacture: command.withFacture === true || !!(command.ice || command.raisonSocial || command.siegeSocial),
      nombreDeColis: String(command.nombreDeColis ?? ""),
      ice: command.ice ?? "",
      raisonSocial: command.raisonSocial ?? "",
      siegeSocial: command.siegeSocial ?? "",
      modeReglement: command.modeReglement ?? "VIREMENT",
      banqueId: command.banqueId ? String(command.banqueId) : "",
      montantPaid: doc.amountPaid && Number(doc.amountPaid) > 0 ? String(doc.amountPaid) : "",
      livreurId: String(command.livreurId ?? ""),
      preparateurId: String(command.preparateurId ?? ""),
      observation: command.observation ?? "",
    });

    // Set livreur type from existing livreur
    if (command.livreur?.type) {
      setLivreurType(command.livreur.type === "INTERN" ? "intern" : "extern");
    }

    // Show heure input if there's a value
    if (command.heureLivraison) setShowHeureInput(true);


    // Map document lines → our local line format
    const mappedLines = (doc.lines ?? []).map((l) => ({
      id: l.id,
      variantId: l.variantId ?? null,
      articleId: l.articleId ?? null,
      name: l.description ?? l.variant?.name ?? l.article?.name ?? "Article",
      quantity: Number(l.quantity),
      unitPrice: Number(l.unitPrice),
      commission: Number(l.commission || 0),
      priceField: l.priceField ?? "prixVente1",
      type: l.variantId ? "VARIANT" : "ARTICLE",
    }));
    setLines(mappedLines);

    // Map pack lines
    const mappedPacks = (command.packLines ?? []).map((p) => ({
      id: p.packId ?? p.id,
      name: p.pack?.name ?? p.name ?? "Pack",
      quantity: Number(p.quantity),
      prixVente: Number(p.prixVente),
      commission: Number(p.commission || 0),
    }));
    setPackLines(mappedPacks);

    setIsDirty(false);
  }, [command]);

  const { data: agencesData, isLoading: agencesLoading } = useAgences();
  const { data: depotsData, isLoading: depotsLoading } = useAdvDepots();
  const agences = agencesData?.data ?? [];
  const depots = depotsData?.data ?? [];

  const selectedAgence = agences.find((a) => String(a.id) === String(form?.agenceId));
  const filteredDepots = selectedAgence
    ? depots.filter((d) => String(d.societeId) === String(selectedAgence.societeId))
    : depots;

  const { data: livreursData, isLoading: livreursLoading } = useLivreurs({
    type: livreurType, societeId: selectedAgence?.societeId,
  });
  const { data: preparateursData, isLoading: preparateursLoading } = usePreparateurs({
    societeId: selectedAgence?.societeId,
  });
  const livreurs = livreursData?.data ?? [];
  const preparateurs = preparateursData?.data ?? [];
  const { data: banquesData, isLoading: banquesLoading } = useBanques();
  const banques = banquesData?.data ?? [];
  const needsBanque = MODES_WITH_BANQUE.includes(form?.modeReglement);

  const isMoroccoPhone = (val) => /^0[67]\d{8}$/.test(val.replace(/\s/g, ""));
  const getVilleValue = (ville) => (typeof ville === "object" ? ville?.name ?? "" : ville ?? "");
  const isVilleValid = (ville) => !!getVilleValue(ville).trim();

  const set = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setIsDirty(true);

    if (name === "agenceId" && isFullEdit) {
      setForm((prev) => ({ ...prev, agenceId: value, depotId: "", livreurId: "", preparateurId: "" }));
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
    if (name === "modeReglement") {
      setForm((prev) => ({
        ...prev,
        modeReglement: value,
        banqueId: MODES_WITH_BANQUE.includes(value) ? prev.banqueId : "",
      }));
      return;
    }
    setForm((prev) => ({ ...prev, [name]: type === "checkbox" ? checked : value }));
  };

  const totalLines = lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0);
  const totalPacks = packLines.reduce((s, p) => s + p.quantity * p.prixVente, 0);
  const totalCommande = totalLines + totalPacks;
  const totalCommission =
    lines.reduce((s, l) => s + l.quantity * Number(l.commission || 0), 0) +
    packLines.reduce((s, p) => s + p.quantity * Number(p.commission || 0), 0);

  const handlePickerConfirm = (newProducts, newPacks) => {
    setLines((prev) => {
      const existingKeys = new Set(prev.map((l) => `${l.type}-${l.variantId ?? l.articleId}`));
      return [...prev, ...newProducts.filter((p) => !existingKeys.has(`${p.type}-${p.variantId ?? p.articleId ?? ""}`))];
    });
    setPackLines((prev) => {
      const existingIds = new Set(prev.map((p) => p.id));
      return [...prev, ...newPacks.filter((p) => !existingIds.has(p.id))];
    });
    setIsDirty(true);
  };

  const updateLine = (idx, field, value) => { setLines((prev) => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l))); setIsDirty(true); };
  const removeLine = (idx) => { setLines((prev) => prev.filter((_, i) => i !== idx)); setIsDirty(true); };
  const updatePack = (idx, field, value) => { setPackLines((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p))); setIsDirty(true); };
  const removePack = (idx) => { setPackLines((prev) => prev.filter((_, i) => i !== idx)); setIsDirty(true); };

  const canSubmit = useCallback(() => {
    if (!form) return false;
    const phoneOk = !!form.telephone.trim() && isMoroccoPhone(form.telephone);
    const waOk = !form.whatsapp || isMoroccoPhone(form.whatsapp);
    const baseOk = !!form.clientName.trim() && phoneOk && waOk && isVilleValid(form.ville) && !!form.nombreDeColis;

    if (isRestricted) return baseOk && !!form.livreurId && !!form.preparateurId;

    return (
      baseOk &&
      !!form.agenceId && !!form.depotId && !!form.dateLivraison &&
      (lines.length + packLines.length) > 0 &&
      !!form.modeReglement &&
      (!needsBanque || !!form.banqueId) &&
      !!form.livreurId && !!form.preparateurId
    );
  }, [form, lines, packLines, isRestricted, needsBanque]);

  const handleSubmit = async () => {
    let payload;

    if (isRestricted) {
      /* Restricted payload — only allowed fields */
      payload = {
        clientName: form.clientName,
        dateLivraison: form.dateLivraison,
        heureLivraison: form.heureLivraison || undefined,
        agenceId: Number(form.agenceId),
        telephone: form.telephone,
        whatsapp: form.whatsapp || undefined,
        ville: typeof form.ville === "object" ? form.ville?.name : form.ville,
        localisation: form.localisation || undefined,
        withFacture: !!form.withFacture,
        ...(form.withFacture
          ? {
              raisonSocial: form.raisonSocial.trim() || undefined,
              ice: form.ice.trim() || undefined,
              siegeSocial: form.siegeSocial.trim() || undefined,
            }
          : {}),
        nombreDeColis: Number(form.nombreDeColis),
        modeReglement: form.modeReglement,
        banqueId: form.banqueId ? Number(form.banqueId) : undefined,
        observation: form.observation.trim() || undefined,
        livreurId: Number(form.livreurId),
        preparateurId: Number(form.preparateurId),
      };
    } else {
      /* Full payload */
      payload = {
        clientName: form.clientName,
        depotId: Number(form.depotId),
        dateLivraison: form.dateLivraison,
        agenceId: Number(form.agenceId),
        telephone: form.telephone,
        whatsapp: form.whatsapp || undefined,
        ville: typeof form.ville === "object" ? form.ville?.name : form.ville,
        localisation: form.localisation || undefined,
        withFacture: !!form.withFacture,
        nombreDeColis: Number(form.nombreDeColis),
        modeReglement: form.modeReglement,
        banqueId: form.banqueId ? Number(form.banqueId) : undefined,
        observation: form.observation.trim() || undefined,
        livreurId: Number(form.livreurId),
        preparateurId: Number(form.preparateurId),
        montantPaid: form.montantPaid ? Number(form.montantPaid) : undefined,
        lines: lines.map((l) => ({
          variantId: l.variantId ?? undefined,
          articleId: !l.variantId ? l.articleId ?? undefined : undefined,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
          priceField: l.priceField ?? "prixVente1",
        })),
        packLines: packLines.map((p) => ({ id: p.id, quantity: p.quantity, prixVente: p.prixVente })),
      };
      if (form.heureLivraison) payload.heureLivraison = form.heureLivraison;
      if (form.withFacture) {
        if (form.ice.trim()) payload.ice = form.ice.trim();
        if (form.raisonSocial.trim()) payload.raisonSocial = form.raisonSocial.trim();
        if (form.siegeSocial.trim()) payload.siegeSocial = form.siegeSocial.trim();
      }
    }

    updateMutation.mutate({ id: Number(id), payload }, {
      onSuccess: () => setShowSuccess(true),
      onError: (err) => toast.error(err?.response?.data?.message || t("toast.update_error")),
    });
  };

  /* ── Loading state ── */
  if (isLoadingCommand || !form) {
    return (
     <SectionLoader />
    );
  }

  const documentNumber = command?.document?.documentNumber ?? `#${id}`;

  /* ══════════════════════════════════
     RENDER
  ══════════════════════════════════ */
  return (
    <div className="-m-4 lg:-m-6 px-3 pt-3">
      <FormPageHeader
        entityName={t("entity_name")}
        backPath="/commandes"
        isEdit={true}
        editTitle={t("edit_title", { number: documentNumber })}
        backLabel={t("back_label")}
        onBack={() => {
          if (isDirty) setPendingBack(true);
          else { savingRef.current = true; navigate("/commandes"); }
        }}
      />

      <div className="w-full mt-3 space-y-4">

        {/* ── Status + document header ── */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-4">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">{t("edit_number")}</p>
              <p className="text-base font-black text-slate-800 dark:text-slate-100">{documentNumber}</p>
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-[#2e2e2e]" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">{t("edit_status")}</p>
              <StatusBadge status={command.commandStatus} />
            </div>
            <div className="w-px h-8 bg-slate-200 dark:bg-[#2e2e2e]" />
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1">{t("edit_created_at")}</p>
              <p className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                {dayjs(command.createdAt).format("DD/MM/YYYY")}
              </p>
            </div>
          </div>
          {/* {isDirty && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
              <div className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
              <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400">Modifications non sauvegardées</span>
            </div>
          )} */}
        </div>

        {/* ── Restricted banner ── */}
        {/* {isRestricted && <RestrictedBanner status={command.commandStatus} />} */}

        {/* ─────────────────────────────────────────
            SECTION 1 — Agence & Livraison
        ───────────────────────────────────────── */}
        <OrderSection title={t("card_agency_delivery")}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <SelectDropDown
              label={t("form_agence")}
              name="agenceId"
              value={form.agenceId}
              options={agences.map((a) => ({ value: a.id, label: a.name, subLabel: a.localisation }))}
              isLoading={agencesLoading}
              onChange={handleChange}
              disabled={isRestricted}
            />
            <SelectDropDown
              label={t("form_depot")}
              name="depotId"
              value={form.depotId}
              options={filteredDepots.map((d) => ({ value: d.id, label: d.name, subLabel: d.societe?.raisonSocial }))}
              isLoading={depotsLoading}
              onChange={handleChange}
              disabled={isRestricted || !form.agenceId}
              placeholder={!form.agenceId ? t("form_select_agence_first") : t("form_select_depot")}
            />
            <FormDatePicker
              label={t("form_date_livraison")}
              name="dateLivraison"
              value={form.dateLivraison}
              onChange={handleChange}
            />
            {/* Heure optional toggle */}
            <div className="flex flex-col">
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 ml-1">
                {t("form_heure_livraison")}
              </label>
              {!showHeureInput ? (
                <button type="button" onClick={() => setShowHeureInput(true)}
                  className="flex items-center gap-2 h-10 px-4 rounded-md border-2 border-dashed border-slate-200 dark:border-[#2e2e2e] text-sm font-medium text-slate-400 dark:text-slate-500 hover:border-blue-300 hover:text-blue-500 transition-all w-full">
                  <Clock size={15} /> {t("form_add_heure")}
                </button>
              ) : (
                <div className="relative">
                  <input type="time" name="heureLivraison" value={form.heureLivraison} onChange={handleChange} autoFocus
                    className="w-full h-10 px-4 bg-white dark:bg-[#222222] border border-slate-200 dark:border-[#2e2e2e] rounded-md text-sm font-semibold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-[#B12B89] outline-none transition pr-10" />
                  <button type="button" onClick={() => { setShowHeureInput(false); set("heureLivraison", ""); }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-red-400 transition">
                    <X size={14} />
                  </button>
                </div>
              )}
            </div>
          </div>
        </OrderSection>

        {/* ─────────────────────────────────────────
            SECTION 2 — Informations client
        ───────────────────────────────────────── */}
        <OrderSection title={t("card_client_info")}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <Input label={t("form_client_name")} name="clientName" value={form.clientName} onChange={handleChange} placeholder={t("form_client_name_placeholder")} />
            <Input
              label={t("form_telephone")} name="telephone" value={form.telephone} onChange={handleChange}
              placeholder="0612345678"
              error={form.telephone && !isMoroccoPhone(form.telephone) ? t("form_telephone_error") : undefined}
            />
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1">WhatsApp</label>
                <label className="flex items-center gap-2 cursor-pointer select-none group">
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 group-hover:text-slate-600 transition">{t("form_same_as_phone")}</span>
                  <div className="relative">
                    <input type="checkbox" name="sameAsPhone" checked={form.sameAsPhone} onChange={handleChange} className="sr-only peer" />
                    <div className="w-9 h-5 bg-slate-200 dark:bg-[#2e2e2e] rounded-full peer peer-checked:bg-[#B12B89] transition-colors after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:w-4 after:h-4 after:transition-all peer-checked:after:translate-x-4 shadow-inner" />
                  </div>
                </label>
              </div>
              <Input name="whatsapp" value={form.whatsapp} onChange={handleChange} disabled={form.sameAsPhone}
                placeholder="0612345678"
                error={form.whatsapp && !form.sameAsPhone && !isMoroccoPhone(form.whatsapp) ? t("form_whatsapp_error") : undefined}
              />
            </div>
          </div>
        </OrderSection>

        <OrderSection title={t("card_delivery_address")}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <CitySearchDropdown
              label={t("form_city")}
              value={form.ville}
              onChange={handleChange}
              placeholder={t("form_city_placeholder")}
              required
            />
            <Input label={t("form_localisation")} name="localisation" value={form.localisation} onChange={handleChange} placeholder={t("form_localisation_placeholder")} />
            <Input label={t("form_nb_colis_req")} name="nombreDeColis" type="number" value={form.nombreDeColis} onChange={handleChange} placeholder="5" />
          </div>
        </OrderSection>

        <OrderSection
          title={t("form_invoice_title")}
          action={
            <FactureToggle
              value={!!form.withFacture}
              onChange={(checked) => set("withFacture", checked)}
              withLabel={t("form_with_facture")}
              withoutLabel={t("form_sans_facture")}
            />
          }
        >
          {form.withFacture ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <Input label={t("confirm_row_ice")} name="ice" value={form.ice} onChange={handleChange} placeholder="001234567890123" />
              <Input label={t("confirm_row_raison_sociale")} name="raisonSocial" value={form.raisonSocial} onChange={handleChange} placeholder={t("form_raison_sociale_placeholder")} />
              <div className="sm:col-span-2">
                <Input label={t("confirm_row_siege_social")} name="siegeSocial" value={form.siegeSocial} onChange={handleChange} placeholder={t("form_siege_social_placeholder")} />
              </div>
            </div>
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">{t("form_sans_facture_hint")}</p>
          )}
        </OrderSection>

        {/* ─────────────────────────────────────────
            SECTION 3 — Articles & Règlement
        ───────────────────────────────────────── */}
        <FormCard
          title={t("card_articles_packs")}
          icon={<ShoppingCart />}
          action={isRestricted ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-[#222222]">
              <Lock size={10} className="text-slate-400" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("edit_locked")}</span>
            </div>
          ) : null}
          bodyClassName={isRestricted ? "opacity-60 pointer-events-none select-none" : ""}
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {lines.length + packLines.length === 0 ? t("edit_no_articles") : t("form_articles_summary", { lines: lines.length, packs: packLines.length })}
            </p>
            {!isRestricted && (
              <button type="button"
                onClick={() => {
                  if (!form.depotId) { toast.error(t("form_err_select_depot")); return; }
                  setIsPickerOpen(true);
                }}
                className="inline-flex items-center justify-center gap-2 px-4 h-10 rounded-md text-sm font-medium text-white transition-colors"
                style={{ backgroundColor: BRAND }}>
                <Plus size={14} /> {t("form_add_articles")}
              </button>
            )}
          </div>

          {lines.length > 0 && (
            <>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-4 mb-1">{t("form_articles_section")}</p>
              <LinesTable lines={lines} onUpdateLine={updateLine} onRemoveLine={removeLine} locked={isRestricted} />
            </>
          )}
          {packLines.length > 0 && (
            <>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mt-4 mb-1">{t("form_packs_section")}</p>
              <PacksTable packs={packLines} onUpdatePack={updatePack} onRemovePack={removePack} locked={isRestricted} />
            </>
          )}
          {lines.length + packLines.length === 0 && !isRestricted && (
            <div className="flex flex-col items-center justify-center py-14 opacity-40">
              <ShoppingCart size={36} className="mb-3 text-slate-400" />
              <p className="text-sm font-semibold text-slate-500">{t("form_no_article_selected")}</p>
            </div>
          )}
        </FormCard>

        {/* Règlement */}
        <FormCard
          title={t("card_amount_reglement")}
          action={isRestricted ? (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 dark:bg-[#222222]">
              <Lock size={10} className="text-slate-400" />
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t("edit_locked")}</span>
            </div>
          ) : null}
          bodyClassName={isRestricted ? "opacity-60 pointer-events-none select-none" : ""}
        >
          <div className="flex items-center justify-between p-5 rounded-lg bg-slate-50 dark:bg-[#222222]/50 border border-slate-200 dark:border-[#2e2e2e] mb-6">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">{t("confirm_financial_total")}</p>
              <p className="text-2xl font-black text-slate-800 dark:text-slate-100 mt-0.5">{fmt(totalCommande)} MAD</p>
            </div>
            <div className="text-right text-xs text-slate-400 space-y-1">
              <p>{t("form_articles_amount", { amount: fmt(totalLines) })}</p>
              <p>{t("form_packs_amount", { amount: fmt(totalPacks) })}</p>
              <p>{t("form_commission_amount", { amount: fmt(totalCommission) })}</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <SelectDropDown
              label={t("form_mode_reglement")}
              name="modeReglement"
              value={form.modeReglement}
              options={MODE_REGLEMENT_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              onChange={handleChange}
              disabled={isRestricted}
            />
            <Input label={t("form_montant_regle")} name="montantPaid" type="number" value={form.montantPaid}
              onChange={handleChange} placeholder="0.00" disabled={isRestricted} />
          </div>
          {needsBanque && (
            <div className="mt-6">
              <SelectDropDown
                label={t("form_banque")}
                name="banqueId"
                value={form.banqueId}
                options={banques.map((b) => ({
                  value: b.id,
                  label: b.name,
                  subLabel: b.RIB,
                }))}
                isLoading={banquesLoading}
                onChange={handleChange}
                placeholder={t("form_select_banque")}
                disabled={isRestricted}
                required
              />
              <p className="mt-2 text-[11px] font-medium text-sky-600 dark:text-sky-400">
                {t("form_banque_hint")}
              </p>
            </div>
          )}
        </FormCard>

        {/* ─────────────────────────────────────────
            SECTION 4 — Livreur & Préparateur
        ───────────────────────────────────────── */}
        <FormCard title={t("card_livreur")} icon={<Truck />}>
          <div className="flex gap-2 mb-6">
            {["intern", "extern"].map((ltype) => (
              <button key={ltype} type="button"
                onClick={() => { setLivreurType(ltype); set("livreurId", ""); }}
                className={`px-4 h-10 rounded-md text-xs font-semibold border transition-all ${livreurType === ltype ? "border-[#B12B89] text-[#B12B89] dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20" : "border-slate-200 dark:border-[#2e2e2e] text-slate-500 dark:text-slate-400 hover:border-slate-300"}`}>
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
          />
        </FormCard>

        <FormCard title={t("card_preparateur_obs")} icon={<Tag />}>
          <div className="space-y-6">
            <SelectDropDown
              label={t("form_preparateur")}
              name="preparateurId"
              value={form.preparateurId}
              options={preparateurs.map((p) => ({ value: p.id, label: p.name, subLabel: p.entityType }))}
              isLoading={preparateursLoading}
              onChange={handleChange}
            />
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1.5 ml-1">
                {t("form_observation")}
              </label>
              <textarea name="observation" value={form.observation} onChange={handleChange} rows={3}
                placeholder={t("form_observation_placeholder")}
                className="w-full px-4 py-3 bg-white dark:bg-[#222222] border border-slate-200 dark:border-[#2e2e2e] rounded-md text-sm text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-[#B12B89] outline-none transition resize-none" />
            </div>
          </div>
        </FormCard>

        <FormActionBar>
          <button
            type="button"
            onClick={() => {
              if (isDirty) setPendingBack(true);
              else { savingRef.current = true; navigate("/commandes"); }
            }}
            className="inline-flex items-center justify-center gap-2 px-4 h-10 rounded-md border border-slate-300 dark:border-[#2e2e2e] text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#222222] transition-colors"
          >
            <ChevronLeft size={15} /> {t("edit_cancel")}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit() || updateMutation.isPending}
            className="inline-flex items-center justify-center gap-2 px-5 h-10 rounded-md text-sm font-medium text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: BRAND }}
          >
            {updateMutation.isPending ? (
              <><Loader2 size={15} className="animate-spin" /> {t("edit_saving")}</>
            ) : (
              <><Save size={15} /> {t("edit_save")}</>
            )}
          </button>
        </FormActionBar>

      </div>

      {/* Product picker modal */}
      {isPickerOpen && (
        <ProductPickerModal
          depotId={Number(form.depotId)}
          onClose={() => setIsPickerOpen(false)}
          onConfirm={handlePickerConfirm}
          alreadyLines={lines}
          alreadyPacks={packLines}
        />
      )}

      {/* Success overlay */}
      {showSuccess && (
        <SuccessOverlay onClose={() => { setShowSuccess(false); savingRef.current = true; navigate("/commandes"); }} />
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