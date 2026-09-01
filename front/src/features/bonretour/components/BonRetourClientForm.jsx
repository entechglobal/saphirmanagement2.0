import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/shared/utils/toast";
import {
  Package,
  Box,
  Plus,
  Trash2,
  Lock,
  RotateCcw,
  AlertCircle,
} from "lucide-react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";

/* ---------- Hooks ---------- */
import {
  useCreateBonRetourClient,
  useNextBRCNumber,
  useBRClients,
  useBonLivraisonsByClient,
  useDepots,
} from "../hooks/useBonRetourClients";
import { SelectBRItemsModal } from "./SelectBRItemsModal";
import { PRICE_FIELD_OPTIONS } from "../../../shared/components/PriceFieldDropDown";
import { FormPageHeader } from "../../../shared/components/FormPageHeader";
import { Input } from "../../../shared/components/Input";
import { SelectDropDown } from "../../../shared/components/SelectDropDown";
import { SearchableClientSelect } from "../../../shared/components/SearchableClientSelect";
import { FormDatePicker } from "../../../shared/FormDatePicker";
import { FormCard, FormFieldGrid, FormGroup, FormShell, NextNumberBadge } from "../../../shared/components/FormCard";
import { FormActions } from "../../../shared/components/FormActions";
import { FORM_CONTROL_DISABLED, FORM_CONTROL_DASHED, FORM_ICON_BTN, FORM_LABEL, DATE_PICKER_SX } from "../../../shared/components/formStyles";

/* ─── helpers ─── */
const computeMaxDiscount = (unitPrice, prixAchat, familyRemise) => {
  if (!unitPrice || unitPrice <= 0) return 0;
  const cost = prixAchat ?? 0;
  const remiseCeiling = familyRemise ?? 0;
  if (remiseCeiling <= 0) return 0;
  const marginMax = cost > 0 ? ((unitPrice - cost) / unitPrice) * 100 : remiseCeiling;
  return Math.max(0, Math.floor(Math.min(remiseCeiling, marginMax) * 100) / 100);
};

const buildPending = (p, priceField) => ({
  ...p,
  quantity: 1,
  unitPrice: p.unitPrice ?? 0,
  minUnitPrice: p.prixAchat ?? 0,
  discount: p.articleRemise ?? 0,
  maxDiscount: computeMaxDiscount(p.unitPrice ?? 0, p.prixAchat ?? 0, p.familyRemise ?? 0),
  familyRemise: p.familyRemise ?? 0,
  description: p.name,
  isTouched: false,
  priceField,
});

const productKey = (p) => `${p.type}-${p.id}`;

/* ─────── EditableCell ─────── */
const EditableCell = ({ value, onActivate, onCommit, min = 0, max, step = 1, width = "w-20", className = "" }) => {
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
      type="number"
      min={min}
      max={max}
      step={step}
      value={editing ? raw : value}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onChange={handleChange}
      className={`${width} px-2 py-1.5 border rounded-lg text-center text-sm font-bold outline-none focus:ring-2 focus:ring-blue-400 transition-all dark:text-slate-100 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 ${className}`}
    />
  );
};

