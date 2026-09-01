import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/shared/utils/toast";
import {
  Package, Box, Plus, Trash2,
  Lock, RotateCcw, AlertCircle,
} from "lucide-react";
import dayjs from "dayjs";
import { useTranslation } from "react-i18next";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";

import {
  useUpdateBonRetourClient,
  useBonRetourClientById,
  useBRClients,
  useBonLivraisonsByClient,
  useDepots,
} from "../hooks/useBonRetourClients";
import { SelectBRItemsModal } from "./SelectBRItemsModal";
import { FormPageHeader } from "../../../shared/components/FormPageHeader";
import { Input } from "../../../shared/components/Input";
import { SelectDropDown } from "../../../shared/components/SelectDropDown";
import { SearchableClientSelect } from "../../../shared/components/SearchableClientSelect";
import { FormDatePicker } from "../../../shared/FormDatePicker";
import { FormCard, FormFieldGrid, FormGroup, FormShell, NextNumberBadge } from "../../../shared/components/FormCard";
import { FormActions } from "../../../shared/components/FormActions";
import { FORM_CONTROL_DISABLED, FORM_CONTROL_DASHED, FORM_ICON_BTN, FORM_LABEL, DATE_PICKER_SX } from "../../../shared/components/formStyles";
import { SectionLoader } from "../../../shared/components/loadersCollections/SectionLoader";
import { NotFound } from "../../../shared/components/NotFound";

/* ─── helpers ─── */
const computeMaxDiscount = (unitPrice, prixAchat, familyRemise) => {
  if (!unitPrice || unitPrice <= 0) return 0;
  const cost = prixAchat ?? 0;
  const remiseCeiling = familyRemise ?? 0;
  if (remiseCeiling <= 0) return 0;
  const marginMax = cost > 0 ? ((unitPrice - cost) / unitPrice) * 100 : remiseCeiling;
  return Math.max(0, Math.floor(Math.min(remiseCeiling, marginMax) * 100) / 100);
};

/* Build a line from an existing BR line (from getById response) */
const buildFromExisting = (line) => {
  const unitPrice = parseFloat(line.unitPrice ?? line.prixUnitaire ?? 0);
  const prixAchat = parseFloat(line.prixAchat ?? line.article?.prixAchat ?? 0);
  const familyRemise = parseFloat(line.familyRemise ?? line.article?.family?.remise ?? line.variant?.article?.family?.remise ?? 0);
  const discountDecimal = parseFloat(line.remise ?? line.discount ?? 0);
  // Backend stores remise as decimal (0.2 = 20%), but values ≤ 1 are decimal, > 1 already percent
  const discountPct = discountDecimal > 0 && discountDecimal <= 1 ? discountDecimal * 100 : discountDecimal;

  const isVariant = !!line.variantId;
  const name = isVariant
    ? (line.variant?.name ?? line.description ?? "—")
    : (line.article?.name ?? line.description ?? "—");
  const barcode = isVariant
    ? (line.variant?.barcode ?? "—")
    : (line.article?.barcode ?? "—");
  const familyName = isVariant
    ? (line.variant?.article?.family?.name ?? null)
    : (line.article?.family?.name ?? null);

  return {
    lineId: line.id,
    type: isVariant ? "variant" : "article",
    id: line.variantId ?? line.articleId,
    variantId: line.variantId ?? null,
    articleId: line.articleId ?? null,
    name,
    barcode,
    familyName,
    prixAchat,
    unitPrice,
    minUnitPrice: prixAchat,
    discount: discountPct,
    maxDiscount: computeMaxDiscount(unitPrice, prixAchat, familyRemise),
    familyRemise,
    quantity: parseFloat(line.quantity ?? 1),
    description: line.description ?? "",
    priceField: line.priceField ?? "prixVente1",
    stock: { quantityAvailable: line.stockAvailable ?? 0 },
    isTouched: true,
    isExisting: true,
  };
};

