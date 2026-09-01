import { useState } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Package, Check, Loader2, Plus, ChevronLeft, ChevronRight, Minus } from "lucide-react";
import { BaseModal } from "../../../shared/components/BaseModal";
import { SelectDropDown } from "../../../shared/components/SelectDropDown";

const articleKey = (a) => `${a.type}-${a.id}`;

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

export const SelectTransferArticlesModal = ({
  isOpen,
  articles,
  isLoading,
  onClose,
  onConfirm,
  searchQuery,
  onSearchChange,
  sourceDepot,
  families,
  familiesLoading,
  selectedFamily,
  onFamilyChange,
  pagination,
  currentPage,
  onPageChange,
  alreadyInTable,
  t,
}) => {
  const [pendingArticles, setPendingArticles] = useState([]);

  const alreadyKeys = new Set(alreadyInTable.map(articleKey));
  const isPending = (a) => pendingArticles.some((p) => articleKey(p) === articleKey(a));
  const isDisabled = (a) => alreadyKeys.has(articleKey(a));

  const handleToggle = (article) => {
    if (isDisabled(article)) return;
    if (isPending(article)) {
      setPendingArticles((prev) => prev.filter((a) => articleKey(a) !== articleKey(article)));
    } else {
      setPendingArticles((prev) => [...prev, { ...article, quantityReceived: 1, isTouched: false }]);
    }
  };

  const handleToggleAll = () => {
    const eligible = articles.filter((a) => !isDisabled(a));
    const allPending = eligible.every((a) => isPending(a));
    if (allPending) {
      const keys = new Set(eligible.map(articleKey));
      setPendingArticles((prev) => prev.filter((a) => !keys.has(articleKey(a))));
    } else {
      const toAdd = eligible.filter((a) => !isPending(a)).map((a) => ({ ...a, quantityReceived: 1, isTouched: false }));
      setPendingArticles((prev) => [...prev, ...toAdd]);
    }
  };

  const eligible = articles.filter((a) => !isDisabled(a));
  const pendingOnPage = eligible.filter((a) => isPending(a)).length;
  const allChecked = eligible.length > 0 && pendingOnPage === eligible.length;
  const someChecked = pendingOnPage > 0 && pendingOnPage < eligible.length;

  const familyOptions = families.map((f) => ({ value: f.id, label: f.name }));

  const inputClass = "w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#B12B89] outline-none transition dark:text-slate-100 text-sm";

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t("select_articles")}
      subtitle={`${sourceDepot?.name ? `${sourceDepot.name} · ` : ""}${pagination.totalItems ?? 0} ${t("available_articles")}${pendingArticles.length > 0 ? ` · ${pendingArticles.length} ${t("pending_add")}` : ""}`}
      icon={<Package className="w-5 h-5 text-[#B12B89]" />}
      iconBg="bg-blue-100 dark:bg-blue-900/30"
      maxWidth="max-w-2xl"
      bodyClassName="flex flex-col overflow-hidden p-0 min-h-0"
      footer={
        <div className="flex items-center justify-between">
          {pagination.totalPages > 1 ? (
            <div className="flex items-center gap-3">
              <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition">
                <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              </button>
              <span className="text-xs text-slate-500">{t("page")} {currentPage} / {pagination.totalPages}</span>
              <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === pagination.totalPages}
                className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition">
                <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              </button>
            </div>
          ) : <div />}
          <div className="flex items-center gap-3">
            <button onClick={onClose}
              className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl transition font-semibold text-sm">
              {t("cancel")}
            </button>
            <button onClick={() => onConfirm(pendingArticles)} disabled={pendingArticles.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#B12B89] hover:bg-[#B05596] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition font-semibold text-sm">
              <Plus className="w-4 h-4" />
              {t("add")} ({pendingArticles.length})
            </button>
          </div>
        </div>
      }
    >
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 space-y-3 flex-shrink-0">
        <div className="relative">
          <MagnifyingGlassIcon className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input type="text" placeholder={t("search_placeholder")} value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)} className={`${inputClass} pl-10`} autoFocus />
        </div>
        <SelectDropDown
          placeholder={t("all_families")}
          value={selectedFamily?.id || ""}
          options={familyOptions}
          isLoading={familiesLoading}
          onChange={(e) => {
            const family = families.find((f) => f.id === parseInt(e.target.value));
            onFamilyChange(family || null);
          }}
        />
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto mb-2" />
              <p className="text-sm text-slate-500">{t("loading")}</p>
            </div>
          </div>
        ) : articles.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
                <th className="px-6 py-3 w-12">
                  <Checkbox checked={allChecked} indeterminate={someChecked} onChange={handleToggleAll} />
                </th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t("article")}</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 hidden sm:table-cell">{t("type")}</th>
                <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{t("stock")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {articles.map((article) => {
                const disabled = isDisabled(article);
                const pending = isPending(article);
                return (
                  <tr key={articleKey(article)} onClick={() => handleToggle(article)}
                    className={`transition-colors ${
                      disabled ? "opacity-40 cursor-not-allowed bg-slate-50/50 dark:bg-slate-800/20"
                        : pending ? "bg-blue-50/70 dark:bg-blue-900/10 cursor-pointer"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer"
                    }`}
                  >
                    <td className="px-6 py-3.5">
                      <Checkbox checked={pending} disabled={disabled} onChange={() => handleToggle(article)} />
                    </td>
                    <td className="px-4 py-3.5">
                      <p className={`font-semibold text-sm ${pending && !disabled ? "text-blue-700 dark:text-blue-300" : "text-slate-800 dark:text-slate-100"}`}>
                        {article.name}
                        {disabled && (
                          <span className="ml-2 text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">{t("already_added")}</span>
                        )}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] font-mono text-slate-400">{article.barcode}</p>
                        {article.familyName && <p className="text-[10px] text-slate-400">· {article.familyName}</p>}
                      </div>
                    </td>
                    <td className="px-4 py-3.5 hidden sm:table-cell">
                      <span className={`text-[9px] font-bold uppercase px-2 py-1 rounded ${article.type === "variant" ? "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400" : "bg-blue-50 dark:bg-blue-900/20 text-[#B12B89] dark:text-blue-400"}`}>
                        {article.type === "variant" ? t("variant") : t("article_type")}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{article.quantityAvailable}</span>
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
              <p className="text-sm text-slate-500">{t("no_articles_found")}</p>
              {selectedFamily && <p className="text-xs text-slate-400 mt-1">{t("try_change_family")}</p>}
            </div>
          </div>
        )}
      </div>
    </BaseModal>
  );
};
