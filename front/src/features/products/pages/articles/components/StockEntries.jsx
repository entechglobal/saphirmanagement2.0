import { useState } from "react";
import { Warehouse } from "lucide-react";
import { Input } from "../../../../../shared/components/Input";
import { SelectDropDown } from "../../../../../shared/components/SelectDropDown";
import { useTranslation } from "react-i18next";

export default function StockEntries({
  depots = [],
  articleId = null,
  variantId = null,
  entries = [],
  onChange,
  multiple = true,
}) {
  const { t } = useTranslation("stocks");

  /* ---------------------------------- */
  /* Helpers */
  /* ---------------------------------- */
  const updateEntries = (newEntries) => {
    onChange?.(newEntries);
  };

  // Convert depots to options format for SelectDropDown
  const depotOptions = depots.map((depot) => ({
    value: depot.id,
    label: depot.name,
    subLabel: depot.societe?.raisonSocial,
    img: depot.societe?.logo || `https://ui-avatars.com/api/?name=${depot.societe?.raisonSocial || 'S'}`,
    icon: <Warehouse size={10} className="text-blue-500" />
  }));

  // Get selected depot IDs
  const selectedDepotIds = entries.map(e => e.depotId);

  // Handle selection change
  const handleDepotChange = (event) => {
    const value = event.target.value;
    
    if (!multiple) {
      // Single selection
      const newEntry = {
        depotId: value,
        articleId: articleId || null,
        variantId: variantId || null,
        quantityAvailable: "",
        alertThreshold: "",
      };
      updateEntries([newEntry]);
    } else {
      // Multiple selection
      const selectedIds = typeof value === 'string' ? value.split(',') : value;
      
      // Create entries for newly selected depots
      const newEntries = selectedIds.map(depotId => {
        // Keep existing entry if it exists
        const existing = entries.find(e => e.depotId === depotId);
        if (existing) return existing;
        
        // Create new entry
        return {
          depotId,
          articleId: articleId || null,
          variantId: variantId || null,
          quantityAvailable: "",
          alertThreshold: "",
        };
      });
      
      updateEntries(newEntries);
    }
  };

  const updateAll = (field, value) => {
    updateEntries(entries.map((e) => ({ ...e, [field]: value })));
  };

  const updateSingle = (depotId, field, value) => {
    updateEntries(
      entries.map((e) => (e.depotId === depotId ? { ...e, [field]: value } : e))
    );
  };

  return (
    <div className="space-y-5">
      {/* DEPOT SELECTOR - Using Reusable SelectDropDown */}
      <SelectDropDown
        label={t("entries.select_depots")}
        placeholder={multiple ? t("entries.choose_depots") : t("entries.choose_depot")}
        options={depotOptions}
        value={multiple ? selectedDepotIds : (selectedDepotIds[0] || "")}
        onChange={handleDepotChange}
        multiple={multiple}
        required={entries.length === 0}
        error={entries.length === 0 ? t("entries.select_error") : null}
      />

      {/* MULTIPLE DEPOTS (Bulk Edit) */}
      {entries.length > 1 && (
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 bg-blue-50 dark:bg-blue-900/20 space-y-3">
          <p className="text-xs font-bold uppercase tracking-wider text-[#B12B89]">
            {t("entries.apply_all")}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <Input
              type="number"
              min="0"
              value={entries[0]?.quantityAvailable || ""}
              onChange={(e) => updateAll("quantityAvailable", e.target.value)}
              placeholder={t("entries.qty_available")}
              required
              label={t("entries.qty_available")}
              error={!entries[0]?.quantityAvailable ? t("entries.required") : null}
            />
            <Input
              type="number"
              min="0"
              value={entries[0]?.alertThreshold || ""}
              onChange={(e) => updateAll("alertThreshold", e.target.value)}
              placeholder={t("entries.alert_threshold")}
              required
              label={t("entries.alert_threshold")}
              error={!entries[0]?.alertThreshold ? t("entries.required") : null}
            />
          </div>
        </div>
      )}

      {/* SINGLE DEPOT OR LIST */}
      {entries.length === 1 &&
        entries.map((entry) => {
          const depot = depots.find((d) => d.id === entry.depotId);
          return (
            <div
              key={entry.depotId}
              className="border border-slate-200 dark:border-slate-800 rounded-xl p-4 space-y-3 bg-white dark:bg-slate-900"
            >
              <div className="font-semibold text-sm flex items-center gap-2">
                <Warehouse size={16} />
                {depot?.name}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Input
                  type="number"
                  min="0"
                  value={entry.quantityAvailable || ""}
                  onChange={(e) =>
                    updateSingle(entry.depotId, "quantityAvailable", e.target.value)
                  }
                  placeholder={t("entries.qty_available")}
                  label={t("entries.qty_available")}
                  required
                  error={!entry.quantityAvailable ? t("entries.required") : null}
                />
                <Input
                  type="number"
                  min="0"
                  value={entry.alertThreshold || ""}
                  onChange={(e) =>
                    updateSingle(entry.depotId, "alertThreshold", e.target.value)
                  }
                  placeholder={t("entries.alert_threshold")}
                  label={t("entries.alert_threshold")}
                  required
                  error={!entry.alertThreshold ? t("entries.required") : null}
                />
              </div>
            </div>
          );
        })}
    </div>
  );
}