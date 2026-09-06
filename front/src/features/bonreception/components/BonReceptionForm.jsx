import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@/shared/lib/query";
import { toast } from "@/shared/utils/toast";
import {
  Package,
  Plus,
  Trash2,
  Lock,
  RefreshCw,
  X,
} from "lucide-react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";

import {
  useCreateBonReception,
  useNextBRNumber,
  useDepots,
  useFrsAdvances,
} from "../hooks/useBonReceptions";
import useAuthStore from "../../auth/store/authStore";
import { FormPageHeader } from "../../../shared/components/FormPageHeader";
import { Input } from "../../../shared/components/Input";
import { SelectDropDown } from "../../../shared/components/SelectDropDown";
import { FormCard, FormFieldGrid, FormGroup, FormShell, NextNumberBadge } from "../../../shared/components/FormCard";
import { FormActions } from "../../../shared/components/FormActions";
import { FORM_CONTROL, FORM_CONTROL_DISABLED, FORM_CONTROL_DASHED, FORM_ICON_BTN, FORM_ICON_BTN_MUTED, FORM_LABEL, DATE_PICKER_SX } from "../../../shared/components/formStyles";
import { SelectBRProductsModal } from "./SelectBRProductsModal";
import { SearchableFrsSelect } from "./SearchableFrsSelect";

const productKey = (p) => `${p.type}-${p.id}`;

