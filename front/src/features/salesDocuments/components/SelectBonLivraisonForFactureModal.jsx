import { useEffect, useRef, useState } from "react";
import { useQuery } from "@/shared/lib/query";
import dayjs from "dayjs";
import { Check, ChevronLeft, ChevronRight, Loader2, Truck } from "lucide-react";
import { MagnifyingGlassIcon as SearchIcon } from "@heroicons/react/24/outline";
import { BaseModal } from "../../../shared/components/BaseModal";
import { bonLivraisonsApi } from "../../bonlivraison/api/bonLivraisons.api";

export const SelectBonLivraisonForFactureModal = ({
  isOpen,
  onClose,
  onSelect,
}) => {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => {
    if (!isOpen) return;
    setSearch("");
    setDebounced("");
    setPage(1);
    setSelected(null);
  }, [isOpen]);

  const handleSearch = (val) => {
    setSearch(val);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setDebounced(val);
      setPage(1);
    }, 350);
  };

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ["bl-for-facture", page, debounced],
    queryFn: () =>
      bonLivraisonsApi.getAll({
        page,
        limit: 15,
        status: "COMPLETED",
        keyword: debounced || undefined,
      }),
    enabled: isOpen,
    keepPreviousData: true,
  });

  const items = (data?.data ?? []).filter((bl) => {
    if (!debounced.trim()) return true;
    const q = debounced.trim().toLowerCase();
    const num = bl.document?.documentNumber?.toLowerCase() || "";
    const client =
      bl.document?.client?.name?.toLowerCase() ||
      bl.document?.clientName?.toLowerCase() ||
      "";
    return num.includes(q) || client.includes(q);
  });
  const pagination = data?.pagination ?? { totalPages: 1, total: 0 };
  const totalPages = Math.max(pagination.totalPages ?? 1, 1);

  const confirm = async () => {
    if (!selected) return;
    setLoadingDetail(true);
    try {
      const res = await bonLivraisonsApi.getById(selected.id);
      onSelect(res?.data ?? res);
    } finally {
      setLoadingDetail(false);
    }
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Choisir un bon de livraison"
      subtitle="BL validés uniquement — la facture sera liée au BL sélectionné"
      icon={<Truck className="w-5 h-5 text-emerald-600" />}
      iconBg="bg-emerald-50 dark:bg-emerald-900/30"
      maxWidth="max-w-2xl"
      bodyClassName="flex flex-col overflow-hidden p-0 min-h-0"
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 rounded-lg border border-slate-200 dark:border-[#2e2e2e] disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-xs text-slate-500 tabular-nums">
              Page {page} / {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setPage((p) => p + 1)}
              disabled={page >= totalPages}
              className="p-2 rounded-lg border border-slate-200 dark:border-[#2e2e2e] disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 border border-slate-200 dark:border-[#2e2e2e] rounded-xl text-sm font-semibold"
            >
              Retour
            </button>
            <button
              type="button"
              onClick={confirm}
              disabled={!selected || loadingDetail}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#B12B89] hover:bg-[#B05596] disabled:opacity-50 text-white rounded-xl text-sm font-semibold"
            >
              {loadingDetail ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : null}
              Utiliser ce BL
            </button>
          </div>
        </div>
      }
    >
      <div className="px-6 py-4 border-b border-slate-200 dark:border-[#2e2e2e]">
        <div className="relative">
          {isLoading || isFetching ? (
            <Loader2 className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-blue-400 animate-spin" />
          ) : (
            <SearchIcon className="w-4 h-4 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          )}
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Rechercher par N° BL ou client…"
            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#222222] border border-slate-200 dark:border-[#2e2e2e] rounded-xl text-sm outline-none focus:ring-2 focus:ring-[#B12B89]/20"
            autoFocus
          />
        </div>
      </div>

      <ul className="flex-1 overflow-y-auto divide-y divide-slate-100 dark:divide-[#2e2e2e] min-h-[280px]">
        {items.length === 0 && !isLoading ? (
          <li className="py-16 text-center text-sm text-slate-400">
            Aucun BL validé trouvé
          </li>
        ) : (
          items.map((bl) => {
            const active = selected?.id === bl.id;
            const clientName =
              bl.document?.client?.name || bl.document?.clientName || "—";
            return (
              <li key={bl.id}>
                <button
                  type="button"
                  onClick={() => setSelected(bl)}
                  className={`w-full px-6 py-3 flex items-center gap-3 text-left transition ${
                    active
                      ? "bg-blue-50 dark:bg-blue-950/30"
                      : "hover:bg-slate-50 dark:hover:bg-[#222222]/50"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-md border-2 ${
                      active
                        ? "bg-[#B12B89] border-[#B12B89]"
                        : "border-slate-300 dark:border-[#3a3a3a]"
                    }`}
                  >
                    {active && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold font-mono text-slate-800 dark:text-slate-100">
                      {bl.document?.documentNumber}
                    </p>
                    <p className="text-xs text-slate-500 truncate">
                      {clientName} ·{" "}
                      {dayjs(bl.documentDate).format("DD/MM/YYYY")}
                    </p>
                  </div>
                  <span className="text-sm font-bold tabular-nums text-slate-700 dark:text-slate-200">
                    {Number(bl.document?.totalTTC || 0).toLocaleString("fr-MA", {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}{" "}
                    DH
                  </span>
                </button>
              </li>
            );
          })
        )}
      </ul>
    </BaseModal>
  );
};