const buildFromExistingPackLine = (line) => ({
  packLineId: line.id,
  packId: line.packId,
  name: line.pack?.name ?? "—",
  barcode: line.pack?.barcode ?? "",
  prixVente: parseFloat(line.prixVente ?? 0),
  quantity: line.quantity ?? 1,
  isTouched: true,
  isExisting: true,
});

/* Build a new line from modal product selection */
const buildPending = (p) => {
  const unitPrice = p.unitPrice ?? 0;
  const prixAchat = p.prixAchat ?? 0;
  const familyRemise = p.familyRemise ?? 0;
  return {
    ...p,
    lineId: null,
    quantity: 1,
    unitPrice,
    minUnitPrice: prixAchat,
    discount: p.articleRemise ?? 0,
    maxDiscount: computeMaxDiscount(unitPrice, prixAchat, familyRemise),
    familyRemise,
    description: p.name,
    isTouched: false,
    isExisting: false,
  };
};

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
      type="number" min={min} max={max} step={step}
      value={editing ? raw : value}
      onFocus={handleFocus} onBlur={handleBlur} onChange={handleChange}
      className={`${width} px-2 py-1.5 border rounded-lg text-center text-sm font-bold outline-none focus:ring-2 focus:ring-blue-400 transition-all dark:text-slate-100 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 ${className}`}
    />
  );
};

