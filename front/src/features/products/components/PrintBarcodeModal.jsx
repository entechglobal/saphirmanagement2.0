import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import JsBarcode from "jsbarcode";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import {
  Package, Printer, Check, Loader2, ChevronLeft,
  ChevronRight, Minus, Eye, ArrowLeft,
} from "lucide-react";
import { toast } from "@/shared/utils/toast";

import { BaseModal } from "../../../shared/components/BaseModal";
import { PriceFieldDropDown, usePriceField } from "../../../shared/components/PriceFieldDropDown";
import { useLabelProducts, useGenerateLabels, useGeneratePackLabels } from "../hooks/useLabels";
import { useDepots } from "../../repositories/hooks/useRepositories";
import { usePacks } from "../../saphirmanagement/packs/hooks/usePacks";

// ─── Barcode helpers (Code 128 via jsbarcode — handles numeric AND alphanumeric) ─
const JSOPTS = { format: "CODE128", displayValue: false, margin: 3, width: 1, height: 100 };

// React preview component — renders jsbarcode into an <svg> ref
const BarcodePreview = ({ value, small }) => {
  const svgRef = useRef(null);
  useEffect(() => {
    const el = svgRef.current;
    if (!el || !value) return;
    try {
      JsBarcode(el, String(value).trim(), {
        ...JSOPTS,
        height: small ? 20 : 30,
        width: small ? 0.9 : 1.2,
        margin: 2,
      });
      el.removeAttribute("width");
      el.removeAttribute("height");
      el.setAttribute("preserveAspectRatio", "none");
    } catch {}
  }, [value, small]);

  if (!value) return null;
  return (
    <svg
      ref={svgRef}
      style={{ display: "block", width: "100%", height: small ? "20px" : "30px" }}
    />
  );
};

// SVG string for the print window — uses document.createElementNS so it runs in-browser
function barcodeSVGString(value) {
  const str = String(value ?? "").trim();
  if (!str) return "";
  try {
    const el = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    JsBarcode(el, str, JSOPTS);
    el.removeAttribute("width");
    el.removeAttribute("height");
    el.setAttribute("preserveAspectRatio", "none");
    el.setAttribute("shape-rendering", "crispEdges");
    el.style.cssText = "display:block;width:100%;height:100%";
    return el.outerHTML;
  } catch {
    return "";
  }
}

