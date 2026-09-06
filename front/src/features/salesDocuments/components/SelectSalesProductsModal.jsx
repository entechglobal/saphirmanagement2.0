import { useState, useRef, useEffect } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import {
  Package,
  Check,
  Loader2,
  Plus,
  ChevronLeft,
  ChevronRight,
  Minus,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { BaseModal } from "../../../shared/components/BaseModal";
import {
  PriceFieldDropDown,
  usePriceField,
} from "../../../shared/components/PriceFieldDropDown";
import { formatUnit } from "../../../shared/utils/units";

const productKey = (p) => `${p.type || (p.variantId ? "variant" : "article")}-${p.variantId || p.articleId || p.id}`;

const buildPending = (p, priceField, hidePrices) => ({
  ...p,
  type: p.type || (p.variantId ? "variant" : "article"),
  articleId: p.articleId ?? (p.type === "article" ? p.id : null),
  variantId: p.variantId ?? (p.type === "variant" ? p.id : null),
  quantity: 1,
  unitPrice: hidePrices ? 0 : Number(p.selectedPrice ?? p.unitPrice ?? 0),
  discount: 0,
  remise: 0,
  tva: Number(p.tva ?? 0),
  description: p.name,
  priceField,
  unit: p.unit,
});

const Checkbox = ({ checked, indeterminate = false, onChange, disabled = false }) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      if (!disabled) onChange();
    }}
    disabled={disabled}
    className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
      disabled
        ? "bg-slate-100 dark:bg-[#2e2e2e] border-slate-200 dark:border-[#3a3a3a] cursor-not-allowed opacity-40"
        : checked || indeterminate
          ? "bg-[#B12B89] border-[#B12B89]"
          : "bg-white dark:bg-[#222222] border-slate-300 dark:border-[#3a3a3a] hover:border-blue-400"
    }`}
  >
    {!disabled && indeterminate && !checked ? (
      <Minus className="w-3 h-3 text-white" strokeWidth={3} />
    ) : checked && !disabled ? (
      <Check className="w-3 h-3 text-white" strokeWidth={3} />
    ) : null}
  </button>
);

export const SelectSalesProductsModal = ({
  isOpen,
  onClose,
  onConfirm,
  alreadyInTable = [],
  hidePrices = false,
  useProducts,
  title = "Sélectionner des produits",
}) => {
  const { t: tCommon } = useTranslation("common");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pendingProducts, setPendingProducts] = useState([]);
  const [localPriceField, setLocalPriceField] = usePriceField(
    isOpen,
    "prixVente1",
  );
  const timerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setPendingProducts([]);
      setSearchQuery("");
      setDebouncedSearch("");
      setCurrentPage(1);
    }
  }, [isOpen]);

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebouncedSearch(val);
      setCurrentPage(1);
    }, 350);
  };

  const { data: productsData, isLoading, isFetching } = useProducts({
    search: debouncedSearch || undefined,
    priceField: localPriceField,
    page: currentPage,
    enabled: isOpen,
  });

  const products = productsData?.data ?? [];
  const pagination = productsData?.pagination ?? { totalPages: 1, total: 0 };
  const totalPages = Math.max(pagination.totalPages ?? 1, 1);

  const alreadyKeys = new Set(alreadyInTable.map(productKey));
  const isPending = (p) =>
    pendingProducts.some((x) => productKey(x) === productKey(p));
  const isDisabled = (p) => alreadyKeys.has(productKey(p));

  const handleToggle = (product) => {
    if (isDisabled(product)) return;
    if (isPending(product)) {
      setPendingProducts((prev) =>
        prev.filter((x) => productKey(x) !== productKey(product)),
      );
    } else {
      setPendingProducts((prev) => [
        ...prev,
        buildPending(product, localPriceField, hidePrices),
      ]);
    }
  };

  const eligible = products.filter((p) => !isDisabled(p));
  const pendingOnPage = eligible.filter((p) => isPending(p)).length;
  const allChecked = eligible.length > 0 && pendingOnPage === eligible.length;
  const someChecked = pendingOnPage > 0 && pendingOnPage < eligible.length;

  const handleToggleAll = () => {
    if (allChecked) {
      const keys = new Set(eligible.map(productKey));
      setPendingProducts((prev) =>
        prev.filter((p) => !keys.has(productKey(p))),
      );
    } else {
      const toAdd = eligible
        .filter((p) => !isPending(p))
        .map((p) => buildPending(p, localPriceField, hidePrices));
      setPendingProducts((prev) => [...prev, ...toAdd]);
    }
  };

  const inputClass =
    "w-full px-4 py-2.5 bg-white dark:bg-[#222222] border border-slate-200 dark:border-[#2e2e2e] rounded-xl focus:ring-2 focus:ring-[#B12B89] outline-none transition dark:text-slate-100 text-sm";

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={`${pagination.total ?? 0} produits disponibles${
        pendingProducts.length > 0
          ? ` · ${pendingProducts.length} sélectionné(s)`
          : ""
      }`}
      icon={<Package className="w-5 h-5 text-[#B12B89]" />}
      iconBg="bg-blue-100 dark:bg-blue-900/30"
      maxWidth="max-w-2xl"
      bodyClassName="flex flex-col overflow-hidden p-0 min-h-0"
      footer={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => p - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-slate-200 dark:border-[#2e2e2e] hover:bg-slate-50 dark:hover:bg-[#222222] disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-500 tabular-nums min-w-[80px] text-center">
              Page {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={currentPage >= totalPages}
              className="p-2 rounded-lg border border-slate-200 dark:border-[#2e2e2e] hover:bg-slate-50 dark:hover:bg-[#222222] disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-200 dark:border-[#2e2e2e] rounded-xl font-semibold text-sm"
            >
              Annuler
            </button>
            <button
              type="button"
              onClick={() => onConfirm(pendingProducts, localPriceField)}
              disabled={pendingProducts.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#B12B89] hover:bg-[#B05596] disabled:opacity-50 text-white rounded-xl font-semibold text-sm"
            >
              <Plus className="w-4 h-4" />
              Ajouter ({pendingProducts.length})
            </button>
          </div>
        </div>
      }
    >
      <div className="px-6 py-4 border-b border-slate-200 dark:border-[#2e2e2e] space-y-3 flex-shrink-0">
        <div className="relative">
          {isLoading || isFetching ? (
            <Loader2 className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-blue-400 animate-spin" />
          ) : (
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          )}
          <input
            type="text"
            placeholder="Rechercher un produit…"
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className={`${inputClass} pl-10`}
            autoFocus
          />
        </div>
        {!hidePrices && (
          <PriceFieldDropDown
            value={localPriceField}
            onChange={(e) => {
              setLocalPriceField(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Grille tarifaire"
          />
        )}
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {products.length === 0 && !isLoading ? (
          <div className="py-16 text-center text-sm text-slate-400">
            Aucun produit trouvé
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-[#2e2e2e]">
            <li className="px-6 py-2.5 bg-slate-50/80 dark:bg-[#1c1c1c]/40 flex items-center gap-3">
              <Checkbox
                checked={allChecked}
                indeterminate={someChecked}
                onChange={handleToggleAll}
                disabled={eligible.length === 0}
              />
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">
                Tout sélectionner
              </span>
            </li>
            {products.map((p) => {
              const disabled = isDisabled(p);
              const checked = isPending(p);
              return (
                <li
                  key={productKey(p)}
                  onClick={() => handleToggle(p)}
                  className={`px-6 py-3 flex items-center gap-3 cursor-pointer transition ${
                    disabled
                      ? "opacity-40 cursor-not-allowed"
                      : "hover:bg-slate-50 dark:hover:bg-[#222222]/50"
                  }`}
                >
                  <Checkbox
                    checked={checked || disabled}
                    onChange={() => handleToggle(p)}
                    disabled={disabled}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                      {p.name}
                    </p>
                    <p className="text-[11px] text-slate-400 truncate">
                      {p.barcode || "—"}
                      {p.unit?.symbol
                        ? ` · ${formatUnit(p.unit.symbol, tCommon)}`
                        : ""}
                    </p>
                  </div>
                  {!hidePrices && (
                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200 tabular-nums">
                      {Number(p.selectedPrice ?? 0).toFixed(2)} DH
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </BaseModal>
  );
};