/* ─────── BonRetourClientEditForm ─────── */
export const BonRetourClientEditForm = () => {
  const { t } = useTranslation("bonRetourClient");
  const { t: tCommon } = useTranslation("common");
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id } = useParams();
  const updateMutation = useUpdateBonRetourClient();

  /* Form state */
  const [initialized, setInitialized] = useState(false);
  const [documentDate, setDocumentDate] = useState(dayjs());
  const [dateRetour, setDateRetour] = useState(dayjs().add(1, "day").format("YYYY-MM-DD"));
  const [selectedDepot, setSelectedDepot] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedBonLivraison, setSelectedBonLivraison] = useState(null);
  const [status, setStatus] = useState("DRAFT");
  const isDraft = status === "DRAFT";
  const [motifRetour, setMotifRetour] = useState("");
  const [priceField, setPriceField] = useState("prixVente1");
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [isItemsModalOpen, setIsItemsModalOpen] = useState(false);
  const [selectedPacks, setSelectedPacks] = useState([]);

  /* Fetch existing BR */
  const { data: brData, isLoading: brLoading, isError } = useBonRetourClientById(id);

  /* Shared data */
  const { data: depotsData, isLoading: depotsLoading } = useDepots({ pageSize: 10000 });
  const societeId = selectedDepot?.societe?.id ?? selectedDepot?.societeId ?? null;
  const { data: clientsData, isLoading: clientsLoading } = useBRClients({ societeId });
  const { data: bonLivraisonsData, isLoading: blLoading } = useBonLivraisonsByClient(selectedClient?.id);

  const depots = depotsData?.data ?? [];
  const clients = clientsData?.data ?? [];
  const bonLivraisons = bonLivraisonsData?.data ?? [];
  const BRC_EDIT_DRAFT_KEY = "brc_edit_draft_state";
  const editReturnTo = `/bon-retour-clients/${id}/edit`;

  const handleSaveAndNavigateToClient = () => {
    const draft = { documentDate: documentDate?.format("YYYY-MM-DDTHH:mm:ss"), dateRetour, selectedDepot, selectedClient, selectedBonLivraison, status, motifRetour, priceField, selectedProducts, selectedPacks };
    sessionStorage.setItem(BRC_EDIT_DRAFT_KEY, JSON.stringify(draft));
    navigate(`/clients/create?returnTo=${encodeURIComponent(editReturnTo)}`);
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
      priceField,
      selectedProducts,
      selectedPacks,
    };
    sessionStorage.setItem(BRC_EDIT_DRAFT_KEY, JSON.stringify(draft));
    setIsItemsModalOpen(false);
    navigate(`/articles/create?returnTo=${encodeURIComponent(editReturnTo)}`);
  };

  useEffect(() => {
    const saved = sessionStorage.getItem(BRC_EDIT_DRAFT_KEY);
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
      setPriceField(draft.priceField || "prixVente1");
      setSelectedProducts(draft.selectedProducts ?? []);
      setSelectedPacks(draft.selectedPacks ?? []);
      sessionStorage.removeItem(BRC_EDIT_DRAFT_KEY);
      queryClient.invalidateQueries({ queryKey: ["br-clients"] });
      toast.info(t("draft_restored"));
    } catch {
      sessionStorage.removeItem(BRC_EDIT_DRAFT_KEY);
    }
  }, []);
  /* ── Pre-fill form once BR data + depots are loaded ── */
  useEffect(() => {
    if (initialized || brLoading || !brData || depots.length === 0) return;

    const br = brData?.data ?? brData;
    const doc = br?.document ?? br; // status, clientId, lines live here

    // Dates
    if (br?.documentDate) setDocumentDate(dayjs(br.documentDate));
    if (br?.dateRetour) setDateRetour(dayjs(br.dateRetour).format("YYYY-MM-DD"));

    // Status (on document) + motif (on root)
    if (doc?.status) setStatus(doc.status);
    if (br?.motifRetour) setMotifRetour(br.motifRetour ?? "");

    // Depot
    const depot = depots.find((d) => d.id === br?.depotId);
    if (depot) setSelectedDepot(depot);

    // PriceField — derive from first line if not on root
    const lines = doc?.lines ?? br?.lines ?? [];
    if (br?.priceField) setPriceField(br.priceField);
    else if (lines[0]?.priceField) setPriceField(lines[0].priceField);

    // Lines → convert to table rows (all pre-touched)
    if (lines.length > 0) {
      setSelectedProducts(lines.map(buildFromExisting));
    }

    const packLines = doc?.packLines ?? br?.packLines ?? [];
    if (packLines.length > 0) setSelectedPacks(packLines.map(buildFromExistingPackLine));

    setInitialized(true);
  }, [brData, brLoading, depots, initialized]);

  /* Set client after depot + clients loaded */
  useEffect(() => {
    if (!initialized || !brData || clients.length === 0 || selectedClient) return;
    const br = brData?.data ?? brData;
    const doc = br?.document ?? br;
    const clientId = doc?.clientId ?? br?.clientId;
    if (clientId) {
      const client = clients.find((c) => c.id === clientId);
      if (client) setSelectedClient(client);
    }
  }, [clients, initialized, brData, selectedClient]);

  /* Set linked BL after bonLivraisons loaded */
  useEffect(() => {
    if (!initialized || !brData || bonLivraisons.length === 0 || selectedBonLivraison) return;
    const br = brData?.data ?? brData;
    if (br?.bonLivraisonId) {
      const bl = bonLivraisons.find((b) => b.id === br.bonLivraisonId);
      if (bl) setSelectedBonLivraison(bl);
    }
  }, [bonLivraisons, initialized, brData, selectedBonLivraison]);

  const isDepotLocked = selectedProducts.length > 0;

  const fmt = (n) => Number(n ?? 0).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  const calcMontant = (p) => { const base = p.unitPrice * p.quantity; return base - base * ((p.discount ?? 0) / 100); };

  const handleActivate = (product) => {
    setSelectedProducts((prev) =>
      prev.map((p) => productKey(p) === productKey(product) && !p.isTouched ? { ...p, isTouched: true } : p)
    );
  };

  const handleCommit = (product, field, value) => {
    setSelectedProducts((prev) =>
      prev.map((p) => {
        if (productKey(p) !== productKey(product)) return p;
        let v = parseFloat(value);
        if (isNaN(v)) v = 0;
        if (field === "quantity") { v = Math.max(1, Math.floor(v)); return { ...p, quantity: v, isTouched: true }; }
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

  const handleCommitPack = (packId, field, value) => {
    setSelectedPacks((prev) =>
      prev.map((p) => {
        if (p.packId !== packId) return p;
        let v = parseFloat(value);
        if (isNaN(v)) v = 0;
        if (field === "quantity") v = Math.max(1, Math.floor(v));
        return { ...p, [field]: v };
      })
    );
  };

  const handleItemsConfirm = (pendingProducts, pendingPacks, confirmedPriceField) => {
    if (confirmedPriceField && confirmedPriceField !== priceField) setPriceField(confirmedPriceField);
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
  const totalHT = touchedProducts.reduce((sum, p) => sum + calcMontant(p), 0);
  const totalPacksHT = selectedPacks.reduce((sum, p) => sum + p.prixVente * p.quantity, 0);
  const totalLines = selectedProducts.length;
  const hasTouched = touchedProducts.length > 0;

  const handleSubmit = async () => {
    if (!selectedDepot) { toast.error(t("toast.depot_required")); return; }
    if (!selectedClient) { toast.error(t("toast.client_required")); return; }

    const payload = {
      clientId: selectedClient.id,
      depotId: selectedDepot.id,
      bonLivraisonId: selectedBonLivraison?.id || undefined,
      documentDate: documentDate?.isValid() ? documentDate.format("YYYY-MM-DDTHH:mm:ss") : undefined,
      dateRetour,
      status,
      motifRetour: motifRetour.trim() || undefined,
    };

    if (status === "DRAFT") {
      const linesPayload = selectedProducts
        .filter((p) => p.isExisting || p.isTouched)
        .map((p) => {
          const line = { quantity: p.quantity, unitPrice: p.unitPrice, remise: (p.discount ?? 0) / 100 };
          if (p.lineId) line.id = p.lineId;
          else line.priceField = p.priceField || priceField;
          if (p.type === "variant") line.variantId = p.variantId ?? p.id;
          else line.articleId = p.articleId ?? p.id;
          return line;
        });

      const packLinesPayload = selectedPacks.map((p) => ({
        packId: p.packId,
        quantity: p.quantity,
        prixVente: p.prixVente,
      }));

      if (linesPayload.length === 0 && packLinesPayload.length === 0) {
        toast.error(t("toast.at_least_one_line", "Au moins un article ou pack est requis"));
        return;
      }

      payload.lines = linesPayload;
      payload.packLines = packLinesPayload;
    }

    updateMutation.mutate(
      { id, payload },
      {
        onSuccess: (res) => { toast.success(res?.message || t("toast.update_success")); navigate("/bon-retour-clients"); },
        onError: (err) => { toast.error(err?.response?.data?.message || t("toast.update_error")); },
      }
    );
  };

  const canSubmit = selectedDepot && selectedClient && !updateMutation.isPending;

  /* Loading / error states */
  if (brLoading || !initialized) return <SectionLoader />;

  if (!brData?.data || isError) {
    return <NotFound onAction={() => navigate("/bon-retour-clients")} />;
  }

  const br = brData?.data ?? brData;
  const docNumber = br?.documentNumber ?? `BR #${id}`;

  return (
    <div className="-m-4 lg:-m-6 px-3 pt-3">
      <FormPageHeader
        entityName="bon-retour-client"
        backPath="/bon-retour-clients"
        isEdit={true}
        data={br}
        editTitle={t("edit_title", { documentNumber: docNumber })}
        backLabel={t("back_label")}
      />

      <FormShell wide>

        <FormCard
          title={t("informations")}
          description={t("informations_edit")}
          action={docNumber ? <NextNumberBadge label={t("document_number")} value={docNumber} /> : null}
        >
          <div className="space-y-5">
            <div className={!isDraft ? "pointer-events-none opacity-50 space-y-5" : "space-y-5"}>
              <FormGroup title={tCommon("form_group_parties")}>
                <FormFieldGrid cols={3}>
                  <div>
                    <label className={FORM_LABEL}>{t("depot_required")} <span className="text-red-500">*</span></label>
                    {isDepotLocked ? (
                      <>
                        <div className="relative">
                          <input readOnly
                            value={`${selectedDepot?.name} — ${selectedDepot?.societe?.raisonSocial ?? ""}`}
                            className={`${FORM_CONTROL_DISABLED} pr-10`}
                          />
                          <Lock className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                        </div>
                        <p className="text-xs text-amber-500 mt-1.5">{t("remove_articles_to_change_depot")}</p>
                      </>
                    ) : (
                      <SelectDropDown
                        placeholder={t("select_depot")} value={selectedDepot?.id || ""}
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
                        label={t("linked_bl_optional")} placeholder={t("select_bl_optional")} value={selectedBonLivraison?.id || ""}
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
                    <label className={FORM_LABEL}>{t("document_date_required")}</label>
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
                  <FormDatePicker label={t("return_date_label")} name="dateRetour" value={dateRetour} onChange={(e) => setDateRetour(e.target.value)} />

                  <div>
                    <label className={FORM_LABEL}>
                      {t("status_label")}
                    </label>
                    <div className={`${FORM_CONTROL_DISABLED} flex items-center`}>
                      <span className={`inline-flex items-center gap-2 text-sm font-medium ${status === "COMPLETED" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 dark:text-slate-400"}`}>
                        <span className={`w-2 h-2 rounded-full ${status === "COMPLETED" ? "bg-emerald-500" : "bg-slate-400"}`} />
                        {status === "COMPLETED" ? t("completed") : t("draft")}
                      </span>
                    </div>
                  </div>

                  <Input
                    label={t("return_reason")}
                    type="text"
                    value={motifRetour}
                    onChange={(e) => setMotifRetour(e.target.value)}
                    placeholder={t("return_reason_placeholder")}
                  />
                </FormFieldGrid>
              </FormGroup>
            </div>

            <FormActions
              submitType="button"
              onSubmit={handleSubmit}
              submitLabel={t("save_changes")}
              isLoading={updateMutation.isPending}
              disabled={!canSubmit}
              extra={selectedProducts.length > 0 && !hasTouched ? (
                <p className="text-[11px] text-slate-400 dark:text-slate-500 mr-auto">{t("click_field_to_edit")}</p>
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
            {isDraft && (
              <button
                onClick={() => { if (!selectedDepot) { toast.error(t("toast.depot_required")); return; } setIsItemsModalOpen(true); }}
                className="flex items-center gap-2 h-10 px-4 bg-[#B12B89] hover:bg-[#9A2478] text-white rounded-md transition-colors font-medium text-sm whitespace-nowrap"
              >
                <Plus className="w-4 h-4" /> {t("add_articles_packs", "Articles & Packs")}
              </button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 border-b border-slate-100 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
                  <th className="px-6 py-3.5 text-left font-semibold">{t("article")}</th>
                  <th className="px-5 py-3.5 text-left font-semibold hidden md:table-cell">{t("family")}</th>
                  <th className="px-5 py-3.5 text-left font-semibold hidden md:table-cell">{t("type")}</th>
                  <th className="px-5 py-3.5 text-center font-semibold">{t("selling_price")}</th>
                  <th className="px-5 py-3.5 text-center font-semibold">{t("discount_percent")}</th>
                  <th className="px-5 py-3.5 text-center font-semibold">{t("quantity")}</th>
                  <th className="px-5 py-3.5 text-center font-semibold">{t("amount_excl_tax")}</th>
                  {isDraft && <th className="px-6 py-3.5 text-right font-semibold"></th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {selectedProducts.length === 0 && selectedPacks.length === 0 ? (
                  <tr>
                    <td colSpan={isDraft ? 8 : 7} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center opacity-40">
                        <RotateCcw className="w-10 h-10 mb-3 text-slate-400" />
                        <p className="text-sm font-semibold text-slate-500">{t("no_articles")}</p>
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
                        <tr key={`${productKey(product)}-${product.lineId ?? "new"}`}
                          className="group transition-colors hover:bg-blue-50/20 dark:hover:bg-blue-900/5">
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
                            <span className="text-xs text-slate-500 dark:text-slate-400">{product.family?.name ?? product.familyName ?? "—"}</span>
                          </td>
                          <td className="px-5 py-4 hidden md:table-cell">
                            <span className={`text-[9px] font-bold uppercase px-2 py-1 rounded ${product.type === "variant" ? "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400" : "bg-blue-50 dark:bg-blue-900/20 text-[#B12B89] dark:text-blue-400"}`}>
                              {product.type === "variant" ? t("variant") : t("article_type")}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-center">
                            {isDraft ? (
                              <EditableCell value={product.unitPrice} min={product.minUnitPrice ?? 0} step={0.01} width="w-28"
                                onActivate={() => handleActivate(product)} onCommit={(v) => handleCommit(product, "unitPrice", v)} />
                            ) : (
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{fmt(product.unitPrice)}</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-center">
                            {isDraft ? (
                              <EditableCell value={product.discount} min={0} step={0.5} width="w-20"
                                className={discountOverLimit ? "bg-amber-50 dark:bg-amber-900/20 border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300" : ""}
                                onActivate={() => handleActivate(product)} onCommit={(v) => handleCommit(product, "discount", v)} />
                            ) : (
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{product.discount}%</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-center">
                            {isDraft ? (
                              <EditableCell value={product.quantity} min={1} step={1} width="w-20"
                                onActivate={() => handleActivate(product)} onCommit={(v) => handleCommit(product, "quantity", v)} />
                            ) : (
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{product.quantity}</span>
                            )}
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
                          {isDraft && (
                            <td className="px-6 py-4 text-right">
                              <button onClick={() => handleRemoveProduct(product)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}

                    {/* ── Pack rows ── */}
                    {selectedPacks.map((pack) => {
                      const montant = pack.prixVente * pack.quantity;
                      return (
                        <tr key={`pack-${pack.packId}-${pack.packLineId ?? "new"}`}
                          className="hover:bg-violet-50/30 dark:hover:bg-violet-900/10 transition-colors">
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
                          <td className="px-5 py-4 text-center">
                            {isDraft ? (
                              <EditableCell value={pack.prixVente} min={0} step={0.01} width="w-28"
                                onActivate={() => {}} onCommit={(v) => handleCommitPack(pack.packId, "prixVente", v)} />
                            ) : (
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{fmt(pack.prixVente)}</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-center"><span className="text-sm text-slate-300 dark:text-slate-600">—</span></td>
                          <td className="px-5 py-4 text-center">
                            {isDraft ? (
                              <EditableCell value={pack.quantity} min={1} step={1} width="w-20"
                                onActivate={() => {}} onCommit={(v) => handleCommitPack(pack.packId, "quantity", v)} />
                            ) : (
                              <span className="text-sm font-medium text-slate-700 dark:text-slate-200">{pack.quantity}</span>
                            )}
                          </td>
                          <td className="px-5 py-4 text-center">
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{fmt(montant)} MAD</span>
                          </td>
                          {isDraft && (
                            <td className="px-6 py-4 text-right">
                              <button onClick={() => handleRemovePack(pack.packId)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all">
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </>
                )}
              </tbody>

              {(hasTouched || selectedPacks.length > 0) && (
                <tfoot>
                  <tr className="border-t-2 border-slate-200 dark:border-slate-700 bg-slate-50/80 dark:bg-slate-800/40">
                    <td colSpan={isDraft ? 6 : 5} className="px-6 py-4 text-right text-xs font-bold uppercase text-slate-500 tracking-wider">{t("total_excl_tax")}</td>
                    <td className="px-5 py-4 text-center">
                      <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{fmt(totalHT + totalPacksHT)} MAD</span>
                    </td>
                    {isDraft && <td />}
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
        priceField={priceField}
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