import { useState, useRef, useEffect } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Package, Check, Loader2, Plus, ChevronLeft, ChevronRight, Minus } from "lucide-react";
import { BaseModal } from "../../../shared/components/BaseModal";
import { formatUnit } from "../../../shared/utils/units";
import { useTranslation } from "react-i18next";

const productKey = (p) =>
  `${p.type || (p.variantId ? "variant" : "article")}-${p.variantId || p.articleId || p.id}`;

const Checkbox = ({ checked, indeterminate = false, onChange, disabled = false }) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      if (!disabled) onChange();
    }}
    disabled={disabled}
    className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center ${
      disabled
        ? "opacity-40 cursor-not-allowed"
        : checked || indeterminate
          ? "bg-[#B12B89] border-[#B12B89]"
          : "bg-white border-slate-300"
    }`}
  >
    {checked && !disabled ? <Check className="w-3 h-3 text-white" strokeWidth={3} /> : null}
    {indeterminate && !checked && !disabled ? (
      <Minus className="w-3 h-3 text-white" strokeWidth={3} />
    ) : null}
  </button>
);

export const SelectBRFProductsModal = ({
  isOpen,
  onClose,
  onConfirm,
  alreadyInTable = [],
  depotId,
  useProducts,
  title = "Sélectionner des produits",
}) => {
  const { t: tCommon } = useTranslation("common");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pendingProducts, setPendingProducts] = useState([]);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setPendingProducts([]);
      setSearchQuery("");
      setDebouncedSearch("");
      setCurrentPage(1);
    }
  }, [isOpen]);

  const { data: productsData, isLoading, isFetching } = useProducts({
    depotId,
    search: debouncedSearch || undefined,
    page: currentPage,
    enabled: isOpen && !!depotId,
  });

  const products = productsData?.data ?? [];
  const pagination = productsData?.pagination ?? { totalPages: 1, total: 0 };
  const totalPages = Math.max(pagination.totalPages ?? 1, 1);
  const alreadyKeys = new Set(alreadyInTable.map(productKey));

  const buildPending = (p) => ({
    ...p,
    articleId: p.articleId ?? (p.type === "article" ? p.id : null),
    variantId: p.variantId ?? (p.type === "variant" ? p.id : null),
    quantity: 1,
    unitPrice: Number(p.unitPrice ?? p.selectedPrice ?? p.prixAchat ?? 0),
    description: p.name,
    unit: p.unit,
  });

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
      setPendingProducts((prev) => [...prev, buildPending(product)]);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={`${pagination.total ?? 0} produits · stock dépôt`}
      icon={<Package className="w-5 h-5 text-[#B12B89]" />}
      iconBg="bg-blue-100"
      maxWidth="max-w-2xl"
      bodyClassName="flex flex-col overflow-hidden p-0 min-h-0"
      footer={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage((p) => p - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-500">
              Page {currentPage} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={currentPage >= totalPages}
              className="p-2 rounded-lg border disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2.5 border rounded-xl text-sm font-semibold">
              Annuler
            </button>
            <button
              type="button"
              onClick={() => onConfirm(pendingProducts)}
              disabled={pendingProducts.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#B12B89] text-white rounded-xl text-sm font-semibold disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              Ajouter ({pendingProducts.length})
            </button>
          </div>
        </div>
      }
    >
      <div className="px-6 py-4 border-b">
        <div className="relative">
          {isLoading || isFetching ? (
            <Loader2 className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 animate-spin text-blue-400" />
          ) : (
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          )}
          <input
            type="text"
            placeholder="Rechercher…"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              clearTimeout(timerRef.current);
              timerRef.current = setTimeout(() => {
                setDebouncedSearch(e.target.value);
                setCurrentPage(1);
              }, 350);
            }}
            className="w-full pl-10 pr-4 py-2.5 border rounded-xl text-sm"
            autoFocus
          />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto min-h-0">
        {products.length === 0 && !isLoading ? (
          <div className="py-16 text-center text-sm text-slate-400">Aucun produit</div>
        ) : (
          <ul className="divide-y">
            {products.map((p) => {
              const disabled = isDisabled(p);
              const checked = isPending(p);
              return (
                <li
                  key={productKey(p)}
                  onClick={() => handleToggle(p)}
                  className={`px-6 py-3 flex items-center gap-3 cursor-pointer ${disabled ? "opacity-40" : "hover:bg-slate-50"}`}
                >
                  <Checkbox
                    checked={checked || disabled}
                    onChange={() => handleToggle(p)}
                    disabled={disabled}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold truncate">{p.name}</p>
                    <p className="text-[11px] text-slate-400">
                      Stock: {Number(p.stock?.quantityAvailable ?? 0)}
                      {p.unit?.symbol
                        ? ` · ${formatUnit(p.unit.symbol, tCommon)}`
                        : ""}
                    </p>
                  </div>
                  <span className="text-sm font-bold tabular-nums">
                    {Number(p.unitPrice ?? 0).toFixed(2)} DH
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </BaseModal>
  );
};