// ─── Checkbox ─────────────────────────────────────────────────────────────────
const Checkbox = ({ checked, indeterminate = false, onChange, disabled = false }) => (
  <button
    type="button"
    onClick={(e) => { e.stopPropagation(); if (!disabled) onChange(); }}
    disabled={disabled}
    className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
      disabled
        ? "bg-slate-100 dark:bg-[#2e2e2e] border-slate-200 dark:border-[#3a3a3a] cursor-not-allowed opacity-40"
        : checked || indeterminate
        ? "bg-[#B12B89] border-[#B12B89]"
        : "bg-white dark:bg-[#222222] border-slate-300 dark:border-[#3a3a3a] hover:border-blue-400"
    }`}
  >
    {!disabled && indeterminate && !checked && <Minus className="w-3 h-3 text-white" strokeWidth={3} />}
    {checked && !disabled && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
  </button>
);

// ─── Constants ─────────────────────────────────────────────────────────────────
const itemKey = (p) => `${p.type}-${p.id}`;

const LABEL_TYPES = ["avecPrix", "sansPrix", "parametre", "intitule"];

const SIZES = ["50x25", "30x15"];

// ─── Label Preview Card ───────────────────────────────────────────────────────
const LabelPreviewCard = ({ label }) => {
  const { labelType, designation, barcode, priceLabel, parametreCode, size, quantity } = label;
  const small = size === "30x15";
  // barcode visual always comes from the original barcode field
  const showBarcode = labelType !== "intitule" && barcode;
  // text displayed below the barcode bars
  const barcodeText = labelType === "parametre" ? (parametreCode ?? barcode) : barcode;
  const showPrice = (labelType === "avecPrix" || labelType === "intitule" || labelType === "parametre") && priceLabel;

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      {/* Quantity badge */}
      {quantity > 1 && (
        <div style={{
          position: "absolute", top: "-9px", right: "-9px", zIndex: 1,
          background: "#B12B89", color: "white", borderRadius: "9999px",
          fontSize: "9px", fontWeight: "700", padding: "1px 6px",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}>
          ×{quantity}
        </div>
      )}

      <div
        className="border border-dashed border-slate-300 dark:border-[#3a3a3a] bg-white rounded flex flex-col items-center justify-center"
        style={{
          width: small ? "113px" : "189px",
          height: small ? "57px" : "94px",
          padding: "3px",
          fontFamily: "monospace",
          overflow: "hidden",
        }}
      >
        <p
          className="font-bold text-black text-center leading-tight w-full"
          style={{ fontSize: small ? "6px" : "8px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
        >
          {designation}
        </p>

        {showBarcode && (
          <div className="flex flex-col items-center w-full" style={{ marginTop: "2px", overflow: "hidden" }}>
            <div style={{ width: "100%" }}>
              <BarcodePreview value={barcode} small={small} />
            </div>
            <p className="text-black text-center font-semibold" style={{ fontSize: small ? "6px" : "8px", letterSpacing: "0.06em", marginTop: "1px" }}>
              {barcodeText}
            </p>
          </div>
        )}

        {showPrice && (
          <p className="font-bold text-black" style={{ fontSize: small ? "7px" : "10px", marginTop: "2px" }}>
            {priceLabel}
          </p>
        )}
      </div>
    </div>
  );
};

// ─── Config Panel ─────────────────────────────────────────────────────────────
const ConfigPanel = ({
  mode,
  labelType, setLabelType,
  priceField, setPriceField,
  size, setSize,
  quantityMode, setQuantityMode,
  quantity, setQuantity,
  selectedDepots, toggleDepot,
  allDepots,
  prefix, setPrefix,
  suffix, setSuffix,
  singleItem,
  inputClass,
}) => {
  const { t } = useTranslation("printBarcode");
  const needsPriceField = labelType !== "sansPrix";

  return (
    <div className="w-72 flex-shrink-0 overflow-y-auto p-4 space-y-4 border-l border-slate-200 dark:border-[#2e2e2e]">

      {/* Single article info (articles mode only) */}
      {mode === "articles" && singleItem && (
        <div className="p-3 bg-slate-50 dark:bg-[#222222]/60 rounded-xl border border-slate-200 dark:border-[#2e2e2e]">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-2">{t("config.selected_article")}</p>
          <p className="font-bold text-sm text-slate-800 dark:text-slate-100 truncate">{singleItem.name}</p>
          <p className="text-[10px] font-mono text-slate-500 mt-0.5">{singleItem.barcode}</p>
          <div className="mt-2 flex gap-4">
            <div>
              <p className="text-[9px] text-slate-400 uppercase">{t("config.purchase_price")}</p>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {Number(singleItem.prixAchat ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} MAD
              </p>
            </div>
            <div>
              <p className="text-[9px] text-slate-400 uppercase">{t("config.sale_price")}</p>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">
                {Number(singleItem.prixVente ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} MAD
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Label type */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">{t("config.label_type")}</p>
        <div className="grid grid-cols-2 gap-1.5">
          {LABEL_TYPES.map((value) => (
            <button
              key={value}
              type="button"
              onClick={() => setLabelType(value)}
              className={`px-2 py-2 rounded-lg text-xs font-semibold transition border ${
                labelType === value
                  ? "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300"
                  : "bg-white dark:bg-[#222222] border-slate-200 dark:border-[#2e2e2e] text-slate-600 dark:text-slate-300 hover:border-blue-300"
              }`}
            >
              {t(`config.label_types.${value}`)}
            </button>
          ))}
        </div>
      </div>

      {/* Price field — articles only, not sansPrix */}
      {mode === "articles" && needsPriceField && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">{t("config.price_grid")}</p>
          <PriceFieldDropDown value={priceField} onChange={(e) => setPriceField(e.target.value)} />
        </div>
      )}

      {/* Size */}
      <div>
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">{t("config.label_size")}</p>
        <div className="flex gap-2">
          {SIZES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setSize(s)}
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition border ${
                size === s
                  ? "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300"
                  : "bg-white dark:bg-[#222222] border-slate-200 dark:border-[#2e2e2e] text-slate-600 dark:text-slate-300 hover:border-blue-300"
              }`}
            >
              {s} mm
            </button>
          ))}
        </div>
      </div>

      {/* Quantity section — mode-specific */}
      {mode === "articles" ? (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">{t("config.quantity_mode")}</p>
          <div className="flex gap-2 mb-3">
            {[
              { value: "personnalise",      labelKey: "config.qty_custom"    },
              { value: "quantityDisponible", labelKey: "config.qty_available" },
            ].map((qm) => (
              <button
                key={qm.value}
                type="button"
                onClick={() => setQuantityMode(qm.value)}
                className={`flex-1 py-2 rounded-lg text-[11px] font-semibold transition border ${
                  quantityMode === qm.value
                    ? "bg-blue-50 border-blue-300 text-blue-700 dark:bg-blue-900/30 dark:border-blue-700 dark:text-blue-300"
                    : "bg-white dark:bg-[#222222] border-slate-200 dark:border-[#2e2e2e] text-slate-600 dark:text-slate-300 hover:border-blue-300"
                }`}
              >
                {t(qm.labelKey)}
              </button>
            ))}
          </div>
          {quantityMode === "personnalise" && (
            <input
              type="number"
              min="1"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
              className={inputClass}
              placeholder={t("config.quantity")}
            />
          )}
          {quantityMode === "quantityDisponible" && (
            <div className="space-y-1 max-h-36 overflow-y-auto pr-1">
              {allDepots.length === 0 ? (
                <p className="text-xs text-slate-400 italic">{t("config.no_depot")}</p>
              ) : (
                allDepots.map((depot) => (
                  <label
                    key={depot.id}
                    className="flex items-center gap-2 cursor-pointer p-1.5 rounded-lg hover:bg-slate-50 dark:hover:bg-[#222222]/50 transition"
                  >
                    <input
                      type="checkbox"
                      checked={selectedDepots.includes(depot.id)}
                      onChange={() => toggleDepot(depot.id)}
                      className="w-4 h-4 rounded border-slate-300 text-[#B12B89] focus:ring-[#B12B89] cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">{depot.name}</span>
                  </label>
                ))
              )}
            </div>
          )}
        </div>
      ) : (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">{t("config.quantity_per_pack")}</p>
          <input
            type="number"
            min="1"
            value={quantity}
            onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
            className={inputClass}
            placeholder={t("config.quantity")}
          />
        </div>
      )}

      {/* Parametre config */}
      {labelType === "parametre" && (
        <div>
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">{t("config.parameters")}</p>
          <div className="space-y-2">
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">{t("config.prefix")}</label>
              <input
                type="text"
                value={prefix}
                onChange={(e) => setPrefix(e.target.value)}
                className={inputClass}
                placeholder={t("config.param_placeholder")}
              />
            </div>
            <div>
              <label className="block text-[10px] text-slate-400 mb-1">{t("config.suffix")}</label>
              <input
                type="text"
                value={suffix}
                onChange={(e) => setSuffix(e.target.value)}
                className={inputClass}
                placeholder={t("config.param_placeholder")}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ─── Main Modal ───────────────────────────────────────────────────────────────
export const PrintBarcodeModal = ({ isOpen, onClose, initialMode = "articles" }) => {
  const { t } = useTranslation("printBarcode");
  const [step, setStep]             = useState("select");
  const [mode, setMode]             = useState(initialMode);

  // articles selection
  const [selected, setSelected]     = useState([]);
  const [search, setSearch]         = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage]             = useState(1);
  const timerRef                    = useRef(null);

  // packs selection
  const [selectedPacks, setSelectedPacks]           = useState([]);
  const [packSearch, setPackSearch]                 = useState("");
  const [debouncedPackSearch, setDebouncedPackSearch] = useState("");
  const [packPage, setPackPage]                     = useState(1);
  const packTimerRef                                = useRef(null);

  // config state
  const [labelType, setLabelType]   = useState("avecPrix");
  const [priceField, setPriceField] = usePriceField(isOpen);
  const [size, setSize]             = useState("50x25");
  const [quantityMode, setQuantityMode] = useState("personnalise");
  const [quantity, setQuantity]     = useState(1);
  const [selectedDepots, setSelectedDepots] = useState([]);
  const [prefix, setPrefix]         = useState("");
  const [suffix, setSuffix]         = useState("");

  // preview data
  const [labelData, setLabelData]   = useState(null);

  const needsPriceField = labelType !== "sansPrix";

  // Reset on open/close
  useEffect(() => {
    if (isOpen) {
      setStep("select");
      setMode(initialMode);
      setSelected([]);
      setSearch(""); setDebouncedSearch(""); setPage(1);
      setSelectedPacks([]);
      setPackSearch(""); setDebouncedPackSearch(""); setPackPage(1);
      setLabelType("avecPrix"); setSize("50x25");
      setQuantityMode("personnalise"); setQuantity(1);
      setSelectedDepots([]); setPrefix(""); setSuffix("");
      setLabelData(null);
    }
  }, [isOpen]);

  const handleSearchChange = (val) => {
    setSearch(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { setDebouncedSearch(val); setPage(1); }, 350);
  };

  const effectivePriceField = needsPriceField ? priceField : "prixVente1";

  const { data: productsData, isLoading, isFetching } = useLabelProducts({
    page,
    search: debouncedSearch || undefined,
    priceField: effectivePriceField,
    enabled: isOpen,
  });

  const { data: depotsData } = useDepots({ pageIndex: 0, pageSize: 100 });

  const { data: packsData, isLoading: packsLoading, isFetching: packsFetching } = usePacks({
    pageIndex: packPage - 1,
    pageSize: 10,
    keyword: debouncedPackSearch,
  });

  const generateMutation      = useGenerateLabels();
  const generatePacksMutation = useGeneratePackLabels();

  const products  = productsData?.data ?? [];
  const pagination = productsData?.pagination ?? {};
  const totalPages = Math.max(pagination.totalPages ?? 1, 1);
  const allDepots  = depotsData?.data ?? [];

  const isPending = (p) => selected.some((s) => itemKey(s) === itemKey(p));

  const handleToggle = (p) => {
    if (isPending(p)) {
      setSelected((prev) => prev.filter((s) => itemKey(s) !== itemKey(p)));
    } else {
      setSelected((prev) => [...prev, p]);
    }
  };

  const handleToggleAll = () => {
    const allSelected = products.every((p) => isPending(p));
    if (allSelected) {
      const keys = new Set(products.map(itemKey));
      setSelected((prev) => prev.filter((s) => !keys.has(itemKey(s))));
    } else {
      const toAdd = products.filter((p) => !isPending(p));
      setSelected((prev) => [...prev, ...toAdd]);
    }
  };

  const allChecked  = products.length > 0 && products.every((p) => isPending(p));
  const someChecked = products.some((p) => isPending(p)) && !allChecked;

  const toggleDepot = (id) =>
    setSelectedDepots((prev) =>
      prev.includes(id) ? prev.filter((d) => d !== id) : [...prev, id]
    );

  const handlePackSearchChange = (val) => {
    setPackSearch(val);
    clearTimeout(packTimerRef.current);
    packTimerRef.current = setTimeout(() => { setDebouncedPackSearch(val); setPackPage(1); }, 350);
  };

  const packs          = packsData?.data ?? [];
  const isPackSelected = (pack) => selectedPacks.includes(pack.id);
  const togglePack     = (pack) =>
    setSelectedPacks((prev) =>
      prev.includes(pack.id) ? prev.filter((id) => id !== pack.id) : [...prev, pack.id]
    );
  const toggleAllPacks = () => {
    const allSel = packs.every(isPackSelected);
    if (allSel) {
      const keys = new Set(packs.map((p) => p.id));
      setSelectedPacks((prev) => prev.filter((id) => !keys.has(id)));
    } else {
      const toAdd = packs.filter((p) => !isPackSelected(p)).map((p) => p.id);
      setSelectedPacks((prev) => [...prev, ...toAdd]);
    }
  };

  const handleGenerate = () => {
    const isPacks = mode === "packs";
    const onSuccess = (res) => { setLabelData(res.data); setStep("preview"); };
    const onError   = (err) => toast.error(err?.response?.data?.message || t("toast.generate_error"));

    const parametreConf =
      labelType === "parametre" && (prefix || suffix)
        ? { parametreConfig: { ...(prefix && { prefix }), ...(suffix && { suffix }) } }
        : {};

    if (isPacks) {
      if (selectedPacks.length === 0) { toast.error(t("toast.select_pack")); return; }
      generatePacksMutation.mutate(
        { packs: selectedPacks, labelType, size, quantity, ...parametreConf },
        { onSuccess, onError }
      );
    } else {
      if (selected.length === 0) { toast.error(t("toast.select_article")); return; }
      if (quantityMode === "quantityDisponible" && selectedDepots.length === 0) {
        toast.error(t("toast.select_depot")); return;
      }
      const items = selected.map((item) =>
        item.type === "variant" ? { variantId: item.variantId } : { articleId: item.articleId }
      );
      generateMutation.mutate(
        {
          items, labelType, size, quantityMode,
          ...(needsPriceField && { priceField }),
          ...(quantityMode === "personnalise" && { quantity }),
          ...(quantityMode === "quantityDisponible" && { depotIds: selectedDepots }),
          ...parametreConf,
        },
        { onSuccess, onError }
      );
    }
  };

  const handlePrint = () => {
    if (!labelData) return;
    const labels = labelData.labels ?? [];
    const [wMm, hMm] = (labelData.size ?? "50x25").split("x").map(Number);
    const lType = labelData.labelType;
    const small = hMm <= 15;

    const padMm       = small ? 1   : 1.5;  // label inner padding in mm
    const namePt      = small ? 4   : 7;
    const bcHeightMm  = small ? 6   : 11;   // barcode SVG container height in mm
    const numPt       = small ? 5   : 7.5;  // barcode number
    const pricePt     = small ? 5.5 : 9;

    const labelsHTML = labels.flatMap((label) => {
      // barcode visual always from original barcode; for parametre show parametreCode as the text
      const showBarcode = lType !== "intitule" && label.barcode;
      const barcodeText = lType === "parametre" ? (label.parametreCode ?? label.barcode) : label.barcode;
      const showPrice = (lType === "avecPrix" || lType === "intitule" || lType === "parametre") && label.priceLabel;

      const svgStr = showBarcode ? barcodeSVGString(label.barcode) : "";

      const html = `
        <div class="label">
          <div class="lname">${label.designation ?? ""}</div>
          ${svgStr ? `<div class="lbc">${svgStr}</div><div class="lnum">${barcodeText}</div>` : ""}
          ${showPrice ? `<div class="lprice">${label.priceLabel}</div>` : ""}
        </div>`;

      return Array.from({ length: label.quantity ?? 1 }, () => html);
    });

    const pw = window.open("", "_blank", "width=900,height=700");
    if (!pw) { toast.error(t("preview.popup_blocked")); return; }

    pw.document.write(`<!DOCTYPE html>
<html><head><meta charset="UTF-8"><title>Étiquettes</title>
<style>
  *{box-sizing:border-box;margin:0;padding:0}
  /* Each page = one physical ticket on the roll */
  @page{size:${wMm}mm ${hMm}mm;margin:0}
  html,body{width:${wMm}mm;background:#fff;font-family:Arial,sans-serif}
  /* Each label fills exactly one ticket — page break forces the next ticket */
  .label{
    width:${wMm}mm;height:${hMm}mm;
    display:flex;flex-direction:column;
    align-items:center;justify-content:center;
    padding:${padMm}mm;
    overflow:hidden;
    page-break-after:always;
    break-after:page
  }
  .label:last-child{page-break-after:avoid;break-after:avoid}
  .lname{
    font-size:${namePt}pt;font-weight:bold;text-align:center;line-height:1.2;
    width:100%;overflow:hidden;white-space:nowrap;text-overflow:ellipsis;flex-shrink:0
  }
  .lbc{
    width:calc(${wMm}mm - ${padMm * 2}mm);height:${bcHeightMm}mm;
    margin:0.4mm 0 0.2mm;flex-shrink:0;overflow:hidden
  }
  .lnum{
    font-size:${numPt}pt;font-weight:600;letter-spacing:0.06em;text-align:center;
    flex-shrink:0;overflow:hidden;white-space:nowrap
  }
  .lprice{
    font-size:${pricePt}pt;font-weight:bold;text-align:center;
    margin-top:0.3mm;flex-shrink:0
  }
</style></head>
<body>${labelsHTML.join("")}</body></html>`);
    pw.document.close();
    pw.focus();
    setTimeout(() => { pw.print(); }, 400);
  };

  const inputClass =
    "w-full px-3 py-2.5 bg-white dark:bg-[#222222] border border-slate-200 dark:border-[#2e2e2e] rounded-xl focus:ring-2 focus:ring-[#B12B89] outline-none transition dark:text-slate-100 text-sm";

  const singleItem = selected.length === 1 ? selected[0] : null;

  // ─── SELECT STEP ──────────────────────────────────────────────────────────
  if (step === "select") {
    const isPacks        = mode === "packs";
    const currentPage    = isPacks ? packPage : page;
    const packsTotalPages = Math.max(packsData?.pagination?.totalPages ?? 1, 1);
    const currentTotal   = isPacks ? packsTotalPages : totalPages;
    const selectedCount  = isPacks ? selectedPacks.length : selected.length;
    const isMutating     = isPacks ? generatePacksMutation.isPending : generateMutation.isPending;
    const availableCount = isPacks ? (packsData?.pagination?.total ?? 0) : (pagination.total ?? 0);
    const availableLabel = isPacks ? t("modal.packs_available") : t("modal.products_available");

    return (
      <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        title={t("modal.title")}
        subtitle={`${availableCount} ${availableLabel}${selectedCount > 0 ? ` · ${selectedCount} ${t("modal.selected")}` : ""}`}
        icon={<Printer className="w-5 h-5 text-[#B12B89]" />}
        iconBg="bg-blue-100 dark:bg-blue-900/30"
        maxWidth="max-w-5xl"
        bodyClassName="flex overflow-hidden p-0 min-h-0 flex-1"
        footer={
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => isPacks ? setPackPage((p) => p - 1) : setPage((p) => p - 1)}
                disabled={currentPage === 1}
                className="p-2 rounded-lg border border-slate-200 dark:border-[#2e2e2e] hover:bg-slate-50 dark:hover:bg-[#222222] disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              </button>
              <span className="text-xs text-slate-500 tabular-nums min-w-[80px] text-center">
                {t("modal.page")} {currentPage} / {currentTotal}
              </span>
              <button
                onClick={() => isPacks ? setPackPage((p) => p + 1) : setPage((p) => p + 1)}
                disabled={currentPage >= currentTotal}
                className="p-2 rounded-lg border border-slate-200 dark:border-[#2e2e2e] hover:bg-slate-50 dark:hover:bg-[#222222] disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              </button>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2.5 border border-slate-200 dark:border-[#2e2e2e] hover:bg-slate-50 dark:hover:bg-[#222222] text-slate-600 dark:text-slate-300 rounded-xl transition font-semibold text-sm"
              >
                {t("modal.cancel")}
              </button>
              <button
                onClick={handleGenerate}
                disabled={selectedCount === 0 || isMutating}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#B12B89] hover:bg-[#B05596] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition font-semibold text-sm"
              >
                {isMutating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
                {t("modal.preview")} ({selectedCount})
              </button>
            </div>
          </div>
        }
      >
        {/* ── Left: tabs + list ── */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">

          {/* Tabs — only shown when no initialMode lock */}
          {!initialMode && (
            <div className="flex px-4 pt-2 gap-1 border-b border-slate-200 dark:border-[#2e2e2e] flex-shrink-0">
              {[
                { value: "articles", label: t("modal.tab_articles") },
                { value: "packs",    label: t("modal.tab_packs")    },
              ].map((tab) => (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setMode(tab.value)}
                  className={`px-4 py-2 text-xs font-semibold border-b-2 transition -mb-px ${
                    mode === tab.value
                      ? "border-[#B12B89] text-[#B12B89]"
                      : "border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
                  }`}
                >
                  {tab.label}
                  {tab.value === "articles" && selected.length > 0 && (
                    <span className="ml-1.5 bg-blue-100 dark:bg-blue-900/30 text-[#B12B89] dark:text-blue-300 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                      {selected.length}
                    </span>
                  )}
                  {tab.value === "packs" && selectedPacks.length > 0 && (
                    <span className="ml-1.5 bg-blue-100 dark:bg-blue-900/30 text-[#B12B89] dark:text-blue-300 text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                      {selectedPacks.length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}

          {/* Search */}
          <div className="px-4 py-3 border-b border-slate-200 dark:border-[#2e2e2e] flex-shrink-0">
            <div className="relative">
              {(isPacks ? packsLoading || packsFetching : isLoading || isFetching) ? (
                <Loader2 className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-blue-400 animate-spin" />
              ) : (
                <MagnifyingGlassIcon className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              )}
              <input
                type="text"
                placeholder={isPacks ? t("modal.search_pack") : t("modal.search_article")}
                value={isPacks ? packSearch : search}
                onChange={(e) => isPacks ? handlePackSearchChange(e.target.value) : handleSearchChange(e.target.value)}
                className={`${inputClass} pl-10`}
                autoFocus
              />
            </div>
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {isPacks ? (
              /* ── Packs list ── */
              packsLoading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="w-7 h-7 animate-spin text-slate-400" />
                </div>
              ) : packs.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 gap-2">
                  <Package className="w-7 h-7 text-slate-300" />
                  <p className="text-sm text-slate-400">{t("modal.no_results")}</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-[#2e2e2e] bg-slate-50/80 dark:bg-[#222222]/50 sticky top-0 z-10">
                      <th className="px-4 py-2.5 w-10">
                        <Checkbox
                          checked={packs.length > 0 && packs.every(isPackSelected)}
                          indeterminate={packs.some(isPackSelected) && !packs.every(isPackSelected)}
                          onChange={toggleAllPacks}
                        />
                      </th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t("modal.col_pack")}</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t("modal.col_barcode")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-[#2e2e2e]">
                    {packs.map((pack) => {
                      const pending = isPackSelected(pack);
                      return (
                        <tr
                          key={pack.id}
                          onClick={() => togglePack(pack)}
                          className={`transition-colors cursor-pointer ${
                            pending
                              ? "bg-blue-50/70 dark:bg-blue-900/10"
                              : "hover:bg-slate-50 dark:hover:bg-[#222222]/30"
                          }`}
                        >
                          <td className="px-4 py-3">
                            <Checkbox checked={pending} onChange={() => togglePack(pack)} />
                          </td>
                          <td className="px-3 py-3">
                            <p className={`font-semibold text-sm ${pending ? "text-blue-700 dark:text-blue-300" : "text-slate-800 dark:text-slate-100"}`}>
                              {pack.name}
                            </p>
                          </td>
                          <td className="px-3 py-3">
                            <p className="text-[10px] font-mono text-slate-400">{pack.barcode ?? "—"}</p>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )
            ) : (
              /* ── Articles list ── */
              isLoading ? (
                <div className="flex items-center justify-center h-48">
                  <Loader2 className="w-7 h-7 animate-spin text-slate-400" />
                </div>
              ) : products.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 gap-2">
                  <Package className="w-7 h-7 text-slate-300" />
                  <p className="text-sm text-slate-400">{t("modal.no_results")}</p>
                </div>
              ) : (
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-[#2e2e2e] bg-slate-50/80 dark:bg-[#222222]/50 sticky top-0 z-10">
                      <th className="px-4 py-2.5 w-10">
                        <Checkbox checked={allChecked} indeterminate={someChecked} onChange={handleToggleAll} />
                      </th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t("modal.col_article")}</th>
                      <th className="px-3 py-2.5 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t("modal.col_type")}</th>
                      <th className="px-3 py-2.5 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t("modal.col_price")}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 dark:divide-[#2e2e2e]">
                    {products.map((p) => {
                      const pending = isPending(p);
                      return (
                        <tr
                          key={itemKey(p)}
                          onClick={() => handleToggle(p)}
                          className={`transition-colors cursor-pointer ${
                            pending
                              ? "bg-blue-50/70 dark:bg-blue-900/10"
                              : "hover:bg-slate-50 dark:hover:bg-[#222222]/30"
                          }`}
                        >
                          <td className="px-4 py-3">
                            <Checkbox checked={pending} onChange={() => handleToggle(p)} />
                          </td>
                          <td className="px-3 py-3">
                            <p className={`font-semibold text-sm ${pending ? "text-blue-700 dark:text-blue-300" : "text-slate-800 dark:text-slate-100"}`}>
                              {p.name}
                            </p>
                            <p className="text-[10px] font-mono text-slate-400 mt-0.5">{p.barcode}</p>
                          </td>
                          <td className="px-3 py-3">
                            <span className={`text-[9px] font-bold uppercase px-2 py-1 rounded ${
                              p.type === "variant"
                                ? "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400"
                                : "bg-blue-50 dark:bg-blue-900/20 text-[#B12B89] dark:text-blue-400"
                            }`}>
                              {p.type === "variant" ? t("modal.type_variant") : t("modal.type_article")}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-center">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                              {Number(p.prixVente ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} MAD
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )
            )}
          </div>
        </div>

        {/* ── Right: config ── */}
        <ConfigPanel
          mode={mode}
          labelType={labelType} setLabelType={setLabelType}
          priceField={priceField} setPriceField={setPriceField}
          size={size} setSize={setSize}
          quantityMode={quantityMode} setQuantityMode={setQuantityMode}
          quantity={quantity} setQuantity={setQuantity}
          selectedDepots={selectedDepots} toggleDepot={toggleDepot}
          allDepots={allDepots}
          prefix={prefix} setPrefix={setPrefix}
          suffix={suffix} setSuffix={setSuffix}
          singleItem={singleItem}
          inputClass={inputClass}
        />
      </BaseModal>
    );
  }

  // ─── PREVIEW STEP ─────────────────────────────────────────────────────────
  if (step === "preview" && labelData) {
    const labels = labelData.labels ?? [];

    return (
      <BaseModal
        isOpen={isOpen}
        onClose={onClose}
        title={t("preview.title")}
        subtitle={`${labelData.totalLabels ?? 0} ${t("preview.subtitle_labels")} · ${labels.length} ${t("preview.subtitle_items")}`}
        icon={<Printer className="w-5 h-5 text-[#B12B89]" />}
        iconBg="bg-blue-100 dark:bg-blue-900/30"
        headerLeft={
          <button
            onClick={() => setStep("select")}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-[#222222] transition mr-1"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
          </button>
        }
        maxWidth="max-w-4xl"
        bodyClassName="flex-1 overflow-y-auto p-6"
        footer={
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 text-sm text-slate-500">
              <span>
                {t("preview.total")}: <span className="font-bold text-slate-700 dark:text-slate-200">{labelData.totalLabels ?? 0}</span> {t("preview.subtitle_labels")}
              </span>
              <span className="hidden sm:inline">·</span>
              <span className="hidden sm:inline">
                {t("preview.size")}: <span className="font-bold text-slate-700 dark:text-slate-200">{labelData.size} mm</span>
              </span>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setStep("select")}
                className="px-4 py-2.5 border border-slate-200 dark:border-[#2e2e2e] hover:bg-slate-50 dark:hover:bg-[#222222] text-slate-600 dark:text-slate-300 rounded-xl transition font-semibold text-sm"
              >
                {t("preview.back")}
              </button>
              <button
                onClick={handlePrint}
                className="flex items-center gap-2 px-5 py-2.5 bg-[#B12B89] hover:bg-[#B05596] text-white rounded-xl transition font-semibold text-sm"
              >
                <Printer className="w-4 h-4" />
                {t("preview.print")}
              </button>
            </div>
          </div>
        }
      >
        {/* Summary bar */}
        <div className="mb-4 p-3 bg-slate-50 dark:bg-[#222222]/60 rounded-xl border border-slate-200 dark:border-[#2e2e2e] flex flex-wrap gap-4">
          {[
            { label: t("preview.col_type"),       value: labelData.labelType    },
            { label: t("preview.col_size"),       value: `${labelData.size} mm` },
            { label: t("preview.col_qty"),        value: labelData.quantityMode  },
            ...(labelData.priceField ? [{ label: t("preview.col_price_grid"), value: labelData.priceField }] : []),
          ].map(({ label, value }) => (
            <div key={label}>
              <p className="text-[9px] text-slate-400 uppercase">{label}</p>
              <p className="text-xs font-bold text-slate-700 dark:text-slate-200">{value}</p>
            </div>
          ))}
        </div>

        {/* One card per item — quantity shown as badge (×N) */}
        <div className="flex flex-wrap gap-5 pt-2">
          {labels.map((label, idx) => (
            <LabelPreviewCard key={idx} label={label} />
          ))}
        </div>
      </BaseModal>
    );
  }

  return null;
};
