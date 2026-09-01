import { useState, useRef, useEffect } from "react";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";
import { Box, Check, Loader2, Plus, ChevronLeft, ChevronRight } from "lucide-react";
import { useBRPacks } from "../hooks/useBonRetourClients";
import { BaseModal } from "../../../shared/components/BaseModal";

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
    {!disabled && checked ? <Check className="w-3 h-3 text-white" strokeWidth={3} /> : null}
  </button>
);

export const SelectBRPacksModal = ({ isOpen, onClose, onConfirm, alreadyInTable, t }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [pendingPacks, setPendingPacks] = useState([]);
  const timerRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setPendingPacks([]);
      setSearchQuery("");
      setDebouncedSearch("");
      setCurrentPage(1);
    }
  }, [isOpen]);

  const handleSearchChange = (val) => {
    setSearchQuery(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { setDebouncedSearch(val); setCurrentPage(1); }, 350);
  };

  const { data: packsData, isLoading, isFetching } = useBRPacks({
    search: debouncedSearch || undefined,
    page: currentPage,
    limit: 10,
    enabled: isOpen,
  });

  const packs = packsData?.data ?? [];
  const pagination = packsData?.pagination ?? { totalPages: 1, total: 0 };
  const totalPages = Math.max(pagination.totalPages ?? 1, 1);

  const alreadyIds = new Set((alreadyInTable ?? []).map((p) => p.packId));
  const isPending = (p) => pendingPacks.some((x) => x.packId === p.id);
  const isDisabled = (p) => alreadyIds.has(p.id);

  const handleToggle = (pack) => {
    if (isDisabled(pack)) return;
    if (isPending(pack)) {
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
          isTouched: true,
          isExisting: false,
        },
      ]);
    }
  };

  const inputClass =
    "w-full px-4 py-2.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-[#B12B89] outline-none transition dark:text-slate-100 text-sm";

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t?.("select_packs", "Sélectionner des packs")}
      subtitle={`${pagination.total ?? 0} ${t?.("packs_available", "packs disponibles")}${pendingPacks.length > 0 ? ` · ${pendingPacks.length} ${t?.("selected_count", "sélectionné(s)")}` : ""}`}
      icon={<Box className="w-5 h-5 text-violet-600" />}
      iconBg="bg-violet-100 dark:bg-violet-900/30"
      maxWidth="max-w-2xl"
      bodyClassName="flex flex-col overflow-hidden p-0 min-h-0"
      footer={
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((p) => p - 1)}
              disabled={currentPage === 1}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronLeft className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            </button>
            <span className="text-xs text-slate-500 tabular-nums min-w-[80px] text-center">
              {t?.("page", "Page")} {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={currentPage >= totalPages}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition"
            >
              <ChevronRight className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            </button>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl transition font-semibold text-sm"
            >
              {t?.("cancel", "Annuler")}
            </button>
            <button
              onClick={() => onConfirm(pendingPacks)}
              disabled={pendingPacks.length === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#B12B89] hover:bg-[#B05596] disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl transition font-semibold text-sm"
            >
              <Plus className="w-4 h-4" />
              {t?.("add", "Ajouter")} ({pendingPacks.length})
            </button>
          </div>
        </div>
      }
    >
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex-shrink-0">
        <div className="relative">
          {isLoading || isFetching ? (
            <Loader2 className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-blue-400 animate-spin" />
          ) : (
            <MagnifyingGlassIcon className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          )}
          <input
            type="text"
            placeholder={t?.("search_packs", "Rechercher des packs...")}
            value={searchQuery}
            onChange={(e) => handleSearchChange(e.target.value)}
            className={`${inputClass} pl-10`}
            autoFocus
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0">
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <Loader2 className="w-8 h-8 animate-spin text-slate-400 mx-auto" />
          </div>
        ) : packs.length > 0 ? (
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
                <th className="px-6 py-3 w-12"></th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {t?.("pack", "Pack")}
                </th>
                <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  {t?.("sale_price", "Prix vente")}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {packs.map((pack) => {
                const disabled = isDisabled(pack);
                const pending = isPending(pack);
                return (
                  <tr
                    key={`pack-${pack.id}`}
                    onClick={() => handleToggle(pack)}
                    className={`transition-colors ${
                      disabled
                        ? "opacity-40 cursor-not-allowed bg-slate-50/50 dark:bg-slate-800/20"
                        : pending
                        ? "bg-blue-50/70 dark:bg-blue-900/10 cursor-pointer"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer"
                    }`}
                  >
                    <td className="px-6 py-3.5">
                      <Checkbox checked={pending} disabled={disabled} onChange={() => handleToggle(pack)} />
                    </td>
                    <td className="px-4 py-3.5">
                      <p
                        className={`font-semibold text-sm ${
                          pending && !disabled ? "text-blue-700 dark:text-blue-300" : "text-slate-800 dark:text-slate-100"
                        }`}
                      >
                        {pack.name}
                        {disabled && (
                          <span className="ml-2 text-[9px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-700 px-1.5 py-0.5 rounded">
                            {t?.("already_added", "Déjà ajouté")}
                          </span>
                        )}
                      </p>
                      {pack.barcode && (
                        <p className="text-[10px] font-mono text-slate-400 mt-0.5">{pack.barcode}</p>
                      )}
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
              <Box className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <p className="text-sm text-slate-500">{t?.("no_packs_found", "Aucun pack trouvé")}</p>
              <p className="text-xs text-slate-400 mt-1">{t?.("try_different_search", "Essayez une autre recherche")}</p>
            </div>
          </div>
        )}
      </div>
    </BaseModal>
  );
};
