import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Wallet } from "lucide-react";
import { useTranslation } from "react-i18next";
import { BaseModal } from "../../../../shared/components/BaseModal";
import { SelectDropDown } from "../../../../shared/components/SelectDropDown";
import { useBanques } from "../../../reglement/hooks/useReglementClient";
import { MODE_REGLEMENT_OPTIONS, MODES_WITH_BANQUE } from "../api/commands.api";

const emptyLine = (mode = "ESPECE") => ({
  amount: "",
  modeReglement: mode,
  banqueId: "",
});

export const PayOrderModal = ({
  isOpen,
  order,
  isLoading = false,
  onClose,
  onConfirm,
}) => {
  const { t } = useTranslation("commands");
  const { data: banquesData } = useBanques();
  const banques = banquesData?.data ?? banquesData ?? [];
  const banqueOptions = (Array.isArray(banques) ? banques : []).map((b) => ({
    value: String(b.id),
    label: b.name || b.raisonSocial || `#${b.id}`,
  }));

  const remaining = useMemo(() => {
    const due = Number(order?.amountDue ?? 0);
    const paid = Number(order?.amountPaid ?? 0);
    return Math.max(0, parseFloat((due - paid).toFixed(2)));
  }, [order]);

  const defaultMode = order?.modeReglement || "ESPECE";
  const defaultBanque = order?.banqueId ? String(order.banqueId) : "";

  const [mode, setMode] = useState("full");
  const [lines, setLines] = useState([emptyLine(defaultMode)]);
  const [fullBanqueId, setFullBanqueId] = useState(defaultBanque);

  useEffect(() => {
    if (!isOpen || !order) return;
    setMode("full");
    setFullBanqueId(order.banqueId ? String(order.banqueId) : "");
    setLines([
      {
        amount: remaining > 0 ? String(remaining) : "",
        modeReglement: order.modeReglement || "ESPECE",
        banqueId: order.banqueId ? String(order.banqueId) : "",
      },
    ]);
  }, [isOpen, order, remaining]);

  const parsedLines = lines.map((line) => ({
    amount: parseFloat(line.amount) || 0,
    modeReglement: line.modeReglement,
    banqueId: MODES_WITH_BANQUE.includes(line.modeReglement)
      ? parseInt(line.banqueId, 10) || null
      : null,
  }));
  const splitTotal = parseFloat(
    parsedLines.reduce((acc, l) => acc + l.amount, 0).toFixed(2),
  );
  const splitValid =
    Math.abs(splitTotal - remaining) < 0.01 &&
    parsedLines.every(
      (l) =>
        l.amount > 0 &&
        (!MODES_WITH_BANQUE.includes(l.modeReglement) || l.banqueId),
    );

  const needsFullBank = MODES_WITH_BANQUE.includes(defaultMode);
  const fullBankOk = !needsFullBank || !!fullBanqueId;
  const canSubmit = remaining <= 0 || (mode === "full" && fullBankOk) || splitValid;

  const usesCash =
    (mode === "full" && defaultMode === "ESPECE") ||
    (mode === "split" && parsedLines.some((l) => l.modeReglement === "ESPECE"));

  const handleSubmit = () => {
    if (!canSubmit || isLoading) return;
    if (remaining <= 0) {
      onConfirm([]);
      return;
    }
    if (mode === "full") {
      onConfirm([
        {
          amount: remaining,
          modeReglement: defaultMode,
          banqueId: needsFullBank ? parseInt(fullBanqueId, 10) || null : null,
        },
      ]);
      return;
    }
    onConfirm(
      parsedLines.map((l) => ({
        amount: l.amount,
        modeReglement: l.modeReglement,
        banqueId: l.banqueId,
      })),
    );
  };

  const updateLine = (idx, patch) => {
    setLines((prev) =>
      prev.map((line, i) => (i === idx ? { ...line, ...patch } : line)),
    );
  };

  const modeLabel =
    MODE_REGLEMENT_OPTIONS.find((o) => o.value === defaultMode)?.label ||
    defaultMode;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      disableClose={isLoading}
      title={t("pay_modal.title")}
      subtitle={order?.clientName || order?.documentNumber || ""}
      icon={<Wallet size={18} className="text-[#B12B89]" />}
      iconBg="bg-[#B12B89]/10"
      maxWidth="max-w-lg"
      zIndex="z-[10000]"
      footer={
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            disabled={isLoading}
            onClick={onClose}
            className="px-4 h-10 rounded-md border border-slate-200 dark:border-[#2e2e2e] text-sm font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#222222]"
          >
            {t("pay_modal.cancel")}
          </button>
          <button
            type="button"
            disabled={!canSubmit || isLoading}
            onClick={handleSubmit}
            className="px-5 h-10 rounded-md text-sm font-medium text-white bg-[#B12B89] hover:bg-[#9a2476] disabled:opacity-50"
          >
            {isLoading ? t("pay_modal.saving") : t("pay_modal.confirm")}
          </button>
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-xl bg-slate-50 dark:bg-[#222222] px-4 py-3">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {t("pay_modal.remaining")}
          </p>
          <p className="text-xl font-bold tabular-nums text-slate-900 dark:text-slate-50">
            {remaining.toLocaleString("fr-FR", {
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            })}{" "}
            MAD
          </p>
        </div>

        {remaining > 0 && (
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode("full")}
            className={`rounded-xl border px-3 py-2.5 text-left text-sm font-semibold ${
              mode === "full"
                ? "border-[#B12B89] bg-[#B12B89]/10 text-[#B12B89]"
                : "border-slate-200 dark:border-[#2e2e2e] text-slate-600 dark:text-slate-300"
            }`}
          >
            {t("pay_modal.full_same")}
            <span className="mt-0.5 block text-[11px] font-medium opacity-80">
              {modeLabel}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setMode("split")}
            className={`rounded-xl border px-3 py-2.5 text-left text-sm font-semibold ${
              mode === "split"
                ? "border-[#B12B89] bg-[#B12B89]/10 text-[#B12B89]"
                : "border-slate-200 dark:border-[#2e2e2e] text-slate-600 dark:text-slate-300"
            }`}
          >
            {t("pay_modal.change_split")}
            <span className="mt-0.5 block text-[11px] font-medium opacity-80">
              {t("pay_modal.change_split_hint")}
            </span>
          </button>
        </div>
        )}

        {mode === "full" && remaining > 0 && needsFullBank && (
          <SelectDropDown
            name="pay-full-bank"
            value={fullBanqueId}
            placeholder={t("pay_modal.select_bank")}
            options={banqueOptions}
            onChange={(e) => setFullBanqueId(e.target.value)}
          />
        )}

        {usesCash && remaining > 0 && (
          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            {t("pay_modal.cash_hint")}
          </p>
        )}

        {mode === "split" && (
          <div className="space-y-3">
            {lines.map((line, idx) => (
              <div
                key={idx}
                className="rounded-xl border border-slate-200 dark:border-[#2e2e2e] p-3 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                    {t("pay_modal.line", { n: idx + 1 })}
                  </p>
                  {lines.length > 1 && (
                    <button
                      type="button"
                      onClick={() => setLines((prev) => prev.filter((_, i) => i !== idx))}
                      className="p-1 text-slate-400 hover:text-red-500"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={line.amount}
                  onChange={(e) => updateLine(idx, { amount: e.target.value })}
                  placeholder={t("pay_modal.amount")}
                  className="w-full h-10 px-3 rounded-md border border-slate-200 dark:border-[#2e2e2e] bg-white dark:bg-[#222222] text-sm"
                />
                <SelectDropDown
                  name={`pay-mode-${idx}`}
                  value={line.modeReglement}
                  options={MODE_REGLEMENT_OPTIONS.map((o) => ({
                    value: o.value,
                    label: o.label,
                  }))}
                  onChange={(e) =>
                    updateLine(idx, {
                      modeReglement: e.target.value,
                      banqueId: MODES_WITH_BANQUE.includes(e.target.value)
                        ? line.banqueId
                        : "",
                    })
                  }
                />
                {MODES_WITH_BANQUE.includes(line.modeReglement) && (
                  <SelectDropDown
                    name={`pay-bank-${idx}`}
                    value={line.banqueId}
                    placeholder={t("pay_modal.select_bank")}
                    options={banqueOptions}
                    onChange={(e) => updateLine(idx, { banqueId: e.target.value })}
                  />
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={() => setLines((prev) => [...prev, emptyLine("ESPECE")])}
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#B12B89]"
            >
              <Plus size={14} />
              {t("pay_modal.add_line")}
            </button>
            <p
              className={`text-xs font-medium ${
                splitValid ? "text-emerald-600" : "text-amber-600"
              }`}
            >
              {t("pay_modal.split_total", {
                total: splitTotal.toLocaleString("fr-FR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }),
                remaining: remaining.toLocaleString("fr-FR", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                }),
              })}
            </p>
          </div>
        )}
      </div>
    </BaseModal>
  );
};
