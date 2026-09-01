import { useState, useRef, useEffect } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import {
  Package, Boxes, Check, Loader2, Plus, ChevronLeft, ChevronRight, Minus,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { useBRProducts, useBRPacks } from "../hooks/useBonRetourClients";
import { usePriceField, PriceFieldDropDown } from "../../../shared/components/PriceFieldDropDown";
import { BaseModal } from "../../../shared/components/BaseModal";
import { formatUnit } from "../../../shared/utils/units";

/* ─── helpers ─── */
const productKey = (p) => `${p.type}-${p.id}`;

const fmt = (n) =>
  Number(n ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const computeMaxDiscount = (unitPrice, prixAchat, familyRemise) => {
  if (!unitPrice || unitPrice <= 0) return 0;
  const cost = prixAchat ?? 0;
  const remiseCeiling = familyRemise ?? 0;
  if (remiseCeiling <= 0) return 0;
  const marginMax = cost > 0 ? ((unitPrice - cost) / unitPrice) * 100 : remiseCeiling;
  return Math.max(0, Math.floor(Math.min(remiseCeiling, marginMax) * 100) / 100);
};

const buildPending = (p, priceField) => {
  const unitPrice = p.unitPrice ?? 0;
  const prixAchat = p.prixAchat ?? 0;
  const familyRemise = p.familyRemise ?? 0;
  return {
    ...p,
    quantity: 1,
    unitPrice,
    minUnitPrice: prixAchat,
    discount: p.articleRemise ?? 0,
    maxDiscount: computeMaxDiscount(unitPrice, prixAchat, familyRemise),
    familyRemise,
    description: p.name,
    isTouched: false,
    priceField,
  };
};

/* ─── Checkbox ─── */
const Checkbox = ({ checked, indeterminate = false, onChange, disabled = false }) => (
  <button
    type="button"
    onClick={(e) => { e.stopPropagation(); if (!disabled) onChange(); }}
    disabled={disabled}
    className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
      disabled
        ? "bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 cursor-not-allowed opacity-40"
        : checked || indeterminate
        ? "bg-[#B12B89] border-[#B12B89]"
        : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-blue-400"
    }`}
  >
    {!disabled && indeterminate && !checked ? (
      <Minus className="w-3 h-3 text-white" strokeWidth={3} />
    ) : checked && !disabled ? (
      <Check className="w-3 h-3 text-white" strokeWidth={3} />
    ) : null}
  </button>
);

/* ════════════════════════════════════════════════════════════════
   SelectBRItemsModal — unified articles + packs picker for BonRetour
   onConfirm(pendingProducts, pendingPacks, priceField)
════════════════════════════════════════════════════════════════ */
export const SelectBRItemsModal = ({
  isOpen,
  depotId,
  priceField: initialPriceField,
  onClose,
  onConfirm,
  onCreateArticle,
  alreadyProducts = [],
  alreadyPacks = [],
  t,
}) => {
  const { t: tCommon } = useTranslation("common");
  const [tab, setTab] = useState("articles");

  /* articles state */
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pendingProducts, setPendingProducts] = useState([]);
  const [localPriceField, setLocalPriceField] = usePriceField(isOpen, initialPriceField);
  const timerRef = useRef(null);

  /* packs state */
  const [packSearch, setPackSearch] = useState("");
  const [debouncedPackSearch, setDebouncedPackSearch] = useState("");
  const [packPage, setPackPage] = useState(1);
  const [pendingPacks, setPendingPacks] = useState([]);
  const packTimerRef = useRef(null);

  /* reset on open */
  useEffect(() => {
    if (isOpen) {
      setPendingProducts([]);
      setPendingPacks([]);
      setSearchQuery("");
      setDebouncedSearch("");
      setCurrentPage(1);
      setPackSearch("");
      setDebouncedPackSearch("");
      setPackPage(1);
      setTab("articles");
    }
  }, [isOpen]);

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { setDebouncedSearch(val); setCurrentPage(1); }, 350);
  };

  const handlePackSearchChange = (val) => {
    setPackSearch(val);
    clearTimeout(packTimerRef.current);
    packTimerRef.current = setTimeout(() => { setDebouncedPackSearch(val); setPackPage(1); }, 350);
  };

  /* queries */
  const { data: productsData, isLoading: loadingProducts, isFetching } = useBRProducts({
    depotId,
    priceField: localPriceField,
    search: debouncedSearch || undefined,
    page: currentPage,
    limit: 10,
    enabled: isOpen,
  });

  const { data: packsData, isLoading: loadingPacks, isFetching: fetchingPacks } = useBRPacks({
    search: debouncedPackSearch || undefined,
    page: packPage,
    limit: 10,
    enabled: isOpen,
  });

  const products = productsData?.data ?? [];
  const packs = packsData?.data ?? [];
  const productPagination = productsData?.pagination ?? { totalPages: 1, total: 0 };
  const packPagination = packsData?.pagination ?? { totalPages: 1, total: 0 };
  const totalProductPages = Math.max(productPagination.totalPages ?? 1, 1);
  const totalPackPages = Math.max(packPagination.totalPages ?? 1, 1);

  /* sync pending products when price field changes */
  useEffect(() => {
    if (pendingProducts.length === 0 || products.length === 0) return;
    const freshMap = new Map(products.map((p) => [productKey(p), p]));
    setPendingProducts((prev) => {
      let changed = false;
      const next = prev.map((pending) => {
        const fresh = freshMap.get(productKey(pending));
        if (!fresh) return pending;
        const updated = buildPending(fresh, localPriceField);
        if (updated.unitPrice === pending.unitPrice && updated.priceField === pending.priceField) return pending;
        changed = true;
        return updated;
      });
      return changed ? next : prev;
    });
  }, [products]);

  /* ── articles logic ── */
  const alreadyProductKeys = new Set(alreadyProducts.map(productKey));
  const isProductPending = (p) => pendingProducts.some((x) => productKey(x) === productKey(p));
  const isProductDisabled = (p) => alreadyProductKeys.has(productKey(p));

  const handleToggleProduct = (product) => {
    if (isProductDisabled(product)) return;
    if (isProductPending(product)) {
      setPendingProducts((prev) => prev.filter((x) => productKey(x) !== productKey(product)));
    } else {
      setPendingProducts((prev) => [...prev, buildPending(product, localPriceField)]);
    }
  };

  const handleToggleAll = () => {
    const eligible = products.filter((p) => !isProductDisabled(p));
    const allPending = eligible.every((p) => isProductPending(p));
    if (allPending) {
      const keys = new Set(eligible.map(productKey));
      setPendingProducts((prev) => prev.filter((p) => !keys.has(productKey(p))));
    } else {
      const toAdd = eligible.filter((p) => !isProductPending(p)).map((p) => buildPending(p, localPriceField));
      setPendingProducts((prev) => [...prev, ...toAdd]);
    }
  };

  const eligible = products.filter((p) => !isProductDisabled(p));
  const pendingOnPage = eligible.filter((p) => isProductPending(p)).length;
  const allChecked = eligible.length > 0 && pendingOnPage === eligible.length;
  const someChecked = pendingOnPage > 0 && pendingOnPage < eligible.length;

  /* ── packs logic ── */
  const alreadyPackIds = new Set(alreadyPacks.map((p) => p.packId));
  const isPackPending = (p) => pendingPacks.some((x) => x.packId === p.id);
  const isPackDisabled = (p) => alreadyPackIds.has(p.id);

  const handleTogglePack = (pack) => {
    if (isPackDisabled(pack)) return;
    if (isPackPending(pack)) {
      setPendingPacks((prev) => prev.filter((x) => x.packId !== pack.id));
    } else {
      setPendingPacks((prev) => [
        ...prev,
        {
          packLineId: null,
          packId: pack.id,
          name: pack.name,
          barcode: pack.barcode ?? "",
          prixVente: parseFloat(pack.prixVentePack ?? 0),
          quantity: 1,
          isTouched: false,
          isExisting: false,
        },
      ]);
    }
  };

  const totalSelected = pendingProducts.length + pendingPacks.length;

  const handleConfirm = () => {
    onConfirm(pendingProducts, pendingPacks, localPriceField);
  };

  const inputClass =
    "w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#B12B89] outline-none transition dark:text-slate-100 text-sm";

  const TABS = [
    {
      key: "articles",
      Icon: Package,
      label: (t?.("articles_tab", "Articles")) + (pendingProducts.length > 0 ? ` (${pendingProducts.length})` : ""),
    },
    {
      key: "packs",
      Icon: Boxes,
      label: (t?.("packs_tab", "Packs")) + (pendingPacks.length > 0 ? ` (${pendingPacks.length})` : ""),
    },
  ];

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t?.("add_items_title", "Articles & Packs")}
      subtitle={
        totalSelected > 0
          ? `${totalSelected} ${t?.("selected_count", "sélectionné(s)")}`
          : t?.("select_items_hint", "Sélectionnez des articles ou des packs")
      }
      icon={<Package className="w-5 h-5 text-[#B12B89]" />}
      iconBg="bg-blue-100 dark:bg-blue-900/30"
      maxWidth="max-w-2xl"
      bodyClassName="flex flex-col overflow-hidden p-0 min-h-0"
      subHeader={
        <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800 -mx-6 px-6 pb-0">
          {TABS.map(({ key, Icon, label }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all -mb-px border-b-2 ${
                tab === key
                  ? "border-[#B12B89] text-[#B12B89] dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10"
                  : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
            >
              <Icon size={13} />
              {label}
            </button>
          ))}
        </div>
      }
      footer={
        <div className="flex items-center justify-between">
          {/* pagination */}
          {tab === "articles" && totalProductPages > 1 ? (
            <div className="flex items-center gap-2">
              <button onClick={() => setCurrentPage((p) => p - 1)} disabled={currentPage === 1}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition">
                <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              </button>
              <span className="text-xs text-slate-500 tabular-nums min-w-[80px] text-center">
                {t?.("page", "Page")} {currentPage} / {totalProductPages}
              </span>
              <button onClick={() => setCurrentPage((p) => p + 1)} disabled={currentPage >= totalProductPages}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition">
                <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              </button>
            </div>
          ) : tab === "packs" && totalPackPages > 1 ? (
            <div className="flex items-center gap-2">
              <button onClick={() => setPackPage((p) => p - 1)} disabled={packPage === 1}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition">
                <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              </button>
              <span className="text-xs text-slate-500 tabular-nums min-w-[80px] text-center">
                {t?.("page", "Page")} {packPage} / {totalPackPages}
              </span>
              <button onClick={() => setPackPage((p) => p + 1)} disabled={packPage >= totalPackPages}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition">
                <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              </button>
            </div>
          ) : <div />}

          {/* actions */}
          <div className="flex items-center gap-3">
            <button onClick={onClose}
              className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl transition font-semibold text-sm">
              {t?.("cancel", "Annuler")}
            </button>
            {tab === "articles" && onCreateArticle && (
              <button onClick={onCreateArticle}
                className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl transition font-semibold text-sm">
                <Plus className="w-4 h-4" />
                {t?.("create_article", "Créer article")}
              </button>
            )}
            <button onClick={handleConfirm} disabled={totalSelected === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#B12B89] hover:bg-[#B05596] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition font-semibold text-sm">
              <Plus className="w-4 h-4" />
              {t?.("add", "Ajouter")} ({totalSelected})
            </button>
          </div>
        </div>
      }
    >
      {/* ── Articles tab ── */}
      {tab === "articles" && (
        <>
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 space-y-3 flex-shrink-0">
            <div className="relative">
              {loadingProducts || isFetching ? (
                <Loader2 className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-blue-400 animate-spin" />
              ) : (
                <MagnifyingGlassIcon className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              )}
              <input
                type="text"
                placeholder={t?.("search_placeholder", "Rechercher un article...")}
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className={`${inputClass} pl-10`}
                autoFocus
              />
            </div>
            <PriceFieldDropDown
              value={localPriceField}
              onChange={(e) => { setLocalPriceField(e.target.value); setCurrentPage(1); }}
              placeholder={t?.("price_grid", "Grille de prix")}
            />
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            {loadingProducts ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto" />
              </div>
            ) : products.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
                    <th className="px-6 py-3 w-12">
                      <Checkbox checked={allChecked} indeterminate={someChecked} onChange={handleToggleAll} />
                    </th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t?.("article", "Article")}</th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 hidden sm:table-cell">{t?.("type", "Type")}</th>
                    <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t?.("price", "Prix")}</th>
                    <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t?.("stock", "Stock")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {products.map((product) => {
                    const disabled = isProductDisabled(product);
                    const pending = isProductPending(product);
                    return (
                      <tr
                        key={productKey(product)}
                        onClick={() => handleToggleProduct(product)}
                        className={`transition-colors ${
                          disabled
                            ? "opacity-40 cursor-not-allowed bg-slate-50/50 dark:bg-slate-800/20"
                            : pending
                            ? "bg-blue-50/70 dark:bg-blue-900/10 cursor-pointer"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer"
                        }`}
                      >
                        <td className="px-6 py-3.5">
                          <Checkbox checked={pending} disabled={disabled} onChange={() => handleToggleProduct(product)} />
                        </td>
                        <td className="px-4 py-3.5">
                          <p className={`font-semibold text-sm ${pending && !disabled ? "text-blue-700 dark:text-blue-300" : "text-slate-800 dark:text-slate-100"}`}>
                            {product.name}
                            {disabled && (
                              <span className="ml-2 text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                                {t?.("already_added", "Déjà ajouté")}
                              </span>
                            )}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            <p className="text-[10px] font-mono text-slate-400">{product.barcode}</p>
                            {product.family?.name && <p className="text-[10px] text-slate-400">· {product.family.name}</p>}
                            {product.unit?.symbol && (
                              <p className="text-[10px] text-slate-400">
                                · {formatUnit(product.unit.symbol, tCommon)}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3.5 hidden sm:table-cell">
                          <span className={`text-[9px] font-bold uppercase px-2 py-1 rounded ${product.type === "variant" ? "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400" : "bg-blue-50 dark:bg-blue-900/20 text-[#B12B89] dark:text-blue-400"}`}>
                            {product.type === "variant" ? t?.("variant", "Variant") : t?.("article_type", "Article")}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
                            {Number(product.unitPrice ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 2 })} MAD
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={`text-xs font-medium ${(product.stock?.quantityAvailable ?? 0) > 0 ? "text-emerald-600" : "text-slate-400"}`}>
                            {product.stock?.quantityAvailable ?? 0}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Package className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">{t?.("no_products_found", "Aucun produit trouvé")}</p>
                  <p className="text-xs text-slate-400 mt-1">{t?.("try_different_search", "Essayez une autre recherche")}</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Packs tab ── */}
      {tab === "packs" && (
        <>
          <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
            <div className="relative">
              {loadingPacks || fetchingPacks ? (
                <Loader2 className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-blue-400 animate-spin" />
              ) : (
                <MagnifyingGlassIcon className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
              )}
              <input
                type="text"
                placeholder={t?.("search_packs", "Rechercher des packs...")}
                value={packSearch}
                onChange={(e) => handlePackSearchChange(e.target.value)}
                className={`${inputClass} pl-10`}
                autoFocus
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0">
            {loadingPacks ? (
              <div className="flex items-center justify-center h-64">
                <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto" />
              </div>
            ) : packs.length > 0 ? (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
                    <th className="px-6 py-3 w-12"></th>
                    <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t?.("pack", "Pack")}</th>
                    <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t?.("sale_price", "Prix vente")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                  {packs.map((pack) => {
                    const disabled = isPackDisabled(pack);
                    const pending = isPackPending(pack);
                    return (
                      <tr
                        key={`pack-${pack.id}`}
                        onClick={() => handleTogglePack(pack)}
                        className={`transition-colors ${
                          disabled
                            ? "opacity-40 cursor-not-allowed bg-slate-50/50 dark:bg-slate-800/20"
                            : pending
                            ? "bg-blue-50/70 dark:bg-blue-900/10 cursor-pointer"
                            : "hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer"
                        }`}
                      >
                        <td className="px-6 py-3.5">
                          <Checkbox checked={pending} disabled={disabled} onChange={() => handleTogglePack(pack)} />
                        </td>
                        <td className="px-4 py-3.5">
                          <p className={`font-semibold text-sm ${pending && !disabled ? "text-blue-700 dark:text-blue-300" : "text-slate-800 dark:text-slate-100"}`}>
                            {pack.name}
                            {disabled && (
                              <span className="ml-2 text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                                {t?.("already_added", "Déjà ajouté")}
                              </span>
                            )}
                          </p>
                          {pack.barcode && <p className="text-[10px] font-mono text-slate-400 mt-0.5">{pack.barcode}</p>}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className="text-xs font-bold text-green-700 dark:text-green-400">
                            {fmt(pack.prixVentePack)} MAD
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <Boxes className="w-8 h-8 mx-auto text-slate-300 mb-2" />
                  <p className="text-sm text-slate-500">{t?.("no_packs_found", "Aucun pack trouvé")}</p>
                  <p className="text-xs text-slate-400 mt-1">{t?.("try_different_search", "Essayez une autre recherche")}</p>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </BaseModal>
  );
};
