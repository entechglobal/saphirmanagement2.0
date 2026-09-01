// src/features/packs/pages/PackForm.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { toast } from "@/shared/utils/toast";
import {
  ArrowLeft,
  Package,
  Plus,
  Trash2,
  Search,
  X,
  Check,
  Loader2,
  ChevronLeft,
  ChevronRight,
  QrCode,
  TrendingUp,
  Percent,
  DollarSign,
  AlertCircle,
  Minus,

} from "lucide-react";
import { useAuth } from "@/features/auth";
import {
  useCreatePack,
  useUpdatePack,
  useSocietesForPacks,
  useProductsPicker,
  usePackById,
} from "../hooks/usePacks";
import { FormPageHeader } from "@/shared/components/FormPageHeader";
import { Input } from "@/shared/components/Input";
import { SelectDropDown as Select } from "@/shared/components/SelectDropDown";
import { usePriceField, PriceFieldDropDown } from "@/shared/components/PriceFieldDropDown";
import { SectionLoader } from "@/shared/components/loadersCollections/SectionLoader";
import { generateBarcode } from "../../../utils/barcodeUtils";
import { FormCard } from "@/shared/components/FormCard";
import { FormActions } from "@/shared/components/FormActions";

const BRAND = "#C86AAC";

/* ─── helpers ─────────────────────────────────────────── */
const fmt = (n) =>
  Number(n || 0).toLocaleString("fr-FR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const PRICING_MODE_ICONS = { marge: TrendingUp, remise: Percent, personnalise: DollarSign };

/* ─── sub-components ──────────────────────────────────── */

const Checkbox = ({ checked, indeterminate = false, onChange, disabled = false }) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      if (!disabled) onChange();
    }}
    disabled={disabled}
    className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${disabled
      ? "bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 cursor-not-allowed opacity-40"
      : checked || indeterminate
        ? "bg-[#C86AAC] border-[#C86AAC]"
        : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-[#C86AAC]"
      }`}
  >
    {!disabled && indeterminate && !checked ? (
      <Minus className="w-3 h-3 text-white" strokeWidth={3} />
    ) : checked && !disabled ? (
      <Check className="w-3 h-3 text-white" strokeWidth={3} />
    ) : null}
  </button>
);

/* ─── Product Picker Modal ────────────────────────────── */
const ProductPickerModal = ({
  onClose,
  onConfirm,
  alreadyInTable,
  defaultPriceField = "prixVente1",
}) => {
  const { t } = useTranslation("packs");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [priceField, setPriceField] = usePriceField(true, defaultPriceField);
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState([]);

  /* debounce search */
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, priceField]);

  const { data, isLoading, isFetching } = useProductsPicker({
    priceField,
    search: debouncedSearch,
    page,
    limit: 10,
  });

  const products = data?.data ?? [];
  const pagination = data?.pagination ?? { totalPages: 1, page: 1, total: 0 };

  const alreadyKeys = new Set(
    alreadyInTable.map((c) =>
      c.variantId ? `variant-${c.variantId}` : `article-${c.articleId}`
    )
  );

  const itemKey = (p) =>
    p.type === "variant" ? `variant-${p.variantId}` : `article-${p.articleId}`;

  const isPending = (p) => pending.some((x) => itemKey(x) === itemKey(p));
  const isDisabled = (p) => alreadyKeys.has(itemKey(p));

  const handleToggle = (p) => {
    if (isDisabled(p)) return;
    if (isPending(p)) {
      setPending((prev) => prev.filter((x) => itemKey(x) !== itemKey(p)));
    } else {
      setPending((prev) => [...prev, { ...p, selectedPriceField: priceField }]);
    }
  };

  const eligible = products.filter((p) => !isDisabled(p));
  const pendingOnPage = eligible.filter((p) => isPending(p)).length;
  const allChecked = eligible.length > 0 && pendingOnPage === eligible.length;
  const someChecked = pendingOnPage > 0 && pendingOnPage < eligible.length;

  const handleToggleAll = () => {
    if (allChecked) {
      const keys = new Set(eligible.map(itemKey));
      setPending((prev) => prev.filter((x) => !keys.has(itemKey(x))));
    } else {
      const toAdd = eligible
        .filter((p) => !isPending(p))
        .map((p) => ({ ...p, selectedPriceField: priceField }));
      setPending((prev) => [...prev, ...toAdd]);
    }
  };

  return (
    <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 max-w-2xl w-full max-h-[88vh] overflow-hidden flex flex-col shadow-2xl">
        {/* Header */}
        <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
              {t("picker.title")}
            </h2>
            <p className="text-[10px] text-slate-400 mt-0.5">
              {pagination.total} {t("picker.available")}
              {pending.length > 0 && (
                <span className="ml-2 text-[#C86AAC] font-semibold">
                  · {pending.length} {pending.length > 1 ? t("picker.selected_plural") : t("picker.selected")}
                </span>
              )}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>

        {/* Filters */}
        <div className="px-8 py-4 border-b border-slate-100 dark:border-slate-800 space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder={t("picker.search_placeholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 h-[42px] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#C86AAC] outline-none transition text-sm dark:text-slate-100"
              autoFocus
            />
          </div>
          <PriceFieldDropDown
            value={priceField}
            onChange={(e) => { setPriceField(e.target.value); setPage(1); }}
            placeholder={t("picker.price_grid", "Grille de prix")}
          />
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {isLoading || isFetching ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="w-7 h-7 animate-spin text-slate-400" />
            </div>
          ) : products.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
                  <th className="px-6 py-3 w-12">
                    <Checkbox
                      checked={allChecked}
                      indeterminate={someChecked}
                      onChange={handleToggleAll}
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {t("picker.col_product")}
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {t("picker.col_buy_price")}
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {t("picker.col_sell_price")}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {products.map((product) => {
                  const disabled = isDisabled(product);
                  const pend = isPending(product);
                  return (
                    <tr
                      key={itemKey(product)}
                      onClick={() => handleToggle(product)}
                      className={`transition-colors ${disabled
                        ? "opacity-40 cursor-not-allowed bg-slate-50/50 dark:bg-slate-800/20"
                        : pend
                          ? "bg-[#C86AAC]/10 dark:bg-[#C86AAC]/10 cursor-pointer"
                          : "hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer"
                        }`}
                    >
                      <td className="px-6 py-3.5">
                        <Checkbox
                          checked={pend}
                          disabled={disabled}
                          onChange={() => handleToggle(product)}
                        />
                      </td>
                      <td className="px-4 py-3.5">
                        <p
                          className={`font-semibold text-sm ${pend && !disabled
                            ? "text-[#C86AAC] dark:text-[#C86AAC]"
                            : "text-slate-800 dark:text-slate-100"
                            }`}
                        >
                          {product.name}
                          {disabled && (
                            <span className="ml-2 text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                              {t("picker.already_added")}
                            </span>
                          )}
                        </p>
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                          {product.barcode}
                          <span
                            className={`ml-2 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded ${product.type === "variant"
                              ? "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400"
                              : "bg-[#C86AAC]/10 dark:bg-[#C86AAC]/20 text-[#C86AAC]"
                              }`}
                          >
                            {product.type === "variant" ? t("picker.type_variant") : t("picker.type_article")}
                          </span>
                        </p>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="text-xs font-medium text-slate-500">
                          {fmt(product.prixAchat)} DH
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-right">
                        <span className="text-sm font-bold text-green-700 dark:text-green-400">
                          {fmt(product.prixVente)} DH
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 opacity-50">
              <Package className="w-8 h-8 mb-2 text-slate-400" />
              <p className="text-sm font-semibold text-slate-500">
                {t("picker.empty")}
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-8 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
          {pagination.totalPages > 1 ? (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page === 1}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600" />
              </button>
              <span className="text-xs text-slate-500">
                {page} / {pagination.totalPages}
              </span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page === pagination.totalPages}
                className="p-2 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition"
              >
                <ChevronRight className="w-4 h-4 text-slate-600" />
              </button>
            </div>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition font-semibold text-sm"
            >
              {t("picker.cancel")}
            </button>
            <button
              onClick={() => onConfirm(pending)}
              disabled={pending.length === 0}
              className="flex items-center gap-2 px-5 py-2 bg-[#C86AAC] hover:bg-[#B05596] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition font-semibold text-sm"
            >
              <Plus className="w-4 h-4" />
              {t("picker.add")} ({pending.length})
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ─── Main Form ───────────────────────────────────────── */

/**
 * PackForm
 * props:
 *  - id          : pack id (edit mode)
 *  - initialValues: { data: Pack } from usePackById (edit mode)
 *  - mode        : "create" | "edit"
 */
export const PackForm = ({ id, initialValues, mode = "create" }) => {
  const { t } = useTranslation("packs");

  const pricingModes = [
    { key: "marge", label: t("form.pricing_modes.marge_label"), icon: PRICING_MODE_ICONS.marge, desc: t("form.pricing_modes.marge_desc") },
    { key: "remise", label: t("form.pricing_modes.remise_label"), icon: PRICING_MODE_ICONS.remise, desc: t("form.pricing_modes.remise_desc") },
    { key: "personnalise", label: t("form.pricing_modes.personnalise_label"), icon: PRICING_MODE_ICONS.personnalise, desc: t("form.pricing_modes.personnalise_desc") },
  ];

  const { id: routeId } = useParams();
  const effectiveId = id ?? routeId;
  const isEditMode = (mode === "edit" || !!effectiveId) && !!effectiveId;
  const { data: fetchedPackData, isLoading: packLoading } = usePackById(
    isEditMode ? effectiveId : undefined
  );
  const packData = initialValues?.data ?? fetchedPackData?.data;
  const navigate = useNavigate();
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "SUPERADMIN" || user?.isSuperAdmin;

  /* mutations */
  const createMutation = useCreatePack();
  const updateMutation = useUpdatePack();
  const mutation = isEditMode ? updateMutation : createMutation;

  /* societes for super admin */
  const { data: societesData, isLoading: societesLoading } =
    useSocietesForPacks();
  const societes = societesData?.data ?? [];

  /* ── form state ── */
  const [formData, setFormData] = useState({
    barcode: "",
    name: "",
    active: true,
    societeId: "",
    pricingMode: "personnalise", // "marge" | "remise" | "personnalise"
    // marge
    tauxMarge: "",
    // remise
    remise: "",
    // personnalise
    prixVentePack: "",
  });

  /* components table */
  const [components, setComponents] = useState([]);
  /* computed totals (updated whenever components change) */
  const [totals, setTotals] = useState({ coutRevient: 0, montantVente: 0 });

  const [errors, setErrors] = useState({});
  const [initialFormData, setInitialFormData] = useState(null);
  const [showPicker, setShowPicker] = useState(false);

  /* ── recompute totals when components change ── */
  useEffect(() => {
    let cout = 0;
    let vente = 0;
    components.forEach((c) => {
      const qty = parseFloat(c.quantity) || 0;
      cout += parseFloat(c.prixAchat || 0) * qty;
      vente += parseFloat(c.prixVente || 0) * qty;
    });
    setTotals({
      coutRevient: parseFloat(cout.toFixed(2)),
      montantVente: parseFloat(vente.toFixed(2)),
    });
  }, [components]);

  /* ── load edit data ── */
  useEffect(() => {
    if (isEditMode && packData) {
      /* detect pricing mode from stored data */
      const storedTauxMarge = parseFloat(packData.tauxMarge || 0);
      const storedRemise = parseFloat(packData.remise || 0);
      let pricingMode = "personnalise";
      if (storedTauxMarge > 0) pricingMode = "marge";
      else if (storedRemise > 0) pricingMode = "remise";

      const initial = {
        barcode: packData.barcode || "",
        name: packData.name || "",
        active: packData.active ?? true,
        societeId: packData.societeId || "",
        pricingMode,
        tauxMarge: storedTauxMarge > 0 ? String(storedTauxMarge) : "",
        remise: storedRemise > 0 ? String(storedRemise) : "",
        prixVentePack:
          pricingMode === "personnalise"
            ? String(packData.prixVentePack || "")
            : "",
      };
      setFormData(initial);
      setInitialFormData(initial);

      /* map components from API to our internal shape */
      const mapped = (packData.components || []).map((comp) => {
        const isVariant = !!comp.variant;
        const article = isVariant ? comp.variant.article : comp.article;
        return {
          // identifiers for payload
          articleId: isVariant ? null : comp.article?.id ?? null,
          variantId: isVariant ? comp.variant?.id ?? null : null,
          // display
          name: isVariant
            ? `${comp.variant.article.name} — ${comp.variant.name}`
            : comp.article?.name ?? "",
          barcode: isVariant ? comp.variant?.barcode : comp.article?.barcode,
          type: isVariant ? "variant" : "article",
          priceField: comp.priceField || "prixVente1",
          quantity: String(comp.quantity || 1),
          prixAchat: parseFloat(article?.prixAchat || 0),
          // prixVente depends on priceField
          prixVente: parseFloat(
            article?.[comp.priceField || "prixVente1"] || 0
          ),
        };
      });
      setComponents(mapped);
    }
  }, [isEditMode, packData]);

  /* ── handlers ── */
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: "" }));
  };

  const handlePricingModeChange = (mode) => {
    setFormData((prev) => ({ ...prev, pricingMode: mode }));
    setErrors((prev) => ({
      ...prev,
      tauxMarge: "",
      remise: "",
      prixVentePack: "",
    }));
  };

  /* Add products from modal */
  const handlePickerConfirm = useCallback(
    (picked) => {
      setComponents((prev) => {
        const existingKeys = new Set(
          prev.map((c) =>
            c.variantId ? `variant-${c.variantId}` : `article-${c.articleId}`
          )
        );
        const toAdd = picked
          .filter((p) => {
            const k =
              p.type === "variant"
                ? `variant-${p.variantId}`
                : `article-${p.articleId}`;
            return !existingKeys.has(k);
          })
          .map((p) => ({
            articleId: p.articleId || null,
            variantId: p.variantId || null,
            name: p.name,
            barcode: p.barcode,
            type: p.type,
            priceField: p.selectedPriceField || "prixVente1",
            quantity: "1",
            prixAchat: parseFloat(p.prixAchat || 0),
            prixVente: parseFloat(p.prixVente || 0),
          }));
        return [...prev, ...toAdd];
      });
      setShowPicker(false);
      if (errors.components) setErrors((prev) => ({ ...prev, components: "" }));
    },
    [errors.components]
  );

  const handleRemoveComponent = (idx) => {
    setComponents((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleComponentChange = (idx, field, value) => {
    setComponents((prev) =>
      prev.map((c, i) => {
        if (i !== idx) return c;
        const updated = { ...c, [field]: value };
        // if priceField changes, recalculate prixVente using stored article prices
        // (prixVente is already fixed at the time of picking so we just track the field)
        return updated;
      })
    );
  };


  const handleGenerateBarcode = () => {
    setFormData((prev) => ({ ...prev, barcode: generateBarcode() }));
    if (errors.barcode) setErrors((prev) => ({ ...prev, barcode: "" }));
  };

  /* ── validation ── */
  const validate = () => {
    const e = {};
    if (!formData.barcode.trim()) e.barcode = t("form.validation.barcode_required");
    if (!formData.name.trim()) e.name = t("form.validation.name_required");
    if (isSuperAdmin && !formData.societeId) e.societeId = t("form.validation.societe_required");
    if (components.length === 0)
      e.components = t("form.validation.components_required");

    components.forEach((c, i) => {
      const qty = parseFloat(c.quantity);
      if (!c.quantity || isNaN(qty) || qty <= 0) {
        e[`qty_${i}`] = t("form.validation.qty_required");
      }
    });

    if (formData.pricingMode === "marge") {
      if (formData.tauxMarge === "" || formData.tauxMarge === null)
        e.tauxMarge = t("form.validation.margin_required");
      else if (parseFloat(formData.tauxMarge) < 0)
        e.tauxMarge = t("form.validation.must_be_gte_zero");
    } else if (formData.pricingMode === "remise") {
      if (formData.remise === "" || formData.remise === null)
        e.remise = t("form.validation.discount_required");
      else if (parseFloat(formData.remise) < 0) e.remise = t("form.validation.must_be_gte_zero");
    } else {
      if (!formData.prixVentePack)
        e.prixVentePack = t("form.validation.price_required");
      else if (parseFloat(formData.prixVentePack) <= 0)
        e.prixVentePack = t("form.validation.must_be_gt_zero");
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  /* ── compute estimated selling price for display ── */
  const estimatedPrice = (() => {
    if (formData.pricingMode === "marge") {
      const m = parseFloat(formData.tauxMarge);
      if (!isNaN(m) && m >= 0)
        return totals.coutRevient + totals.coutRevient * (m / 100);
    } else if (formData.pricingMode === "remise") {
      const r = parseFloat(formData.remise);
      if (!isNaN(r) && r >= 0)
        return totals.montantVente - (totals.montantVente * r) / 100;
    } else {
      const p = parseFloat(formData.prixVentePack);
      if (!isNaN(p) && p > 0) return p;
    }
    return null;
  })();

  /* ── submit ── */
  const handleSubmit = async () => {
    if (!validate()) {
      toast.error(t("form.toast.form_errors"));
      return;
    }

    const mappedComponents = components
      .map((c) => {
        const articleId = c.articleId ? Number(c.articleId) : null;
        const variantId = c.variantId ? Number(c.variantId) : null;
        const base = {
          quantity: parseFloat(c.quantity),
          priceField: c.priceField,
        };

        // Backend expects exactly one identity key per component object.
        if (variantId) return { ...base, variantId };
        if (articleId) return { ...base, articleId };
        return null;
      })
      .filter(Boolean);

    if (mappedComponents.length !== components.length) {
      toast.error(t("form.toast.component_id_error"));
      return;
    }

    if (isEditMode) {
      /* send only changed fields */
      const payload = {
        barcode: formData.barcode,
        name: formData.name,
        active: formData.active,
        components: mappedComponents,
      };

      /* pricing fields */
      if (formData.pricingMode === "marge") {
        payload.coutRevient = totals.coutRevient;
        payload.tauxMarge = parseFloat(formData.tauxMarge);
      } else if (formData.pricingMode === "remise") {
        payload.montantVenteArticles = totals.montantVente;
        payload.remise = parseFloat(formData.remise);
      } else {
        payload.prixVentePack = parseFloat(formData.prixVentePack);
      }

      /* diff with initial */
      if (initialFormData) {
        const changed = {};
        Object.keys(payload).forEach((k) => {
          if (k === "components") {
            changed.components = payload.components; // always send if present
          } else if (payload[k] !== initialFormData[k]) {
            changed[k] = payload[k];
          }
        });
        if (Object.keys(changed).length === 0) {
          toast.info(t("form.toast.no_changes"));
          return;
        }
        try {
          await updateMutation.mutateAsync({ id: effectiveId, payload: changed });
          toast.success(t("form.toast.update_success"));
          navigate("/packs");
        } catch (err) {
          toast.error(
            err?.response?.data?.message || t("form.toast.update_error")
          );
        }
      }
    } else {
      /* create */
      const payload = {
        barcode: formData.barcode,
        name: formData.name,
        components: mappedComponents,
      };

      if (formData.pricingMode === "marge") {
        payload.coutRevient = totals.coutRevient;
        payload.tauxMarge = parseFloat(formData.tauxMarge);
      } else if (formData.pricingMode === "remise") {
        payload.montantVenteArticles = totals.montantVente;
        payload.remise = parseFloat(formData.remise);
      } else {
        payload.prixVentePack = parseFloat(formData.prixVentePack);
      }

      try {
        await createMutation.mutateAsync({
          payload,
          societeId: isSuperAdmin ? Number(formData.societeId) : undefined,
        });
        toast.success(t("form.toast.create_success"));
        navigate("/packs");
      } catch (err) {
        toast.error(
          err?.response?.data?.message || t("form.toast.create_error")
        );
      }
    }
  };

  const societesOptions = societes.map((s) => ({
    value: s.id,
    label: s.raisonSocial,
  }));

  if ((societesLoading && isSuperAdmin) || (isEditMode && packLoading))
    return <SectionLoader />;

  return (
    <div className="-m-4 lg:-m-6 px-3 pt-3">
      <FormPageHeader
        entityName={t("form.entity_name")}
        backPath="/packs"
        isEdit={isEditMode}
        data={packData}
        createTitle={t("form.create_title")}
        editTitle={t("form.edit_title")}
        backLabel={t("form.back_label")}
      />

      <div className="space-y-6">
        {/* ── Identification ── */}
        <FormCard
          title={t("form.sections.general")}
          icon={<Package size={18} />}
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label={t("form.fields.name")}
              name="name"
              placeholder={t("form.fields.name_placeholder")}
              value={formData.name}
              onChange={handleChange}
              error={errors.name}
              required
            />
            <div className="flex flex-col gap-1">
              {/* 1. The Label stays on top of everything */}
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 ml-1">
                {t("form.fields.barcode")} <span className="text-red-500">*</span>
              </label>

              {/* 2. This container holds the Input + Button and handles the error layout */}
              <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] items-start gap-2">
                <div className="flex-1">
                  <Input
                    label=""
                    name="barcode"
                    placeholder={t("form.fields.barcode_placeholder")}
                    value={formData.barcode}
                    onChange={handleChange}
                    error={errors.barcode}
                    required
                  />
                </div>

                <button
                  type="button"
                  onClick={handleGenerateBarcode}
                  className="
                                h-[42px] px-4 
                                inline-flex items-center justify-center gap-2
                                text-sm font-semibold rounded-xl
                                border border-slate-300 bg-slate-50 text-slate-700
                                hover:bg-slate-100 transition whitespace-nowrap
                                w-full sm:w-auto
                              "
                >
                  <QrCode size={16} />
                  {t("form.fields.generate")}
                </button>
              </div>
            </div>
            {isSuperAdmin && (
              <Select
                label={t("form.fields.societe")}
                name="societeId"
                value={formData.societeId}
                onChange={handleChange}
                error={errors.societeId}
                options={societesOptions}
                required
                title={t("form.fields.select_societe")}
              />
            )}
          </div>
        </FormCard>

        <FormCard
          title={t("form.sections.components")}
          action={
            <button
              type="button"
              onClick={() => setShowPicker(true)}
              className="inline-flex items-center justify-center gap-2 px-4 h-10 rounded-md bg-[#C86AAC] hover:bg-[#B05596] text-white text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              {t("form.components_table.add_products")}
            </button>
          }
        >

          {errors.components && (
            <div className="mb-3 flex items-center gap-2 text-red-500 text-xs font-semibold">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              {errors.components}
            </div>
          )}

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
                  <th className="px-6 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {t("form.components_table.product")}
                  </th>
                  <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {t("form.components_table.qty")}
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {t("form.components_table.buy_price")}
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {t("form.components_table.sell_price")}
                  </th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                    {t("form.components_table.subtotal")}
                  </th>
                  <th className="px-6 py-3 w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {components.length > 0 ? (
                  components.map((comp, idx) => {
                    const qty = parseFloat(comp.quantity) || 0;
                    const subtotal = qty * (comp.prixVente || 0);
                    return (
                      <tr
                        key={idx}
                        className="hover:bg-[#C86AAC]/5 dark:hover:bg-[#C86AAC]/10 transition-colors"
                      >
                        <td className="px-6 py-3.5">
                          <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[200px]">
                            {comp.name}
                          </p>
                          <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                            {comp.barcode}
                          </p>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <input
                            type="number"
                            min="1"
                            value={comp.quantity}
                            onChange={(e) =>
                              handleComponentChange(
                                idx,
                                "quantity",
                                e.target.value
                              )
                            }
                            className={`w-20 px-2 py-1.5 text-center text-sm font-bold bg-white dark:bg-slate-800 border rounded-xl outline-none focus:ring-2 focus:ring-[#C86AAC] transition dark:text-slate-100 ${errors[`qty_${idx}`]
                              ? "border-red-400"
                              : "border-slate-200 dark:border-slate-700"
                              }`}
                          />
                          {errors[`qty_${idx}`] && (
                            <p className="text-[9px] text-red-500 mt-0.5">
                              {errors[`qty_${idx}`]}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="text-xs text-slate-500">
                            {fmt(comp.prixAchat)} DH
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="text-xs font-semibold text-green-700 dark:text-green-400">
                            {fmt(comp.prixVente)} DH
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-right">
                          <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                            {fmt(subtotal)} DH
                          </span>
                        </td>
                        <td className="px-6 py-3.5">
                          <button
                            type="button"
                            onClick={() => handleRemoveComponent(idx)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="6" className="py-14 text-center">
                      <div className="flex flex-col items-center gap-2 opacity-40">
                        <Package className="w-10 h-10 text-slate-400" />
                        <p className="text-sm font-semibold text-slate-500">
                          {t("form.components_table.empty")}
                        </p>
                        <p className="text-xs text-slate-400">
                          {t("form.components_table.empty_hint")}
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </FormCard>

        {/* ── Pricing strategy ── */}
        <FormCard title={t("form.sections.pricing")}>
          {/* Mode selector tabs */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            {pricingModes.map(({ key, label, icon: Icon, desc }) => {
              const active = formData.pricingMode === key;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handlePricingModeChange(key)}
                  className={`flex flex-col items-start gap-1 p-3 rounded-xl border-2 text-left transition-all ${active
                    ? "border-[#C86AAC] bg-[#C86AAC]/10 dark:bg-[#C86AAC]/20"
                    : "border-slate-200 dark:border-slate-700 hover:border-[#C86AAC]/50 hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    }`}
                >
                  <div className="flex items-center gap-2">
                    <Icon
                      className={`w-4 h-4 ${active ? "text-[#C86AAC]" : "text-slate-400"
                        }`}
                    />
                    <span
                      className={`text-sm font-bold ${active
                        ? "text-[#C86AAC] dark:text-[#C86AAC]"
                        : "text-slate-600 dark:text-slate-300"
                        }`}
                    >
                      {label}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 leading-tight">
                    {desc}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Mode-specific input */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {formData.pricingMode === "marge" && (
              <>
                <Input
                  label={t("form.fields.margin_rate")}
                  type="number"
                  name="tauxMarge"
                  placeholder={t("form.fields.margin_rate_placeholder")}
                  value={formData.tauxMarge}
                  onChange={handleChange}
                  error={errors.tauxMarge}
                  required
                />
                <Input
                  label={t("form.fields.cost_price")}
                  type="text"
                  value={`${fmt(totals.coutRevient)} DH`}
                  disabled
                />
              </>
            )}

            {formData.pricingMode === "remise" && (
              <>
                <Input
                  label={t("form.fields.discount")}
                  type="number"
                  name="remise"
                  placeholder={t("form.fields.discount_placeholder")}
                  value={formData.remise}
                  onChange={handleChange}
                  error={errors.remise}
                  required
                />
                <Input
                  label={t("form.fields.sale_amount")}
                  type="text"
                  value={`${fmt(totals.montantVente)} DH`}
                  disabled
                />
              </>
            )}

            {formData.pricingMode === "personnalise" && (
              <Input
                label={t("form.fields.custom_price")}
                type="number"
                name="prixVentePack"
                placeholder={t("form.fields.custom_price_placeholder")}
                value={formData.prixVentePack}
                onChange={handleChange}
                error={errors.prixVentePack}
                required
              />
            )}

            {/* Estimated price preview */}
            {estimatedPrice !== null && (
              <div className="flex flex-col justify-center p-3 rounded-xl bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800">
                <p className="text-[10px] font-bold uppercase tracking-wider text-green-600 dark:text-green-400">
                  {t("form.fields.estimated_price")}
                </p>
                <p className="text-2xl font-black text-green-700 dark:text-green-300 mt-1">
                  {fmt(estimatedPrice)} DH
                </p>
              </div>
            )}
          </div>
        </FormCard>

        {/* ── Status ── */}
        {isEditMode && (
          <FormCard title={t("form.sections.status")}>
            <label className="flex items-center justify-between cursor-pointer group">
              <div className="flex flex-col pr-4">
                <span className="text-sm font-bold text-slate-800 dark:text-slate-200">
                  {t("form.fields.active_label")}
                </span>
                <span className="text-[11px] text-slate-500">
                  {t("form.fields.active_desc")}
                </span>
              </div>
              <div className="relative flex items-center shrink-0">
                <input
                  type="checkbox"
                  name="active"
                  checked={formData.active}
                  onChange={handleChange}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-200 dark:bg-slate-800 rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#C86AAC] shadow-inner" />
              </div>
            </label>
          </FormCard>
        )}

        <FormActions
          onCancel={() => navigate("/packs")}
          cancelLabel={t("form.actions.cancel")}
          submitLabel={
            mutation.isPending
              ? (isEditMode ? t("form.actions.saving") : t("form.actions.creating"))
              : (isEditMode ? t("form.actions.save") : t("form.actions.create"))
          }
          isLoading={mutation.isPending}
          submitType="button"
          onSubmit={handleSubmit}
        />
      </div>

      {/* Product Picker Modal */}
      {showPicker && (
        <ProductPickerModal
          onClose={() => setShowPicker(false)}
          onConfirm={handlePickerConfirm}
          alreadyInTable={components}
          defaultPriceField="prixVente1"
        />
      )}
    </div>
  );
};