/* ─────── BonRetourClientForm ─────── */
export const BonRetourClientForm = () => {
  const { t } = useTranslation("bonRetourClient");
  const { t: tCommon } = useTranslation("common");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const createMutation = useCreateBonRetourClient();

  const [documentDate, setDocumentDate] = useState(dayjs());
  const [dateRetour, setDateRetour] = useState(dayjs().add(1, "day").format("YYYY-MM-DD"));
  const [selectedDepot, setSelectedDepot] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedBonLivraison, setSelectedBonLivraison] = useState(null);
  const [status, setStatus] = useState("COMPLETED");
  const [motifRetour, setMotifRetour] = useState("");
  const [defaultPriceField, setDefaultPriceField] = useState("prixVente1");
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [isItemsModalOpen, setIsItemsModalOpen] = useState(false);
  const [selectedPacks, setSelectedPacks] = useState([]);

  const { data: depotsData, isLoading: depotsLoading } = useDepots({ pageSize: 10000 });
  const societeId = selectedDepot?.societe?.id ?? selectedDepot?.societeId ?? null;
  const { data: nextNumberData } = useNextBRCNumber(societeId);
  const { data: bonLivraisonsData, isLoading: blLoading } = useBonLivraisonsByClient(selectedClient?.id);
  
  const depots = depotsData?.data ?? [];
  const nextNumber = nextNumberData?.data?.nextNumber ?? nextNumberData?.nextNumber ?? "—";
  const bonLivraisons = bonLivraisonsData?.data ?? [];
  const isDepotLocked = selectedProducts.length > 0 || selectedPacks.length > 0;

  const BRC_CREATE_DRAFT_KEY = "brc_create_draft_state";

  const handleSaveAndNavigateToClient = () => {
    const draft = { documentDate: documentDate?.format("YYYY-MM-DDTHH:mm:ss"), dateRetour, selectedDepot, selectedClient, selectedBonLivraison, status, motifRetour, defaultPriceField, selectedProducts, selectedPacks };
    sessionStorage.setItem(BRC_CREATE_DRAFT_KEY, JSON.stringify(draft));
    navigate(`/clients/create?returnTo=${encodeURIComponent("/bon-retour-clients/create")}`);
  };

  const handleSaveAndNavigateToArticle = () => {
    const draft = {
      documentDate: documentDate?.format("YYYY-MM-DDTHH:mm:ss"),
      dateRetour,
      selectedDepot,
      selectedClient,
      selectedBonLivraison,
      status,
      motifRetour,
      defaultPriceField,
      selectedProducts,
      selectedPacks,
    };
    sessionStorage.setItem(BRC_CREATE_DRAFT_KEY, JSON.stringify(draft));
    setIsItemsModalOpen(false);
    navigate(`/articles/create?returnTo=${encodeURIComponent("/bon-retour-clients/create")}`);
  };

  useEffect(() => {
    const saved = sessionStorage.getItem(BRC_CREATE_DRAFT_KEY);
    if (!saved) return;
    try {
      const draft = JSON.parse(saved);
      setDocumentDate(draft.documentDate ? dayjs(draft.documentDate) : dayjs());
      setDateRetour(draft.dateRetour);
      setSelectedDepot(draft.selectedDepot);
      setSelectedClient(draft.selectedClient);
      setSelectedBonLivraison(draft.selectedBonLivraison);
      setStatus(draft.status);
      setMotifRetour(draft.motifRetour);
      setDefaultPriceField(draft.defaultPriceField || "prixVente1");
      setSelectedProducts(draft.selectedProducts ?? []);
      setSelectedPacks(draft.selectedPacks ?? []);
      sessionStorage.removeItem(BRC_CREATE_DRAFT_KEY);
      queryClient.invalidateQueries({ queryKey: ["br-clients"] });
      toast.info(t("draft_restored"));
    } catch {
      sessionStorage.removeItem(BRC_CREATE_DRAFT_KEY);
    }
  }, []);

  const fmt = (n) =>
    Number(n ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const calcMontant = (p) => {
    const base = p.unitPrice * p.quantity;
    return base - base * ((p.discount ?? 0) / 100);
  };

  const handleActivate = (product) => {
    setSelectedProducts((prev) =>
      prev.map((p) =>
        productKey(p) === productKey(product) && !p.isTouched ? { ...p, isTouched: true } : p
      )
    );
  };

  const handleCommit = (product, field, value) => {
    setSelectedProducts((prev) =>
      prev.map((p) => {
        if (productKey(p) !== productKey(product)) return p;
        let v = parseFloat(value);
        if (isNaN(v)) v = 0;

        if (field === "quantity") {
          v = Math.max(1, Math.floor(v));
          return { ...p, quantity: v, isTouched: true };
        }
        if (field === "unitPrice") {
          const newMax = computeMaxDiscount(v, p.minUnitPrice ?? 0, p.familyRemise ?? 0);
          return { ...p, unitPrice: v, maxDiscount: newMax, isTouched: true };
        }
        return { ...p, [field]: v, isTouched: true };
      })
    );
  };

  const handleRemoveProduct = (product) => {
    setSelectedProducts((prev) => prev.filter((p) => productKey(p) !== productKey(product)));
  };

  const handleRemovePack = (packId) => {
    setSelectedPacks((prev) => prev.filter((p) => p.packId !== packId));
  };

  const handleActivatePack = (packId) => {
    setSelectedPacks((prev) =>
      prev.map((p) => p.packId === packId && !p.isTouched ? { ...p, isTouched: true } : p)
    );
  };

  const handleCommitPack = (packId, field, value) => {
    setSelectedPacks((prev) =>
      prev.map((p) => {
        if (p.packId !== packId) return p;
        let v = parseFloat(value);
        if (isNaN(v)) v = 0;
        if (field === "quantity") v = Math.max(1, Math.floor(v));
        return { ...p, [field]: v, isTouched: true };
      })
    );
  };

  const handleItemsConfirm = (pendingProducts, pendingPacks, confirmedPriceField) => {
    if (confirmedPriceField && confirmedPriceField !== defaultPriceField) {
      setDefaultPriceField(confirmedPriceField);
    }
    if (pendingProducts.length > 0) {
      setSelectedProducts((prev) => {
        const existingKeys = new Set(prev.map(productKey));
        return [...prev, ...pendingProducts.filter((p) => !existingKeys.has(productKey(p)))];
      });
    }
    if (pendingPacks.length > 0) {
      setSelectedPacks((prev) => {
        const existingIds = new Set(prev.map((p) => p.packId));
        return [...prev, ...pendingPacks.filter((p) => !existingIds.has(p.packId))];
      });
    }
    setIsItemsModalOpen(false);
  };

  const touchedProducts = selectedProducts.filter((p) => p.isTouched);
  const touchedPacks = selectedPacks.filter((p) => p.isTouched);
  const totalHT = touchedProducts.reduce((sum, p) => sum + calcMontant(p), 0);
  const totalPacksHT = touchedPacks.reduce((sum, p) => sum + p.prixVente * p.quantity, 0);
  const totalLines = selectedProducts.length;
  const hasTouched = touchedProducts.length > 0;
  const hasTouchedPack = touchedPacks.length > 0;

  const handleSubmit = async () => {
    if (!selectedDepot) { toast.error(t("toast.depot_required")); return; }
    if (!selectedClient) { toast.error(t("toast.client_required")); return; }
    if (selectedProducts.length === 0 && selectedPacks.length === 0) { toast.error(t("toast.select_at_least_one_article")); return; }
    if (selectedProducts.length > 0 && !hasTouched) { toast.error(t("toast.enter_quantity_for_article")); return; }
    if (selectedPacks.length > 0 && !hasTouchedPack) { toast.error(t("toast.enter_quantity_for_article")); return; }

    const lines = touchedProducts.map((p) => {
      const line = {
        quantity: p.quantity,
        unitPrice: p.unitPrice,
        remise: (p.discount ?? 0) / 100,
        priceField: p.priceField,
      };
      if (p.type === "variant") line.variantId = p.variantId ?? p.id;
      else line.articleId = p.articleId ?? p.id;
      return line;
    });

    const payload = {
      clientId: selectedClient.id,
      depotId: selectedDepot.id,
      bonLivraisonId: selectedBonLivraison?.id || undefined,
      documentDate: documentDate?.isValid() ? documentDate.format("YYYY-MM-DDTHH:mm:ss") : undefined,
      dateRetour,
      status,
      motifRetour: motifRetour.trim() || undefined,
    };

    if (lines.length > 0) payload.lines = lines;

    if (touchedPacks.length > 0) {
      payload.packLines = touchedPacks.map((p) => ({
        packId: p.packId,
        quantity: p.quantity,
        prixVente: p.prixVente,
      }));
    }

    createMutation.mutate(
      payload,
      {
        onSuccess: (res) => {
          toast.success(res?.message || t("toast.create_success"));
          navigate("/bon-retour-clients");
        },
        onError: (err) => {
          toast.error(err?.response?.data?.message || t("toast.create_error"));
        },
      }
    );
  };

  const hasAnyItem = selectedProducts.length > 0 || selectedPacks.length > 0;
  const canSubmit =
    selectedDepot && selectedClient && hasAnyItem && (selectedProducts.length === 0 || hasTouched) && (selectedPacks.length === 0 || hasTouchedPack) && !createMutation.isPending;

  return (
    <div className="-m-4 lg:-m-6 px-3 pt-3">
      <FormPageHeader
        entityName="bon-retour-client"
        backPath="/bon-retour-clients"
        isEdit={false}
        createTitle={t("create_title")}
        backLabel={t("back_label")}
      />

      <FormShell wide>

        <FormCard
          title={t("informations")}
          description={t("informations_description")}
          action={societeId && nextNumber && nextNumber !== "—" ? (
            <NextNumberBadge label={t("next_number")} value={nextNumber} />
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
                        setSelectedClient(null);
                        setSelectedBonLivraison(null);
                      }}
                    />
                  )}
                </div>

                <div>
                  <label className={FORM_LABEL}>{t("client_required")} <span className="text-red-500">*</span></label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      {!selectedDepot ? (
                        <div className={FORM_CONTROL_DASHED}>
                          {t("select_depot_first")}
                        </div>
                      ) : (
                        <SearchableClientSelect
                          useClientsHook={useBRClients}
                          societeId={societeId}
                          value={selectedClient}
                          onChange={(client) => {
                            setSelectedClient(client || null);
                            setSelectedBonLivraison(null);
                          }}
                          placeholder={t("select_client")}
                        />
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={handleSaveAndNavigateToClient}
                      title={t("create_client", "Créer client")}
                      className={FORM_ICON_BTN}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div>
                  {!selectedClient ? (
                    <div>
                      <label className={FORM_LABEL}>{t("linked_bl_optional")}</label>
                      <div className={FORM_CONTROL_DASHED}>
                        {t("select_client_first")}
                      </div>
                    </div>
                  ) : (
                    <SelectDropDown
                      label={t("linked_bl_optional")}
                      placeholder={t("select_bl_optional")}
                      value={selectedBonLivraison?.id || ""}
                      options={[
                        { value: "", label: t("no_linked_bl") },
                        ...bonLivraisons.map((bl) => ({
                          value: bl.id,
                          label: bl.document?.documentNumber || `BL #${bl.id}`,
                          subLabel: bl.documentDate ? dayjs(bl.documentDate).format("DD/MM/YYYY") : "",
                        })),
                      ]}
                      isLoading={blLoading}
                      onChange={(e) => {
                        if (!e.target.value) { setSelectedBonLivraison(null); return; }
                        const bl = bonLivraisons.find((b) => b.id === parseInt(e.target.value));
                        setSelectedBonLivraison(bl || null);
                      }}
                    />
                  )}
                </div>
              </FormFieldGrid>
            </FormGroup>

            <FormGroup title={tCommon("form_group_dates_status")}>
              <FormFieldGrid cols={4}>
                <div>
                  <label className={FORM_LABEL}>{t("document_date_required")} <span className="text-red-500">*</span></label>
                  <LocalizationProvider dateAdapter={AdapterDayjs}>
                    <DateTimePicker
                      value={documentDate}
                      onChange={(val) => setDocumentDate(val)}
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
                <FormDatePicker
                  label={t("return_date_label")}
                  name="dateRetour"
                  value={dateRetour}
                  onChange={(e) => setDateRetour(e.target.value)}
                />
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
                  label={t("return_reason")}
                  type="text"
                  value={motifRetour}
                  onChange={(e) => setMotifRetour(e.target.value)}
                  placeholder={t("return_reason_placeholder")}
                />
              </FormFieldGrid>
            </FormGroup>

            <FormActions
              submitType="button"
              onSubmit={handleSubmit}
              submitLabel={t("create_return_note")}
              isLoading={createMutation.isPending}
              disabled={!canSubmit}
              extra={((selectedProducts.length > 0 && !hasTouched) || (selectedPacks.length > 0 && !hasTouchedPack)) ? (
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mr-auto">
                  {t("click_field_to_activate")}
                </p>
              ) : null}
            />
          </div>
        </FormCard>

        <div className="overflow-x-auto">
          <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="font-bold text-slate-800 dark:text-slate-100">{t("articles_packs", "Articles & Packs")}</h3>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {selectedProducts.length} {t("articles_added")} · {selectedPacks.length} {t("packs_added", "pack(s)")}
              </p>
            </div>
            <button
              onClick={() => { if (!selectedDepot) { toast.error(t("toast.depot_required")); return; } setIsItemsModalOpen(true); }}
              className="flex items-center gap-2 h-10 px-4 bg-[#B12B89] hover:bg-[#9A2478] text-white rounded-md transition-colors font-medium text-sm whitespace-nowrap"
            >
              <Plus className="w-4 h-4" /> {t("add_articles_packs", "Articles & Packs")}
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
                  <th className="px-6 py-3.5 text-left font-semibold">{t("article")}</th>
                  <th className="px-5 py-3.5 text-left font-semibold hidden md:table-cell">{t("family")}</th>
                  <th className="px-5 py-3.5 text-left font-semibold hidden md:table-cell">{t("type")}</th>
                  <th className="px-5 py-3.5 text-center font-semibold hidden sm:table-cell">{t("price_grid")}</th>
                  <th className="px-5 py-3.5 text-center font-semibold hidden lg:table-cell">{t("purchase_price")}</th>
                  <th className="px-5 py-3.5 text-center font-semibold">{t("selling_price")}</th>
                  <th className="px-5 py-3.5 text-center font-semibold">{t("discount_percent")}</th>
                  <th className="px-5 py-3.5 text-center font-semibold">{t("quantity")}</th>
                  <th className="px-5 py-3.5 text-center font-semibold">{t("amount_excl_tax")}</th>
                  <th className="px-6 py-3.5 text-right font-semibold"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {selectedProducts.length === 0 && selectedPacks.length === 0 ? (
                  <tr>
                    <td colSpan="10" className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center opacity-40">
                        <RotateCcw className="w-10 h-10 mb-3 text-slate-400" />
                        <p className="text-sm font-semibold text-slate-500">{t("no_articles_selected")}</p>
                        <p className="text-xs text-slate-400 mt-1">{t("click_add_articles")}</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <>
                    {/* ── Article / Variant rows ── */}
                    {selectedProducts.map((product) => {
                      const isTouched = product.isTouched;
                      const montant = isTouched ? calcMontant(product) : null;
                      const discountOverLimit = isTouched && product.maxDiscount >= 0 && product.discount > product.maxDiscount;
                      return (
                        <tr key={productKey(product)} className="group transition-colors hover:bg-blue-50/20 dark:hover:bg-blue-900/5">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-slate-100 dark:bg-slate-800">
                                <Package className="w-4 h-4 text-slate-500" />
                              </div>
                              <div>
                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[160px] block">{product.name}</span>
                                <span className="text-[10px] font-mono text-slate-400">{product.barcode}</span>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 hidden md:table-cell">
                            <span className="text-xs text-slate-500 dark:text-slate-400">{product.family?.name || "—"}</span>
                          </td>
                          <td className="px-5 py-4 hidden md:table-cell">
                            <span className={`text-[9px] font-bold uppercase px-2 py-1 rounded ${product.type === "variant" ? "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400" : "bg-blue-50 dark:bg-blue-900/20 text-[#B12B89] dark:text-blue-400"}`}>
                              {product.type === "variant" ? t("variant") : t("article_type")}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center hidden sm:table-cell">
                            <span className="text-[9px] font-bold uppercase px-2 py-1 rounded bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400">
                              {PRICE_FIELD_OPTIONS.find((p) => p.value === product.priceField)?.label || product.priceField}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center hidden lg:table-cell">
                            <span className="text-xs text-slate-500 dark:text-slate-400 font-mono">{fmt(product.prixAchat ?? 0)}</span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            <EditableCell value={product.unitPrice} min={product.minUnitPrice ?? 0} step={0.01} width="w-28"
                              onActivate={() => handleActivate(product)} onCommit={(v) => handleCommit(product, "unitPrice", v)} />
                          </td>
                          <td className="px-5 py-4 text-center">
                            <EditableCell value={product.discount} min={0} max={product.maxDiscount > 0 ? product.maxDiscount : undefined} step={0.5} width="w-20"
                              className={discountOverLimit ? "bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300" : ""}
                              onActivate={() => handleActivate(product)} onCommit={(v) => handleCommit(product, "discount", v)} />
                          </td>
                          <td className="px-5 py-4 text-center">
                            <EditableCell value={product.quantity} min={1} step={1} width="w-20"
                              onActivate={() => handleActivate(product)} onCommit={(v) => handleCommit(product, "quantity", v)} />
                          </td>
                          <td className="px-5 py-4 text-center">
                            {isTouched ? (
                              <div>
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{fmt(montant)} MAD</span>
                                {product.discount > 0 && (
                                  <p className="text-[10px] text-emerald-500">-{fmt(product.unitPrice * product.quantity * (product.discount / 100))} {t("discount")}</p>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-slate-300 dark:text-slate-600 font-medium">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => handleRemoveProduct(product)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}

                    {/* ── Pack rows ── */}
                    {selectedPacks.map((pack) => {
                      const isTouchedPack = pack.isTouched;
                      const montant = pack.prixVente * pack.quantity;
                      return (
                        <tr key={`pack-${pack.packId}`} className="hover:bg-violet-50/30 dark:hover:bg-violet-900/10 transition-colors">
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex-shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-violet-100 dark:bg-violet-900/30">
                                <Box className="w-4 h-4 text-violet-500" />
                              </div>
                              <div>
                                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[160px] block">{pack.name}</span>
                                {pack.barcode && <span className="text-[10px] font-mono text-slate-400">{pack.barcode}</span>}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-4 hidden md:table-cell"><span className="text-xs text-slate-400">—</span></td>
                          <td className="px-5 py-4 hidden md:table-cell">
                            <span className="text-[9px] font-bold uppercase px-2 py-1 rounded bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400">
                              {t("pack", "Pack")}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center hidden sm:table-cell"><span className="text-sm text-slate-300 dark:text-slate-600">—</span></td>
                          <td className="px-5 py-4 text-center hidden lg:table-cell"><span className="text-sm text-slate-300 dark:text-slate-600">—</span></td>
                          <td className="px-5 py-4 text-center">
                            <EditableCell value={pack.prixVente} min={0} step={0.01} width="w-28"
                              onActivate={() => handleActivatePack(pack.packId)} onCommit={(v) => handleCommitPack(pack.packId, "prixVente", v)} />
                          </td>
                          <td className="px-5 py-4 text-center"><span className="text-sm text-slate-300 dark:text-slate-600">—</span></td>
                          <td className="px-5 py-4 text-center">
                            <EditableCell value={pack.quantity} min={1} step={1} width="w-20"
                              onActivate={() => handleActivatePack(pack.packId)} onCommit={(v) => handleCommitPack(pack.packId, "quantity", v)} />
                          </td>
                          <td className="px-5 py-4 text-center">
                            {isTouchedPack ? (
                              <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{fmt(montant)} MAD</span>
                            ) : (
                              <span className="text-sm text-slate-300 dark:text-slate-600 font-medium">—</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button onClick={() => handleRemovePack(pack.packId)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </>
                )}
              </tbody>

              {(hasTouched || hasTouchedPack) && (
                <tfoot>
                  <tr className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/40">
                    <td colSpan="8" className="px-6 py-4 text-right text-xs font-bold uppercase text-slate-500 tracking-wider">
                      {t("total_excl_tax")}
                    </td>
                    <td className="px-5 py-4 text-center">
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{fmt(totalHT + totalPacksHT)} MAD</span>
                    </td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      </FormShell>

      <SelectBRItemsModal
        isOpen={isItemsModalOpen}
        depotId={selectedDepot?.id}
        priceField={defaultPriceField}
        onClose={() => setIsItemsModalOpen(false)}
        onConfirm={handleItemsConfirm}
        onCreateArticle={handleSaveAndNavigateToArticle}
        alreadyProducts={selectedProducts}
        alreadyPacks={selectedPacks}
        t={t}
      />
    </div>
  );
};