const fmt = (n) =>
  Number(n ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const generateRef = () => {
  const date = dayjs().format("YYYYMMDD");
  const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `REF-${date}-${rand}`;
};

/* ─────── EditableCell ─────── */
const EditableCell = ({ value, onActivate, onCommit, min = 0, max, step = 1, width = "w-24", className = "" }) => {
  const [raw, setRaw] = useState("");
  const [editing, setEditing] = useState(false);

  const handleFocus = () => { onActivate?.(); setRaw(String(value)); setEditing(true); };
  const handleBlur = () => {
    setEditing(false);
    let parsed = parseFloat(raw);
    if (isNaN(parsed)) parsed = 0;
    onCommit(parsed);
  };
  const handleChange = (e) => {
    if (editing) { setRaw(e.target.value); }
    else {
      let parsed = parseFloat(e.target.value);
      if (isNaN(parsed)) parsed = 0;
      onActivate?.();
      onCommit(parsed);
    }
  };

  return (
    <input
      type="number" min={min} max={max} step={step}
      value={editing ? raw : value}
      onFocus={handleFocus} onBlur={handleBlur} onChange={handleChange}
      className={`${width} px-2 py-1.5 border rounded-lg text-center text-sm font-bold outline-none focus:ring-2 focus:ring-[#B12B89] transition-all dark:text-slate-100 bg-white dark:bg-[#222222] border-slate-200 dark:border-[#2e2e2e] ${className}`}
    />
  );
};

/* ─────── PV Confirm Modal ─────── */
const PVConfirmModal = ({ isOpen, onNo, onYes, t }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center modal-backdrop p-4">
      <div
        className="bg-white dark:bg-[#1c1c1c] rounded-2xl shadow-2xl w-full max-w-sm border border-slate-200 dark:border-[#2e2e2e] p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 mb-2">
          {t("pv_confirm.title")}
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">
          {t("pv_confirm.description")}
        </p>
        <div className="flex gap-3">
          <button
            onClick={onNo}
            className="flex-1 py-3 rounded-xl border border-slate-200 dark:border-[#2e2e2e] text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#222222] transition"
          >
            {t("pv_confirm.no")}
          </button>
          <button
            onClick={onYes}
            className="flex-1 py-3 rounded-xl bg-[#B12B89] hover:bg-[#B05596] text-white text-sm font-bold transition shadow-lg shadow-[#B12B89]/30 dark:shadow-none"
          >
            {t("pv_confirm.yes")}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─────── PV Bulk Update Modal ─────── */
const PVBulkUpdateModal = ({ isOpen, products, onConfirm, onCancel, t }) => {
  const [rows, setRows] = useState([]);

  useEffect(() => {
    if (isOpen && products.length > 0) {
      setRows(
        products.map((p) => {
          const delta = (p.newPrixAchat ?? p.prixAchat ?? 0) - (p.prixAchat ?? 0);
          const clamp = (v) => Math.max(0, Math.round(v * 100) / 100);
          return {
            key: productKey(p),
            name: p.name,
            oldPA: p.prixAchat ?? 0,
            newPA: p.newPrixAchat ?? p.prixAchat ?? 0,
            pv1: p.prixVente1 ?? 0,
            pv2: p.prixVente2 ?? 0,
            pv3: p.prixVente3 ?? 0,
            newPv1: String(clamp((p.prixVente1 ?? 0) + delta)),
            newPv2: String(clamp((p.prixVente2 ?? 0) + delta)),
            newPv3: String(clamp((p.prixVente3 ?? 0) + delta)),
          };
        })
      );
    }
  }, [isOpen, products]);

  if (!isOpen) return null;

  const updateRow = (key, field, value) =>
    setRows((prev) => prev.map((r) => (r.key === key ? { ...r, [field]: value } : r)));

  const handleConfirm = () => {
    onConfirm(
      rows.map((r) => ({
        key: r.key,
        newPrixVente1: r.newPv1 !== "" && !isNaN(parseFloat(r.newPv1)) ? parseFloat(r.newPv1) : null,
        newPrixVente2: r.newPv2 !== "" && !isNaN(parseFloat(r.newPv2)) ? parseFloat(r.newPv2) : null,
        newPrixVente3: r.newPv3 !== "" && !isNaN(parseFloat(r.newPv3)) ? parseFloat(r.newPv3) : null,
      }))
    );
  };

  const pvInput = (key, field, value) => (
    <input
      type="number"
      min={0}
      step={1}
      value={value}
      onChange={(e) => updateRow(key, field, e.target.value)}
      className="w-24 px-2 py-1.5 border rounded-lg text-center text-sm font-bold outline-none focus:ring-2 focus:ring-[#B12B89] transition dark:text-slate-100 bg-white dark:bg-[#222222] border-slate-200 dark:border-[#2e2e2e]"
    />
  );

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center modal-backdrop p-4"
      onClick={onCancel}
    >
      <div
        className="bg-white dark:bg-[#1c1c1c] rounded-2xl shadow-2xl w-full max-w-5xl border border-slate-200 dark:border-[#2e2e2e] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-[#2e2e2e]">
          <div>
            <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100">{t("pv_bulk.title")}</h3>
            <p className="text-[10px] text-slate-400 mt-0.5">{t("pv_bulk.description")}</p>
          </div>
          <button
            onClick={onCancel}
            className="p-1.5 hover:bg-slate-100 dark:hover:bg-[#222222] rounded-lg transition"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>

        {/* Table */}
        <div className="overflow-auto max-h-[60vh]">
          <table className="w-full">
            <thead className="sticky top-0 bg-slate-50 dark:bg-[#222222] border-b border-slate-200 dark:border-[#2e2e2e] text-[10px] uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">{t("article")}</th>
                <th className="px-3 py-3 text-center font-semibold" colSpan={2}>{t("pv_bulk.pv1")}</th>
                <th className="px-3 py-3 text-center font-semibold border-l border-slate-200 dark:border-[#2e2e2e]" colSpan={2}>{t("pv_bulk.pv2")}</th>
                <th className="px-3 py-3 text-center font-semibold border-l border-slate-200 dark:border-[#2e2e2e]" colSpan={2}>{t("pv_bulk.pv3")}</th>
              </tr>
              <tr className="text-[9px] text-slate-400">
                <th className="px-4 pb-2" />
                <th className="px-3 pb-2 text-center font-medium">{t("pv_bulk.current")}</th>
                <th className="px-3 pb-2 text-center font-medium text-blue-500">{t("pv_bulk.new")}</th>
                <th className="px-3 pb-2 text-center font-medium border-l border-slate-100 dark:border-[#2e2e2e]">{t("pv_bulk.current")}</th>
                <th className="px-3 pb-2 text-center font-medium text-blue-500">{t("pv_bulk.new")}</th>
                <th className="px-3 pb-2 text-center font-medium border-l border-slate-100 dark:border-[#2e2e2e]">{t("pv_bulk.current")}</th>
                <th className="px-3 pb-2 text-center font-medium text-blue-500">{t("pv_bulk.new")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-[#2e2e2e]">
              {rows.map((row) => (
                <tr key={row.key} className="hover:bg-slate-50 dark:hover:bg-[#222222]/40 transition-colors">
                  <td className="px-4 py-3 min-w-[160px]">
                    <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[150px]">{row.name}</p>
                    <p className="text-[10px] font-mono text-slate-400 mt-0.5">
                      {fmt(row.oldPA)} → <span className="text-blue-500 font-bold">{fmt(row.newPA)}</span> MAD
                    </p>
                  </td>
                  <td className="px-3 py-3 text-center">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{fmt(row.pv1)}</span>
                  </td>
                  <td className="px-3 py-3 text-center">{pvInput(row.key, "newPv1", row.newPv1)}</td>
                  <td className="px-3 py-3 text-center border-l border-slate-100 dark:border-[#2e2e2e]">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{fmt(row.pv2)}</span>
                  </td>
                  <td className="px-3 py-3 text-center">{pvInput(row.key, "newPv2", row.newPv2)}</td>
                  <td className="px-3 py-3 text-center border-l border-slate-100 dark:border-[#2e2e2e]">
                    <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{fmt(row.pv3)}</span>
                  </td>
                  <td className="px-3 py-3 text-center">{pvInput(row.key, "newPv3", row.newPv3)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-[#2e2e2e] flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-[#2e2e2e] text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#222222] transition"
          >
            {t("pv_bulk.cancel")}
          </button>
          <button
            onClick={handleConfirm}
            className="px-5 py-2.5 rounded-xl bg-[#B12B89] hover:bg-[#B05596] text-white text-sm font-bold transition shadow-lg shadow-[#B12B89]/30 dark:shadow-none"
          >
            {t("pv_bulk.confirm")}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─────── AdvancesSelector ─────── */
const AdvancesSelector = ({ advances, selectedIds, onChange, t }) => {
  const totalSelected = advances
    .filter((a) => selectedIds.includes(a.id))
    .reduce((sum, a) => sum + parseFloat(a.montantRegle ?? 0), 0);

  const options = advances.map((adv) => ({
    value: adv.id,
    label: `${fmt(adv.montantRegle)} MAD`,
    subLabel: `${adv.modeReglement} · ${adv.date}`,
  }));

  const renderValue = (selected) => {
    if (!Array.isArray(selected) || selected.length === 0) {
      return <span style={{ opacity: 0.5 }}>{t("select_advances", "Sélectionner des avances…")}</span>;
    }
    return (
      <span className="font-semibold text-[#B12B89] dark:text-blue-400">
        {selected.length} avance(s) · {fmt(totalSelected)} MAD
      </span>
    );
  };

  return (
    <SelectDropDown
      label={t("advances_label", "Avances fournisseur")}
      placeholder={t("select_advances", "Sélectionner des avances…")}
      multiple
      value={selectedIds}
      options={options}
      renderValue={renderValue}
      onChange={(e) => {
        const val = e.target.value;
        onChange(typeof val === "string" ? val.split(",").map(Number) : val);
      }}
    />
  );
};

const BR_DRAFT_KEY = "br_create_draft_state";

/* ─────── BonReceptionForm ─────── */
export const BonReceptionForm = () => {
  const { t } = useTranslation("bonReception");
  const { t: tCommon } = useTranslation("common");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const createMutation = useCreateBonReception();

  const [documentDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [dateReception, setDateReception] = useState(dayjs());
  const [selectedDepot, setSelectedDepot] = useState(null);
  const [selectedFrs, setSelectedFrs] = useState(null);
  const [documentReference, setDocumentReference] = useState("");
  const [status, setStatus] = useState("COMPLETED");
  const [note, setNote] = useState("");
  const [selectedAdvanceIds, setSelectedAdvanceIds] = useState([]);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [isProductsModalOpen, setIsProductsModalOpen] = useState(false);
  const [pvConfirmOpen, setPvConfirmOpen] = useState(false);
  const [pvBulkOpen, setPvBulkOpen] = useState(false);
  const [changedPAProducts, setChangedPAProducts] = useState([]);

  const { data: depotsData, isLoading: depotsLoading } = useDepots({ pageSize: 10000 });
  const societeId = selectedDepot?.societe?.id ?? selectedDepot?.societeId ?? null;
  const { data: nextNumberData } = useNextBRNumber(societeId);
  const { data: advancesData } = useFrsAdvances({ fournisseurId: selectedFrs?.id, societeId });

  const depots = depotsData?.data ?? [];
  const nextNumber = nextNumberData?.data?.nextNumber ?? nextNumberData?.nextNumber ?? "—";
  const advances = advancesData?.data?.advances ?? [];
  const isDepotLocked = selectedProducts.length > 0;

  /* Draft restore */
  useEffect(() => {
    const saved = sessionStorage.getItem(BR_DRAFT_KEY);
    if (!saved) return;
    try {
      const draft = JSON.parse(saved);
      setDateReception(draft.dateReception ? dayjs(draft.dateReception) : dayjs());
      setSelectedDepot(draft.selectedDepot);
      setSelectedFrs(draft.selectedFrs);
      setDocumentReference(draft.documentReference || "");
      setStatus(draft.status || "DRAFT");
      setNote(draft.note || "");
      setSelectedProducts(draft.selectedProducts || []);
      setSelectedAdvanceIds(draft.selectedAdvanceIds ?? []);
      sessionStorage.removeItem(BR_DRAFT_KEY);
      queryClient.invalidateQueries({ queryKey: ["br-fournisseurs"] });
      toast.info(t("draft_restored"));
    } catch {
      sessionStorage.removeItem(BR_DRAFT_KEY);
    }
  }, []);

  const handleSaveAndNavigateToArticle = () => {
    const draft = { dateReception: dateReception?.format("YYYY-MM-DDTHH:mm:ss"), selectedDepot, selectedFrs, documentReference, status, note, selectedProducts, selectedAdvanceIds };
    sessionStorage.setItem(BR_DRAFT_KEY, JSON.stringify(draft));
    setIsProductsModalOpen(false);
    navigate(`/articles/create?returnTo=${encodeURIComponent("/bon-receptions/create")}`);
  };

  const handleSaveAndNavigateToFournisseur = () => {
    const draft = { dateReception: dateReception?.format("YYYY-MM-DDTHH:mm:ss"), selectedDepot, selectedFrs, documentReference, status, note, selectedProducts, selectedAdvanceIds };
    sessionStorage.setItem(BR_DRAFT_KEY, JSON.stringify(draft));
    navigate(`/fournisseurs/create?returnTo=${encodeURIComponent("/bon-receptions/create")}`);
  };

  /* Product edits */
  const handleActivate = (product) => {
    setSelectedProducts((prev) =>
      prev.map((p) =>
        productKey(p) === productKey(product) && !p.isTouched ? { ...p, isTouched: true } : p
      )
    );
  };

  const handleCommit = (product, field, value) => {
    let v = parseFloat(value);
    if (isNaN(v)) v = 0;
    if (field === "quantity") v = Math.max(1, Math.floor(v));

    if (field === "remise") {
      v = Math.min(100, Math.max(0, v));
      const catalogPA = product.prixAchat ?? 0;
      const newPA = catalogPA * (1 - v / 100);
      setSelectedProducts((prev) =>
        prev.map((p) =>
          productKey(p) === productKey(product)
            ? { ...p, remise: v, newPrixAchat: newPA, isTouched: true }
            : p
        )
      );
      return;
    }

    setSelectedProducts((prev) =>
      prev.map((p) =>
        productKey(p) === productKey(product)
          ? { ...p, [field]: v, isTouched: true }
          : p
      )
    );
  };

  /* Prix achat manual edit → apply immediately, open PV modal if changed */
  const handlePrixAchatManual = (product, v) => {
    handleActivate(product);
    setSelectedProducts((prev) =>
      prev.map((p) =>
        productKey(p) === productKey(product)
          ? { ...p, newPrixAchat: v, isTouched: true }
          : p
      )
    );
  };

  const buildPayload = (pvUpdatesMap = {}) => ({
    depotId: selectedDepot.id,
    frsId: selectedFrs.id,
    documentReference: documentReference.trim(),
    dateReception: dateReception?.isValid() ? dateReception.format("YYYY-MM-DDTHH:mm:ss") : undefined,
    status,
    note: note.trim() || undefined,
    ...(selectedAdvanceIds.length > 0 ? { advanceIds: selectedAdvanceIds } : {}),
    lines: touchedProducts.map((p) => {
      const line = {
        quantity: p.quantity,
        remise: (p.remise ?? 0) / 100,
        newPrixAchat: p.newPrixAchat ?? p.prixAchat ?? 0,
      };
      if (p.type === "variant") line.variantId = p.variantId ?? p.id;
      else line.articleId = p.articleId ?? p.id;
      const pv = pvUpdatesMap[productKey(p)];
      if (pv) {
        if (pv.newPrixVente1 !== null) line.newPrixVente1 = pv.newPrixVente1;
        if (pv.newPrixVente2 !== null) line.newPrixVente2 = pv.newPrixVente2;
        if (pv.newPrixVente3 !== null) line.newPrixVente3 = pv.newPrixVente3;
      }
      return line;
    }),
  });

  const submitWithPV = (pvUpdatesMap) => {
    createMutation.mutate(buildPayload(pvUpdatesMap), {
      onSuccess: (res) => {
        toast.success(res?.message || t("toast.create_success"));
        navigate("/bon-receptions");
      },
      onError: (err) => {
        toast.error(err?.response?.data?.message || t("toast.create_error"));
      },
    });
  };

  const handlePVConfirmNo = () => {
    setPvConfirmOpen(false);
    submitWithPV({});
  };

  const handlePVConfirmYes = () => {
    setPvConfirmOpen(false);
    setPvBulkOpen(true);
  };

  const handlePVBulkConfirm = (pvUpdates) => {
    setPvBulkOpen(false);
    const map = {};
    pvUpdates.forEach((u) => { map[u.key] = u; });
    submitWithPV(map);
  };

  const handlePVBulkCancel = () => {
    setPvBulkOpen(false);
    setChangedPAProducts([]);
  };

  const handleRemoveProduct = (product) => {
    setSelectedProducts((prev) => prev.filter((p) => productKey(p) !== productKey(product)));
  };

  const handleProductsConfirm = (pendingProducts) => {
    setSelectedProducts((prev) => {
      const existingKeys = new Set(prev.map(productKey));
      return [...prev, ...pendingProducts.filter((p) => !existingKeys.has(productKey(p)))];
    });
    setIsProductsModalOpen(false);
  };

  /* Totals — only touched rows, remise already baked into newPrixAchat */
  const touchedProducts = selectedProducts.filter((p) => p.isTouched);
  const calcMontantTTC = (p) => {
    const cost = p.newPrixAchat ?? p.prixAchat ?? 0;
    return cost * (p.quantity ?? 1);
  };
  const totalTTC = touchedProducts.reduce((sum, p) => sum + calcMontantTTC(p), 0);
  const hasTouched = touchedProducts.length > 0;

  /* Submit */
  const handleSubmit = () => {
    if (!selectedDepot) { toast.error(t("toast.depot_required")); return; }
    if (!selectedFrs) { toast.error(t("toast.supplier_required")); return; }
    if (!documentReference.trim()) { toast.error(t("toast.reference_required")); return; }
    if (selectedProducts.length === 0) { toast.error(t("toast.select_at_least_one_article")); return; }
    if (!hasTouched) { toast.error(t("toast.enter_quantity_for_article")); return; }

    const changed = touchedProducts.filter(
      (p) => Math.abs((p.newPrixAchat ?? p.prixAchat ?? 0) - (p.prixAchat ?? 0)) > 0.001
    );

    if (changed.length === 0) {
      submitWithPV({});
    } else {
      setChangedPAProducts(changed);
      setPvConfirmOpen(true);
    }
  };

  const canSubmit =
    selectedDepot &&
    selectedFrs &&
    documentReference.trim() &&
    selectedProducts.length > 0 &&
    hasTouched &&
    !createMutation.isPending;

  return (
    <div className="-m-4 lg:-m-6 px-3 pt-3">
      <FormPageHeader
        entityName="bon-reception"
        backPath="/bon-receptions"
        isEdit={false}
        createTitle={t("create_title")}
        backLabel={t("back_label")}
      />

      <FormShell wide>

        <FormCard
          title={t("informations")}
          description={t("informations_description")}
          action={societeId && nextNumber && nextNumber !== "—" ? (
            <NextNumberBadge label={t("reference_br")} value={nextNumber} />
          ) : null}
        >
          <div className="space-y-5">
            <FormGroup title={tCommon("form_group_parties")}>
              <FormFieldGrid cols={3}>
                <div>
                  <label className={FORM_LABEL}>{t("depot_required")} <span className="text-red-500">*</span></label>
                  {isDepotLocked ? (
                    <>
                      <div className="relative">
                        <input
                          readOnly
                          value={`${selectedDepot?.name} — ${selectedDepot?.societe?.raisonSocial ?? ""}`}
                          className={`${FORM_CONTROL_DISABLED} pr-10`}
                        />
                        <Lock className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                      </div>
                      <p className="text-xs text-amber-500 mt-1.5">{t("remove_articles_to_change_depot")}</p>
                    </>
                  ) : (
                    <SelectDropDown
                      placeholder={t("select_depot")}
                      value={selectedDepot?.id || ""}
                      options={depots.map((d) => ({ value: d.id, label: d.name, subLabel: d.societe?.raisonSocial }))}
                      isLoading={depotsLoading}
                      onChange={(e) => {
                        const depot = depots.find((d) => d.id === parseInt(e.target.value));
                        setSelectedDepot(depot || null);
                        setSelectedFrs(null);
                        setSelectedAdvanceIds([]);
                      }}
                    />
                  )}
                </div>

                <div>
                  <label className={FORM_LABEL}>{t("supplier_required")} <span className="text-red-500">*</span></label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      {!selectedDepot ? (
                        <div className={FORM_CONTROL_DASHED}>
                          {t("select_depot_first")}
                        </div>
                      ) : (
                        <SearchableFrsSelect
                          societeId={societeId}
                          value={selectedFrs}
                          onChange={(frs) => { setSelectedFrs(frs); setSelectedAdvanceIds([]); }}
                          placeholder={t("select_supplier")}
                        />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveAndNavigateToFournisseur}
                      title={t("create_supplier", "Créer fournisseur")}
                      className={FORM_ICON_BTN}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </FormFieldGrid>
            </FormGroup>

            <FormGroup title={tCommon("form_group_dates_status")}>
              <FormFieldGrid cols={4}>
                <div>
                  <label className={FORM_LABEL}>{t("document_reference_required")} <span className="text-red-500">*</span></label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={documentReference}
                      onChange={(e) => setDocumentReference(e.target.value)}
                      placeholder={t("document_reference_placeholder")}
                      className={`flex-1 min-w-0 ${FORM_CONTROL}`}
                    />
                    <button
                      type="button"
                      onClick={() => setDocumentReference(generateRef())}
                      title={t("generate_ref")}
                      className={FORM_ICON_BTN_MUTED}
                    >
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                <div>
                  <label className={FORM_LABEL}>{t("reception_date_label")}</label>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DateTimePicker
                      value={dateReception}
                      onChange={(val) => setDateReception(val)}
                      format="DD/MM/YYYY HH:mm"
                      slotProps={{
                        textField: {
                          size: "small",
                          variant: "outlined",
                          fullWidth: true,
                          sx: DATE_PICKER_SX,
                        },
                      }}
                    />
                  </LocalizationProvider>
                </div>
                <SelectDropDown
                  label={t("status_label")}
                  value={status}
                  options={[
                    { value: "DRAFT", label: t("draft") },
                    { value: "COMPLETED", label: t("completed") },
                  ]}
                  onChange={(e) => setStatus(e.target.value)}
                />
                <Input
                  label={t("note")}
                  type="text"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder={t("note_placeholder")}
                />
              </FormFieldGrid>
            </FormGroup>

            <FormActions
              submitType="button"
              onSubmit={handleSubmit}
              submitLabel={t("create_reception_note")}
              isLoading={createMutation.isPending}
              disabled={!canSubmit}
              extra={selectedProducts.length > 0 && !hasTouched ? (
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mr-auto">
                  {t("click_field_to_activate")}
                </p>
              ) : null}
            />
          </div>
        </FormCard>

        {selectedFrs && societeId && advances.length > 0 && (
          <FormCard
            title={t("advances_section_title", "Avances fournisseur")}
            description={t("advances_section_desc", "Appliquez une ou plusieurs avances existantes pour réduire le montant dû sur ce bon.")}
          >
            <AdvancesSelector
              advances={advances}
              selectedIds={selectedAdvanceIds}
              onChange={setSelectedAdvanceIds}
              t={t}
            />
            {selectedAdvanceIds.length > 0 && (
              <div className="mt-4 flex items-center justify-between px-4 py-3 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-lg">
                <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                  {t("advances_total_applied", "Total avances à appliquer")}
                </span>
                <span className="text-sm font-semibold text-emerald-700 dark:text-emerald-300 font-mono">
                  {fmt(advances.filter((a) => selectedAdvanceIds.includes(a.id)).reduce((s, a) => s + parseFloat(a.montantRegle ?? 0), 0))} MAD
                </span>
              </div>
            )}
          </FormCard>
        )}

        <div className="overflow-x-auto">
          <div className="px-6 py-5 border-b border-slate-100 dark:border-[#2e2e2e] flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">{t("articles_section")}</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {selectedProducts.length} {t("articles_added")}
              </p>
            </div>
            <button
              onClick={() => {
                if (!selectedDepot) { toast.error(t("toast.depot_required")); return; }
                setIsProductsModalOpen(true);
              }}
              className="flex items-center gap-2 h-10 px-4 bg-[#B12B89] hover:bg-[#9A2478] text-white rounded-md transition-colors font-medium text-sm whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> {t("add_articles")}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-[#2e2e2e] bg-slate-50/80 dark:bg-[#222222]/50">
                  <th className="px-6 py-3.5 text-left font-semibold">{t("article")}</th>
                  <th className="px-5 py-3.5 text-left font-semibold hidden md:table-cell">{t("type")}</th>
                  <th className="px-5 py-3.5 text-center font-semibold">{t("new_purchase_price")}</th>
                  <th className="px-5 py-3.5 text-center font-semibold">{t("discount_percent")}</th>
                  <th className="px-5 py-3.5 text-center font-semibold">{t("quantity")}</th>
                  <th className="px-5 py-3.5 text-center font-semibold">{t("amount_ttc")}</th>
                  <th className="px-6 py-3.5 text-right font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-[#2e2e2e]">
                {selectedProducts.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center opacity-40">
                        <Package className="w-10 h-10 mb-3 text-slate-400" />
                        <p className="text-sm font-semibold text-slate-500">{t("no_articles_selected")}</p>
                        <p className="text-xs text-slate-400 mt-1">{t("click_add_articles")}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  selectedProducts.map((product) => {
                    const isTouched = product.isTouched;
                    const montant = isTouched ? calcMontantTTC(product) : null;
                    const effectivePrixAchat = product.newPrixAchat ?? product.prixAchat ?? 0;
                    return (
                      <tr
                        key={productKey(product)}
                        className="group transition-colors hover:bg-blue-50/30 dark:hover:bg-blue-900/10"
                      >
                        {/* Article */}
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#222222]">
                              <Package className="w-4 h-4 text-slate-500" />
                            </div>
                            <div>
                              <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[160px] block">
                                {product.name}
                              </span>
                              <span className="text-[10px] font-mono text-slate-400">{product.barcode}</span>
                            </div>
                          </div>
                        </td>

                        {/* Type */}
                        <td className="px-5 py-4 hidden md:table-cell">
                          <span className={`text-[9px] font-bold uppercase px-2 py-1 rounded ${product.type === "variant" ? "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400" : "bg-blue-50 dark:bg-blue-900/20 text-[#B12B89] dark:text-blue-400"}`}>
                            {product.type === "variant" ? t("variant") : t("article_type")}
                          </span>
                        </td>

                        {/* Prix achat (editable — opens PV modal if value differs from catalog) */}
                        <td className="px-5 py-4 text-center">
                          <EditableCell
                            value={effectivePrixAchat}
                            min={0}
                            step={1}
                            width="w-28"
                            onActivate={() => handleActivate(product)}
                            onCommit={(v) => handlePrixAchatManual(product, v)}
                          />
                        </td>

                        {/* Remise % */}
                        <td className="px-5 py-4 text-center">
                          <EditableCell
                            value={product.remise ?? 0}
                            min={0}
                            max={100}
                            step={1}
                            width="w-20"
                            onActivate={() => handleActivate(product)}
                            onCommit={(v) => handleCommit(product, "remise", v)}
                          />
                        </td>

                        {/* Quantity */}
                        <td className="px-5 py-4 text-center">
                          <EditableCell
                            value={product.quantity}
                            min={1}
                            step={1}
                            width="w-20"
                            onActivate={() => handleActivate(product)}
                            onCommit={(v) => handleCommit(product, "quantity", v)}
                          />
                        </td>

                        {/* Montant */}
                        <td className="px-5 py-4 text-center">
                          {isTouched ? (
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                              {fmt(montant)} MAD
                            </span>
                          ) : (
                            <span className="text-sm text-slate-300 dark:text-slate-600 font-medium">—</span>
                          )}
                        </td>

                        {/* Delete */}
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => handleRemoveProduct(product)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>

              {hasTouched && (
                <tfoot>
                  <tr className="border-t-2 border-slate-200 dark:border-[#2e2e2e] bg-slate-50/80 dark:bg-[#222222]/40">
                    <td colSpan="5" className="px-6 py-4 text-right text-xs font-bold uppercase text-slate-500 tracking-wider">
                      {t("total_ttc")}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                        {fmt(totalTTC)} MAD
                      </span>
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </FormShell>

      <SelectBRProductsModal
        isOpen={isProductsModalOpen}
        onClose={() => setIsProductsModalOpen(false)}
        onConfirm={handleProductsConfirm}
        onCreateArticle={handleSaveAndNavigateToArticle}
        alreadyProducts={selectedProducts}
        depotId={selectedDepot?.id}
        t={t}
      />

      <PVConfirmModal
        isOpen={pvConfirmOpen}
        onNo={handlePVConfirmNo}
        onYes={handlePVConfirmYes}
        t={t}
      />
      <PVBulkUpdateModal
        isOpen={pvBulkOpen}
        products={changedPAProducts}
        onConfirm={handlePVBulkConfirm}
        onCancel={handlePVBulkCancel}
        t={t}
      />
    </div>
  );
};
