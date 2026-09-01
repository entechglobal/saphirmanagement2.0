import { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  Package,
  Boxes,
  Search,
  Plus,
  Minus,
} from "lucide-react";

import { usePickerProducts, usePickerPacks } from "../hooks/useCommands";
import { BaseModal } from "../../../../shared/components/BaseModal";
import { usePriceField, PriceFieldDropDown } from "../../../../shared/components/PriceFieldDropDown";

const fmt = (n) =>
  Number(n ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const Checkbox = ({ checked, onChange, disabled = false }) => (
  <button
    type="button"
    onClick={(e) => { e.stopPropagation(); if (!disabled) onChange(); }}
    disabled={disabled}
    className={`flex-shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-all ${
      disabled
        ? "bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 cursor-not-allowed opacity-40"
        : checked
        ? "bg-[#B12B89] border-[#B12B89]"
        : "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 hover:border-blue-400"
    }`}
  >
    {checked && !disabled && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
  </button>
);

export const ProductPickerModal = ({
  isOpen,
  depotId,
  onClose,
  onConfirm,
  alreadyLines,
  alreadyPacks,
  isCheckingPacks = false,
}) => {
  const { t } = useTranslation("commands");
  const [tab, setTab] = useState("products");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [priceField, setPriceField] = usePriceField(isOpen);
  const timerRef = useRef(null);

  const [pendingProducts, setPendingProducts] = useState([]);
  const [pendingPacks, setPendingPacks] = useState([]);

  useEffect(() => {
    if (isOpen) {
      setPendingProducts([]);
      setPendingPacks([]);
      setSearch("");
      setDebouncedSearch("");
      setPage(1);
      setTab("products");
    }
  }, [isOpen]);

  const handleSearch = (val) => {
    setSearch(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { setDebouncedSearch(val); setPage(1); }, 350);
  };

  const { data: productsData, isLoading: loadingProducts, isFetching } = usePickerProducts({
    depotId,
    priceField,
    search: debouncedSearch || undefined,
    page,
    limit: 10,
    enabled: isOpen,
  });

  const { data: packsData, isLoading: loadingPacks } = usePickerPacks({
    page: 1,
    limit: 50,
    enabled: isOpen,
  });

  const products = productsData?.data ?? [];
  const packs = packsData?.data ?? [];
  const pagination = productsData?.pagination ?? { totalPages: 1, total: 0 };
  const totalPages = Math.max(pagination.totalPages ?? 1, 1);

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

  const alreadyProductKeys = new Set(
    alreadyLines.map((l) => `${l.type}-${l.variantId ?? l.articleId}`)
  );
  const alreadyPackIds = new Set(alreadyPacks.map((p) => p.id));

  const isProductPending = (p) =>
    pendingProducts.some((x) => x._key === `${p.type}-${p.variantId ?? p.id}`);
  const isPackPending = (p) => pendingPacks.some((x) => x.id === p.id);

  const toggleProduct = (p) => {
    const key = `${p.type}-${p.variantId ?? p.id}`;
    if (alreadyProductKeys.has(key)) return;
    if (isProductPending(p)) {
      setPendingProducts((prev) => prev.filter((x) => x._key !== key));
    } else {
      setPendingProducts((prev) => [
        ...prev,
        {
          _key: key,
          variantId: p.variantId ?? null,
          articleId: p.articleId ?? null,
          name: p.name,
          quantity: 1,
          unitPrice: p.prixVente,
          priceField,
          stock: p.stock,
          type: p.type,
        },
      ]);
    }
  };

  const togglePack = (p) => {
    if (alreadyPackIds.has(p.id)) return;
    if (isPackPending(p)) {
      setPendingPacks((prev) => prev.filter((x) => x.id !== p.id));
    } else {
      setPendingPacks((prev) => [...prev, { id: p.id, name: p.name, quantity: 1, prixVente: p.prixVentePack }]);
    }
  };

  const handleConfirm = async () => {
    const canClose = await onConfirm(pendingProducts, pendingPacks);
    if (canClose !== false) {
      setPendingProducts([]);
      setPendingPacks([]);
      onClose();
    }
  };

  const totalSelected = pendingProducts.length + pendingPacks.length;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("picker_title")}
      subtitle={totalSelected > 0 ? t("picker_subtitle_selected", { count: totalSelected }) : t("picker_subtitle_default")}
      icon={<Package className="w-5 h-5 text-[#B12B89]" />}
      iconBg="bg-blue-100 dark:bg-blue-900/30"
      maxWidth="max-w-2xl"
      bodyClassName="flex flex-col overflow-hidden p-0 min-h-0"
      subHeader={
        <div className="flex gap-1 border-b border-slate-200 dark:border-slate-800 -mx-6 px-6 pb-0">
          {["products", "packs"].map((tabKey) => (
            <button key={tabKey} type="button"
              onClick={() => { setTab(tabKey); setPage(1); setSearch(""); setDebouncedSearch(""); }}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold rounded-t-xl transition-all -mb-px border-b-2 ${tab === tabKey
                ? "border-[#B12B89] text-[#B12B89] dark:text-blue-400 bg-blue-50/50 dark:bg-blue-900/10"
                : "border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              }`}
            >
              {tabKey === "products" ? <Package size={13} /> : <Boxes size={13} />}
              {tabKey === "products" ? t("picker_tab_articles") : t("picker_tab_packs")}
            </button>
          ))}
        </div>
      }
      footer={
        <div className="flex items-center justify-between">
          {tab === "products" && totalPages > 1 ? (
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => p - 1)} disabled={page === 1}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition">
                <ChevronLeft size={14} className="text-slate-600 dark:text-slate-300" />
              </button>
              <span className="text-xs text-slate-500 tabular-nums min-w-[64px] text-center">{page} / {totalPages}</span>
              <button onClick={() => setPage((p) => p + 1)} disabled={page >= totalPages}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 transition">
                <ChevronRight size={14} className="text-slate-600 dark:text-slate-300" />
              </button>
            </div>
          ) : <div />}
          <div className="flex items-center gap-3">
            <button type="button" onClick={onClose}
              className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition">
              {t("picker_cancel")}
            </button>
            <button type="button" onClick={handleConfirm} disabled={totalSelected === 0 || isCheckingPacks}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold text-white transition disabled:opacity-50 bg-[#B12B89] hover:bg-[#B05596]">
              {isCheckingPacks ? (
                <><Loader2 size={14} className="animate-spin" /> {t("picker_checking")}</>
              ) : (
                <><Plus size={14} /> {t("picker_add", { count: totalSelected })}</>
              )}
            </button>
          </div>
        </div>
      }
    >
      {/* Search + price field — fixed section */}
      {tab === "products" && (
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 space-y-3 flex-shrink-0">
          <div className="relative">
            {loadingProducts || isFetching ? (
              <Loader2 className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-blue-400 animate-spin" />
            ) : (
              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
            )}
            <input
              type="text"
              placeholder={t("picker_search_article")}
              value={search}
              onChange={(e) => handleSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm focus:ring-2 focus:ring-[#B12B89] outline-none transition dark:text-slate-100"
              autoFocus
            />
          </div>
          <PriceFieldDropDown
            value={priceField}
            onChange={(e) => { setPriceField(e.target.value); setPage(1); }}
            placeholder={t("picker_price_grid", "Grille de prix")}
          />
        </div>
      )}

      {/* Scrollable list */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {tab === "products" ? (
          loadingProducts ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 size={28} className="animate-spin text-slate-300" />
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <Package className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">{t("picker_no_articles")}</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
                  <th className="w-10 px-6 py-3" />
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t("picker_col_article")}</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 hidden sm:table-cell">{t("picker_col_type")}</th>
                  <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t("picker_col_price")}</th>
                  <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">{t("picker_col_stock")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                {products.map((p) => {
                  const key = `${p.type}-${p.variantId ?? p.id}`;
                  const disabled = alreadyProductKeys.has(key);
                  const pending = isProductPending(p);
                  return (
                    <tr key={key} onClick={() => toggleProduct(p)}
                      className={`transition-colors ${disabled ? "opacity-40 cursor-not-allowed bg-slate-50/50 dark:bg-slate-800/20" : pending ? "bg-blue-50/70 dark:bg-blue-900/10 cursor-pointer" : "hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer"}`}>
                      <td className="px-6 py-3.5">
                        <Checkbox checked={pending} disabled={disabled} onChange={() => toggleProduct(p)} />
                      </td>
                      <td className="px-4 py-3.5">
                        <p className={`text-sm font-semibold ${pending && !disabled ? "text-blue-700 dark:text-blue-300" : "text-slate-800 dark:text-slate-100"}`}>
                          {p.name}
                          {disabled && <span className="ml-2 text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{t("picker_already_added")}</span>}
                        </p>
                      </td>
                      <td className="px-4 py-3.5 hidden sm:table-cell">
                        <span className={`text-[9px] font-bold uppercase px-2 py-1 rounded ${p.type === "VARIANT" ? "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400" : "bg-blue-50 dark:bg-blue-900/20 text-[#B12B89] dark:text-blue-400"}`}>
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
          <div className="flex items-center justify-center h-64">
            <Loader2 size={28} className="animate-spin text-slate-300" />
          </div>
        ) : packs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-center">
            <Boxes className="w-8 h-8 text-slate-300 mb-2" />
            <p className="text-sm text-slate-500">{t("picker_no_packs")}</p>
          </div>
        ) : (
          <div className="p-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
            {packs.map((p) => {
              const disabled = alreadyPackIds.has(p.id);
              const pending = isPackPending(p);
              return (
                <button key={p.id} type="button" onClick={() => togglePack(p)} disabled={disabled}
                  className={`text-left p-4 rounded-xl border-2 transition-all ${disabled ? "opacity-40 cursor-not-allowed border-slate-200 dark:border-slate-700" : pending ? "border-[#B12B89] bg-blue-50/60 dark:bg-blue-900/10" : "border-slate-200 dark:border-slate-700 hover:border-blue-300 hover:bg-slate-50 dark:hover:bg-slate-800/50"}`}>
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-slate-800 dark:text-slate-100">{p.name}</p>
                      <p className="text-xs font-semibold text-blue-500 mt-1">{fmt(p.prixVentePack)} MAD</p>
                    </div>
                    <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center flex-shrink-0 mt-0.5 transition-all ${pending ? "bg-[#B12B89] border-[#B12B89]" : "border-slate-300 dark:border-slate-600"}`}>
                      {pending && <Check size={11} className="text-white" strokeWidth={3} />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </BaseModal>
  );
};
