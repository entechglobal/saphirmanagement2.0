import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import {
  Warehouse, ChevronLeft, ChevronRight,
  CheckCircle2, Loader2, X,
} from "lucide-react";
import { toast } from "@/shared/utils/toast";
import {
  Select, MenuItem, Checkbox, ListItemText, OutlinedInput,
} from "@mui/material";
import { useDepots } from "../../../../repositories/hooks/useRepositories";
import { useQueries } from "@/shared/lib/query";
import { useCreateStock, stockKeys } from "../../../hooks/useStocks";
import { stocksApi } from "../../../api/stocks.api";

const BRAND = "#B12B89";
const ALL_SENTINEL = "__all__";

/**
 * Generic stock wizard for both variants and simple articles.
 *
 * Props:
 *  items           — array of { id, name }
 *  mode            — "variant" (default) | "article"
 *  excludeDepotIds — depot IDs to hide (already have stock)
 *  onClose         — called when user skips / closes without saving
 *  onFinish        — called after successful stock submission
 */
export const VariantStockWizardModal = ({
  items,
  mode = "variant",
  excludeDepotIds = [],
  onClose,
  onFinish,
}) => {
  const [stepIdx, setStepIdx] = useState(0);
  const [wizardData, setWizardData] = useState({});
  const [batchQty, setBatchQty] = useState("");
  const [batchAlert, setBatchAlert] = useState("");
  const [depotSelectOpen, setDepotSelectOpen] = useState(false);

  // Holds the depot IDs selected in the previous step for auto-carry-over.
  // Using a ref so the effect that re-initialises wizard data reads it synchronously
  // (state updates are async and would miss the re-init triggered by the step change).
  const carryOverIdsRef = useRef([]);

  const { data: depotsData, isLoading: depotsLoading } = useDepots({ pageSize: 1000 });
  const allDepots = depotsData?.data ?? [];
  const createStock = useCreateStock();

  // Pre-fetch existing stock for ALL items at once
  const stockQueries = useQueries({
    queries: items.map((item) => ({
      queryKey: mode === "variant"
        ? stockKeys.byVariant(item.id)
        : stockKeys.byArticle(item.id),
      queryFn: () => mode === "variant"
        ? stocksApi.getByVariantId(item.id)
        : stocksApi.getByArticleId(item.id),
      enabled: !!item.id,
    })),
  });

  const allLoaded = stockQueries.every((q) => q.isSuccess || q.isError);

  // Build effective items: only variants that still have at least one depot available
  const effectiveItems = allLoaded
    ? items.filter((item, i) => {
        const stockedIds = (stockQueries[i]?.data?.data ?? [])
          .filter((s) => s.depot)
          .map((s) => s.depot.id);
        const excluded = new Set([...excludeDepotIds, ...stockedIds]);
        return allDepots.some((d) => !excluded.has(d.id));
      })
    : [];

  const safeStepIdx = Math.min(stepIdx, Math.max(0, effectiveItems.length - 1));
  const currentItem = effectiveItems[safeStepIdx] ?? null;
  const isFirst = safeStepIdx === 0;
  const isLast = safeStepIdx === effectiveItems.length - 1;

  // Depots available for the current item
  const origIdx = items.findIndex((i) => i.id === currentItem?.id);
  const existingStock = stockQueries[origIdx]?.data?.data ?? [];
  const stockedIds = new Set([
    ...excludeDepotIds,
    ...existingStock.filter((s) => s.depot).map((s) => s.depot.id),
  ]);
  const depots = allDepots.filter((d) => !stockedIds.has(d.id));

  // Re-initialise depot entries when the step or available depot list changes.
  // Applies carry-over selection from the previous step for newly visited items.
  useEffect(() => {
    if (!currentItem || depots.length === 0) return;
    setWizardData((prev) => {
      const existing = prev[currentItem.id] ?? {};
      const depotMap = {};
      depots.forEach((d) => {
        depotMap[d.id] = existing[d.id] ?? {
          qty: "",
          alert: "0",
          selected: carryOverIdsRef.current.includes(d.id),
        };
      });
      return { ...prev, [currentItem.id]: depotMap };
    });
    setBatchQty("");
    setBatchAlert("");
  }, [currentItem?.id, depots.length]);

  const currentData = currentItem ? (wizardData[currentItem.id] ?? {}) : {};
  const selectedDepots = depots.filter((d) => currentData[d.id]?.selected);
  const selectedDepotIds = selectedDepots.map((d) => d.id);
  const allDepotsSelected = depots.length > 0 && selectedDepots.length === depots.length;
  const someDepotsSelected = selectedDepots.length > 0 && !allDepotsSelected;

  // ─── Depot selection handlers ─────────────────────────────────────────────

  const handleDepotSelectionChange = (event) => {
    if (!currentItem) return;
    const value = event.target.value; // array from MUI multi-select

    // Detect "select all / deselect all" sentinel
    if (value.includes(ALL_SENTINEL)) {
      const shouldSelectAll = !allDepotsSelected;
      setWizardData((prev) => {
        const itemData = { ...(prev[currentItem.id] ?? {}) };
        depots.forEach((d) => {
          itemData[d.id] = { ...(itemData[d.id] ?? { qty: "", alert: "0" }), selected: shouldSelectAll };
        });
        return { ...prev, [currentItem.id]: itemData };
      });
      return;
    }

    // Normal multi-select: value is the new array of selected depot IDs
    const newIds = value;
    setWizardData((prev) => {
      const itemData = { ...(prev[currentItem.id] ?? {}) };
      depots.forEach((d) => {
        itemData[d.id] = {
          ...(itemData[d.id] ?? { qty: "", alert: "0" }),
          selected: newIds.includes(d.id),
        };
      });
      return { ...prev, [currentItem.id]: itemData };
    });
  };

  const updateField = (depotId, field, value) => {
    if (!currentItem || Number(value) < 0) return;
    setWizardData((prev) => ({
      ...prev,
      [currentItem.id]: {
        ...prev[currentItem.id],
        [depotId]: { ...prev[currentItem.id]?.[depotId], [field]: value },
      },
    }));
  };

  const applyBatch = () => {
    if (!currentItem) return;
    setWizardData((prev) => {
      const itemData = { ...prev[currentItem.id] };
      selectedDepots.forEach((d) => {
        itemData[d.id] = {
          ...itemData[d.id],
          ...(batchQty !== "" && { qty: batchQty }),
          ...(batchAlert !== "" && { alert: batchAlert }),
        };
      });
      return { ...prev, [currentItem.id]: itemData };
    });
  };

  // Save selected depot IDs before moving to the next step so the next item
  // can pre-select the same depots automatically.
  const handleNext = () => {
    carryOverIdsRef.current = selectedDepots.map((d) => d.id);
    setStepIdx((p) => p + 1);
  };

  const handleFinish = async () => {
    const entries = [];
    Object.entries(wizardData).forEach(([itemId, depotMap]) => {
      Object.entries(depotMap).forEach(([depotId, data]) => {
        if (!data.selected || data.qty === "") return;
        const entry = {
          depotId: Number(depotId),
          quantityAvailable: Number(data.qty),
          alertThreshold: Number(data.alert) || 0,
        };
        if (mode === "variant") {
          entry.variantId = Number(itemId);
          entry.articleId = null;
        } else {
          entry.articleId = Number(itemId);
        }
        entries.push(entry);
      });
    });

    if (entries.length === 0) { onFinish(false); return; }

    try {
      await createStock.mutateAsync({ entries });
      toast.success("Stock ajouté avec succès");
      onFinish(true);
    } catch (err) {
      toast.error(err?.response?.data?.message || "Échec de l'ajout du stock");
    }
  };

  const showBatch = selectedDepots.length >= 2;
  const isSingleStep = effectiveItems.length <= 1;
  const isReady = allLoaded && !depotsLoading;

  // ─── Loading shell ────────────────────────────────────────────────────────

  if (!isReady) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center modal-backdrop p-4">
        <div className="bg-white dark:bg-[#1c1c1c] rounded-2xl border border-slate-200 dark:border-[#2e2e2e] w-full max-w-lg shadow-2xl flex flex-col">
          <div className="px-6 py-5 border-b border-slate-100 dark:border-[#2e2e2e] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                <Warehouse size={18} className="text-[#B12B89]" />
              </div>
              <p className="text-sm font-bold text-slate-400">Chargement…</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-[#222222] rounded-xl transition">
              <X size={16} className="text-slate-400" />
            </button>
          </div>
          <div className="flex justify-center items-center py-12">
            <Loader2 size={24} className="animate-spin text-blue-500" />
          </div>
          <div className="px-6 py-4 border-t border-slate-100 dark:border-[#2e2e2e]">
            <button type="button" onClick={onClose} className="text-sm font-semibold text-slate-400 hover:text-slate-600 transition">
              Fermer
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // ─── No depots exist at all ───────────────────────────────────────────────

  if (allDepots.length === 0) {
    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center modal-backdrop p-4">
        <div className="bg-white dark:bg-[#1c1c1c] rounded-2xl border border-slate-200 dark:border-[#2e2e2e] w-full max-w-sm shadow-2xl flex flex-col">
          <div className="px-6 py-5 border-b border-slate-100 dark:border-[#2e2e2e] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                <Warehouse size={18} className="text-amber-500" />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                Aucun dépôt disponible
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-[#222222] rounded-xl transition">
              <X size={16} className="text-slate-400" />
            </button>
          </div>
          <div className="px-6 py-8 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mb-1">
              <Warehouse size={26} className="text-amber-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
              Aucun dépôt n'a été créé dans le système.
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Pour ajouter du stock, vous devez d'abord créer au moins un dépôt.
            </p>
          </div>
          <div className="px-6 py-4 border-t border-slate-100 dark:border-[#2e2e2e] flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-2xl text-sm font-bold text-white transition"
              style={{ backgroundColor: BRAND }}
            >
              Fermer
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // ─── No available depots ───────────────────────────────────────────────────

  if (!currentItem) {
    const label = mode === "variant"
      ? "Toutes les variantes ont déjà du stock dans tous les dépôts disponibles."
      : "Cet article a déjà du stock dans tous les dépôts disponibles.";

    return createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center modal-backdrop p-4">
        <div className="bg-white dark:bg-[#1c1c1c] rounded-2xl border border-slate-200 dark:border-[#2e2e2e] w-full max-w-sm shadow-2xl flex flex-col">
          {/* Header */}
          <div className="px-6 py-5 border-b border-slate-100 dark:border-[#2e2e2e] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center">
                <Warehouse size={18} className="text-amber-500" />
              </div>
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                Aucun dépôt disponible
              </p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-[#222222] rounded-xl transition">
              <X size={16} className="text-slate-400" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-8 flex flex-col items-center gap-3 text-center">
            <div className="w-14 h-14 rounded-2xl bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center mb-1">
              <Warehouse size={26} className="text-amber-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 leading-relaxed">
              {label}
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Pour ajouter du stock, vous devez d'abord créer de nouveaux dépôts ou libérer des dépôts existants.
            </p>
          </div>

          {/* Footer */}
          <div className="px-6 py-4 border-t border-slate-100 dark:border-[#2e2e2e] flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2.5 rounded-2xl text-sm font-bold text-white transition"
              style={{ backgroundColor: BRAND }}
            >
              Fermer
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  }

  // ─── Main wizard ──────────────────────────────────────────────────────────

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center modal-backdrop p-4">
      <div className="bg-white dark:bg-[#1c1c1c] rounded-2xl border border-slate-200 dark:border-[#2e2e2e] w-full max-w-lg shadow-2xl flex flex-col max-h-[92vh]">

        {/* Header */}
        <div className="px-6 py-5 border-b border-slate-100 dark:border-[#2e2e2e] flex items-center gap-4">
          <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center flex-shrink-0">
            <Warehouse size={18} className="text-[#B12B89]" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {isSingleStep ? "Ajouter du stock" : `Étape ${safeStepIdx + 1} / ${effectiveItems.length}`}
            </p>
            <h2 className="text-base font-bold text-slate-800 dark:text-slate-100 truncate">
              {currentItem?.name}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-[#222222] rounded-xl transition">
            <X size={16} className="text-slate-400" />
          </button>
        </div>

        {/* Step progress bar */}
        {!isSingleStep && (
          <div className="px-6 pt-4 flex gap-1.5">
            {effectiveItems.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                  i <= safeStepIdx ? "bg-[#B12B89]" : "bg-slate-200 dark:bg-[#2e2e2e]"
                }`}
              />
            ))}
          </div>
        )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">

          {/* ── Depot multi-select dropdown ── */}
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Sélectionner les dépôts
            </p>

            <Select
              multiple
              fullWidth
              displayEmpty
              value={selectedDepotIds}
              open={depotSelectOpen}
              onOpen={() => setDepotSelectOpen(true)}
              onClose={() => setDepotSelectOpen(false)}
              onChange={handleDepotSelectionChange}
              input={<OutlinedInput />}
              renderValue={(selected) => {
                const real = selected.filter((v) => v !== ALL_SENTINEL);
                if (real.length === 0)
                  return <span style={{ color: "#94a3b8", fontSize: "0.875rem" }}>Choisir les dépôts…</span>;
                if (real.length === depots.length)
                  return <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>Tous les dépôts ({depots.length})</span>;
                return (
                  <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>
                    {real.length} dépôt{real.length > 1 ? "s" : ""} sélectionné{real.length > 1 ? "s" : ""}
                  </span>
                );
              }}
              MenuProps={{
                disableScrollLock: true,
                sx: { zIndex: 10002 },
                PaperProps: {
                  onMouseLeave: () => setDepotSelectOpen(false),
                  sx: {
                    borderRadius: "12px",
                    boxShadow: "0 10px 25px rgba(0,0,0,0.12)",
                    maxHeight: 260,
                    mt: "6px",
                  },
                },
              }}
              sx={{
                borderRadius: "12px",
                fontSize: "0.875rem",
                "& .MuiOutlinedInput-notchedOutline": { borderColor: "#e2e8f0" },
                "&:hover .MuiOutlinedInput-notchedOutline": { borderColor: "#cbd5e1" },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": { borderColor: "#3b82f6", borderWidth: "1px" },
                "& .MuiSelect-select": { padding: "11px 16px" },
              }}
            >
              {/* Select all row */}
              <MenuItem value={ALL_SENTINEL} sx={{ borderBottom: "1px solid #f1f5f9" }}>
                <Checkbox
                  checked={allDepotsSelected}
                  indeterminate={someDepotsSelected}
                  size="small"
                  sx={{ color: "#3b82f6", "&.Mui-checked, &.MuiCheckbox-indeterminate": { color: "#3b82f6" } }}
                />
                <ListItemText
                  primary={
                    <span style={{ fontSize: "0.8125rem", fontWeight: 700 }}>
                      Tous les dépôts
                    </span>
                  }
                />
              </MenuItem>

              {/* Individual depot rows */}
              {depots.map((depot) => (
                <MenuItem key={depot.id} value={depot.id} sx={{ py: 1 }}>
                  <Checkbox
                    checked={selectedDepotIds.includes(depot.id)}
                    size="small"
                    sx={{ color: "#3b82f6", "&.Mui-checked": { color: "#3b82f6" } }}
                  />
                  <ListItemText
                    primary={
                      <span style={{ fontSize: "0.875rem", fontWeight: 600 }}>{depot.name}</span>
                    }
                    secondary={
                      depot.societe?.raisonSocial
                        ? <span style={{ fontSize: "10px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", color: "#94a3b8" }}>
                            {depot.societe.raisonSocial}
                          </span>
                        : undefined
                    }
                  />
                </MenuItem>
              ))}
            </Select>
          </div>

          {/* ── Per-depot qty / alert rows ── */}
          {selectedDepots.length > 0 && (
            <div className="space-y-2.5">
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Quantités par dépôt
              </p>

              {selectedDepots.map((depot) => {
                const data = currentData[depot.id] ?? { qty: "", alert: "0" };
                return (
                  <div
                    key={depot.id}
                    className="rounded-2xl border border-blue-200 dark:border-blue-800/60 bg-blue-50/40 dark:bg-blue-900/10 px-4 py-3"
                  >
                    {/* Depot label */}
                    <div className="flex items-baseline gap-2 mb-2.5">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
                        {depot.name}
                      </span>
                      {depot.societe?.raisonSocial && (
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider shrink-0">
                          {depot.societe.raisonSocial}
                        </span>
                      )}
                    </div>

                    {/* Inputs */}
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                          Quantité
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={data.qty}
                          onChange={(e) => updateField(depot.id, "qty", e.target.value)}
                          placeholder="0"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#2e2e2e] text-sm font-semibold bg-white dark:bg-[#222222] dark:text-slate-100 focus:ring-2 focus:ring-[#B12B89] outline-none transition"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                          Seuil d'alerte
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={data.alert}
                          onChange={(e) => updateField(depot.id, "alert", e.target.value)}
                          placeholder="0"
                          className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#2e2e2e] text-sm font-semibold bg-white dark:bg-[#222222] dark:text-slate-100 focus:ring-2 focus:ring-[#B12B89] outline-none transition"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* ── Batch apply — visible when 2+ depots selected ── */}
          {showBatch && (
            <div className="pt-3 border-t border-slate-100 dark:border-[#2e2e2e] space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Appliquer à tous les dépôts sélectionnés ({selectedDepots.length})
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Même quantité</label>
                  <input
                    type="number"
                    min="0"
                    value={batchQty}
                    onChange={(e) => setBatchQty(e.target.value)}
                    placeholder="Ex : 100"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#2e2e2e] text-sm font-semibold bg-white dark:bg-[#222222] dark:text-slate-100 focus:ring-2 focus:ring-[#B12B89] outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-400 mb-1">Même seuil d'alerte</label>
                  <input
                    type="number"
                    min="0"
                    value={batchAlert}
                    onChange={(e) => setBatchAlert(e.target.value)}
                    placeholder="Ex : 5"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-[#2e2e2e] text-sm font-semibold bg-white dark:bg-[#222222] dark:text-slate-100 focus:ring-2 focus:ring-[#B12B89] outline-none transition"
                  />
                </div>
              </div>
              <button
                type="button"
                onClick={applyBatch}
                disabled={batchQty === "" && batchAlert === ""}
                className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition disabled:opacity-40"
                style={{ backgroundColor: BRAND }}
              >
                Appliquer à tous
              </button>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-[#2e2e2e] flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition px-2"
          >
            Passer
          </button>

          <div className="flex items-center gap-2">
            {!isFirst && (
              <button
                type="button"
                onClick={() => setStepIdx((p) => p - 1)}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-2xl border border-slate-200 dark:border-[#2e2e2e] text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#222222] transition"
              >
                <ChevronLeft size={15} className="rtl:scale-x-[-1]" /> Retour
              </button>
            )}

            {!isLast ? (
              <button
                type="button"
                onClick={handleNext}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-2xl text-sm font-bold text-white transition"
                style={{ backgroundColor: BRAND }}
              >
                Suivant <ChevronRight size={15} className="rtl:scale-x-[-1]" />
              </button>
            ) : (
              <button
                type="button"
                onClick={handleFinish}
                disabled={createStock.isPending}
                className="flex items-center gap-1.5 px-6 py-2.5 rounded-2xl text-sm font-bold text-white transition disabled:opacity-50"
                style={{ backgroundColor: BRAND }}
              >
                {createStock.isPending
                  ? <><Loader2 size={15} className="animate-spin" /> Enregistrement…</>
                  : <><CheckCircle2 size={15} /> Enregistrer le stock</>
                }
              </button>
            )}
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};
