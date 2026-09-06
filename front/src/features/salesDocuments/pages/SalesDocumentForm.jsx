import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import {
  ArrowLeft,
  Loader2,
  Plus,
  Trash2,
} from "lucide-react";
import { toast } from "@/shared/utils/toast";
import useAuthStore from "../../../features/auth/store/authStore";
import { SearchableClientSelect } from "../../../shared/components/SearchableClientSelect";
import { SelectSalesProductsModal } from "../components/SelectSalesProductsModal";
import { FactureCreateModeModal } from "../components/FactureCreateModeModal";
import { SelectBonLivraisonForFactureModal } from "../components/SelectBonLivraisonForFactureModal";
import { createSalesDocumentHooks } from "../hooks/useSalesDocuments";
import { FormCard, FormFieldGrid, FormGroup, FormShell, NextNumberBadge } from "../../../shared/components/FormCard";
import { FormActions } from "../../../shared/components/FormActions";
import { FORM_CONTROL, FORM_LABEL } from "../../../shared/components/formStyles";

const lineKey = (l) =>
  `${l.variantId ? "variant" : "article"}-${l.variantId || l.articleId}`;

const computeLineTotals = (line) => {
  const qty = Number(line.quantity) || 0;
  const unit = Number(line.unitPrice) || 0;
  const remise = Number(line.remise) || 0;
  const tva = Number(line.tva) || 0;
  const totalTTC = qty * unit * (1 - remise);
  const totalHT = totalTTC / (1 + tva);
  const totalTVA = totalTTC - totalHT;
  return { totalTTC, totalHT, totalTVA };
};

export const SalesDocumentForm = ({ config }) => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const hooks = useMemo(() => createSalesDocumentHooks(config), [config]);
  const {
    useById,
    useNextNumber,
    useCreate,
    useUpdate,
    useClients,
    useProducts,
  } = hooks;

  const { data: existingRes, isLoading: loadingExisting } = useById(
    isEdit ? id : null,
  );

  const [selectedClient, setSelectedClient] = useState(null);
  const societeId =
    selectedClient?.societeId ??
    selectedClient?.societe?.id ??
    user?.societeId ??
    null;

  const { data: nextNumberData } = useNextNumber(!isEdit ? societeId : null);
  const createMutation = useCreate();
  const updateMutation = useUpdate();

  const [clientName, setClientName] = useState("");
  const [documentDate, setDocumentDate] = useState(
    dayjs().format("YYYY-MM-DD"),
  );
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [bonLivraisonId, setBonLivraisonId] = useState(null);
  const [linkedBlLabel, setLinkedBlLabel] = useState(null);
  // Facture create flow: null = ask mode, "blank" | "from-bl"
  const [factureMode, setFactureMode] = useState(
    config.key === "facture" && !isEdit ? null : "blank",
  );
  const [showBlPicker, setShowBlPicker] = useState(false);

  const mapDocumentLines = (docLines = []) =>
    docLines.map((l) => ({
      articleId: l.articleId,
      variantId: l.variantId,
      name: l.article?.name || l.variant?.name || l.description,
      description: l.description,
      quantity: Number(l.quantity),
      unitPrice: Number(l.unitPrice),
      remise: Number(l.remise || 0),
      tva: Number(l.tvaRate || l.article?.family?.TVA || 0),
      priceField: l.priceField || "prixVente1",
      unit: l.article?.unitePrincipale || l.variant?.article?.unitePrincipale,
    }));

  const applyBonLivraison = (bl) => {
    const header = bl.document;
    setBonLivraisonId(bl.id);
    setLinkedBlLabel(header?.documentNumber || `BL #${bl.id}`);
    setSelectedClient(header?.client || null);
    setClientName(header?.clientName || "");
    setDocumentDate(dayjs().format("YYYY-MM-DD"));
    setNotes(header?.notes || "");
    setLines(mapDocumentLines(header?.lines || []));
    setFactureMode("from-bl");
    setShowBlPicker(false);
  };

  useEffect(() => {
    if (!isEdit || !existingRes?.data || hydrated) return;
    const doc = existingRes.data;
    const header = doc.document;
    setSelectedClient(header?.client || null);
    setClientName(header?.clientName || "");
    setDocumentDate(
      dayjs(doc.documentDate).isValid()
        ? dayjs(doc.documentDate).format("YYYY-MM-DD")
        : dayjs().format("YYYY-MM-DD"),
    );
    setNotes(header?.notes || "");
    setLines(mapDocumentLines(header?.lines || []));
    if (doc.bonLivraisonId || doc.bonLivraison) {
      setBonLivraisonId(doc.bonLivraisonId || doc.bonLivraison?.id || null);
      setLinkedBlLabel(
        doc.bonLivraison?.document?.documentNumber || null,
      );
    }
    setHydrated(true);
  }, [existingRes, isEdit, hydrated]);

  const totals = useMemo(() => {
    if (config.hidePrices) return { totalHT: 0, totalTVA: 0, totalTTC: 0 };
    return lines.reduce(
      (acc, line) => {
        const t = computeLineTotals(line);
        return {
          totalHT: acc.totalHT + t.totalHT,
          totalTVA: acc.totalTVA + t.totalTVA,
          totalTTC: acc.totalTTC + t.totalTTC,
        };
      },
      { totalHT: 0, totalTVA: 0, totalTTC: 0 },
    );
  }, [lines, config.hidePrices]);

  const nextNumber = nextNumberData?.data?.nextNumber;

  const updateLine = (key, patch) => {
    setLines((prev) =>
      prev.map((l) => (lineKey(l) === key ? { ...l, ...patch } : l)),
    );
  };

  const removeLine = (key) => {
    setLines((prev) => prev.filter((l) => lineKey(l) !== key));
  };

  const handleConfirmProducts = (pending) => {
    setLines((prev) => {
      const map = new Map(prev.map((l) => [lineKey(l), l]));
      for (const p of pending) {
        const k = lineKey(p);
        if (!map.has(k)) {
          map.set(k, {
            articleId: p.articleId,
            variantId: p.variantId,
            name: p.name,
            description: p.description || p.name,
            quantity: p.quantity || 1,
            unitPrice: config.hidePrices ? 0 : Number(p.unitPrice || 0),
            remise: 0,
            tva: Number(p.tva || 0),
            priceField: p.priceField || "prixVente1",
            unit: p.unit,
          });
        }
      }
      return Array.from(map.values());
    });
    setModalOpen(false);
  };

  const buildPayload = () => {
    if (config.requireClient && !selectedClient) {
      toast.error("Client requis");
      return null;
    }
    if (!selectedClient && !clientName.trim() && !societeId) {
      toast.error("Société ou client requis");
      return null;
    }
    if (lines.length === 0) {
      toast.error("Ajoutez au moins un produit");
      return null;
    }

    return {
      clientId: selectedClient?.id || null,
      clientName: selectedClient ? undefined : clientName.trim() || null,
      societeId: societeId || undefined,
      documentDate: documentDate
        ? dayjs(documentDate).startOf("day").toISOString()
        : undefined,
      notes: notes || null,
      status: "DRAFT",
      ...(config.key === "facture" && bonLivraisonId
        ? { bonLivraisonId }
        : {}),
      lines: lines.map((l) => {
        const base = {
          quantity: Number(l.quantity),
          description: l.description || l.name,
          ...(l.variantId
            ? { variantId: l.variantId }
            : { articleId: l.articleId }),
        };
        if (config.hidePrices) return base;
        return {
          ...base,
          unitPrice: Number(l.unitPrice),
          remise: Number(l.remise || 0),
          priceField: l.priceField || "prixVente1",
        };
      }),
    };
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const payload = buildPayload();
    if (!payload) return;

    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: Number(id), payload });
        toast.success(`${config.singular} mis à jour`);
      } else {
        await createMutation.mutateAsync(payload);
        toast.success(`${config.singular} créé`);
      }
      navigate(config.path);
    } catch (err) {
      toast.error(
        err?.response?.data?.message ||
          err?.message ||
          "Erreur lors de l'enregistrement",
      );
    }
  };

  const saving = createMutation.isPending || updateMutation.isPending;

  if (isEdit && loadingExisting) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        Chargement…
      </div>
    );
  }

  const needsFactureMode =
    config.key === "facture" && !isEdit && factureMode === null;

  return (
    <div className="-m-4 lg:-m-6 px-3 pt-3">
      <FactureCreateModeModal
        isOpen={needsFactureMode}
        onClose={() => navigate(config.path)}
        onChooseBlank={() => setFactureMode("blank")}
        onChooseFromBl={() => {
          setFactureMode("from-bl");
          setShowBlPicker(true);
        }}
      />

      <SelectBonLivraisonForFactureModal
        isOpen={showBlPicker}
        onClose={() => {
          setShowBlPicker(false);
          if (!bonLivraisonId) setFactureMode(null);
        }}
        onSelect={applyBonLivraison}
      />

      {(needsFactureMode || (showBlPicker && !bonLivraisonId)) && (
        <div className="flex items-center justify-center py-24 text-slate-400 text-sm">
          Choisissez le mode de création de la facture…
        </div>
      )}

      {!needsFactureMode && !(showBlPicker && !bonLivraisonId) && (
      <>
      <div className="flex items-center gap-3 pt-4 mb-6">
        <button
          type="button"
          onClick={() => navigate(config.path)}
          className="p-2 rounded-md border border-slate-200 dark:border-[#2e2e2e] hover:bg-slate-50 dark:hover:bg-[#222222]"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {isEdit ? `Modifier — ${config.singular}` : config.createLabel}
          </h1>
          {linkedBlLabel && (
            <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5 font-semibold">
              Liée au BL {linkedBlLabel}
            </p>
          )}
        </div>
      </div>

      <FormShell wide>
      <form onSubmit={handleSubmit} className="space-y-5">
        <FormCard
          title="Informations"
          action={!isEdit && nextNumber ? (
            <NextNumberBadge label="Prochain N°" value={nextNumber} />
          ) : null}
        >
          <div className="space-y-5">
            <FormGroup>
              <FormFieldGrid>
                <div>
                  <label className={FORM_LABEL}>
                    Client{" "}
                    {config.requireClient && (
                      <span className="text-red-500">*</span>
                    )}
                  </label>
                  <SearchableClientSelect
                    useClientsHook={useClients}
                    societeId={societeId}
                    value={selectedClient}
                    disabled={Boolean(bonLivraisonId)}
                    onChange={(c) => {
                      setSelectedClient(c);
                      if (c) setClientName("");
                    }}
                    placeholder="Sélectionner un client"
                  />
                  {bonLivraisonId && (
                    <p className="text-[10px] text-slate-400 mt-1">
                      Client repris du bon de livraison (lié)
                    </p>
                  )}
                </div>

                {!config.requireClient && !selectedClient && (
                  <div>
                    <label className={FORM_LABEL}>Nom libre (optionnel)</label>
                    <input
                      className={FORM_CONTROL}
                      value={clientName}
                      onChange={(e) => setClientName(e.target.value)}
                      placeholder="Destinataire / fournisseur…"
                    />
                  </div>
                )}
              </FormFieldGrid>
            </FormGroup>

            <FormGroup>
              <FormFieldGrid>
                <div>
                  <label className={FORM_LABEL}>Date document</label>
                  <input
                    type="date"
                    className={FORM_CONTROL}
                    value={documentDate}
                    onChange={(e) => setDocumentDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className={FORM_LABEL}>Notes</label>
                  <textarea
                    rows={2}
                    className={`${FORM_CONTROL} h-auto py-3`}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Notes imprimées sur le document…"
                  />
                </div>
              </FormFieldGrid>
            </FormGroup>

            <FormActions
              submitType="button"
              onSubmit={handleSubmit}
              onCancel={() => navigate(config.path)}
              cancelLabel="Annuler"
              submitLabel={isEdit ? "Enregistrer" : "Créer"}
              isLoading={saving}
              disabled={lines.length === 0}
            />
          </div>
        </FormCard>

        <FormCard
          title="Lignes produits"
          action={
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-md bg-[#B12B89] hover:bg-[#9A2478] text-white text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Ajouter
            </button>
          }
        >

          {lines.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center border border-dashed border-slate-200 dark:border-[#2e2e2e] rounded-lg">
              Aucun produit — cliquez sur Ajouter
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-100 dark:border-[#2e2e2e]">
                    <th className="py-2 pr-3 font-bold">Produit</th>
                    <th className="py-2 px-2 font-bold w-28">Qté</th>
                    {!config.hidePrices && (
                      <>
                        <th className="py-2 px-2 font-bold w-32">P.U. TTC</th>
                        <th className="py-2 px-2 font-bold w-24">Remise</th>
                        <th className="py-2 px-2 font-bold w-32 text-right">
                          Total TTC
                        </th>
                      </>
                    )}
                    <th className="py-2 pl-2 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => {
                    const key = lineKey(line);
                    const t = computeLineTotals(line);
                    return (
                      <tr
                        key={key}
                        className="border-b border-slate-50 dark:border-[#2e2e2e]/80"
                      >
                        <td className="py-2.5 pr-3">
                          <p className="font-semibold text-slate-800 dark:text-slate-100">
                            {line.name}
                          </p>
                          <p className="text-[11px] text-slate-400">
                            {line.unit?.symbol || "U"}
                          </p>
                        </td>
                        <td className="py-2 px-2">
                          <input
                            type="number"
                            min="0.001"
                            step="any"
                            className={FORM_CONTROL}
                            value={line.quantity}
                            onChange={(e) =>
                              updateLine(key, {
                                quantity: e.target.value,
                              })
                            }
                          />
                        </td>
                        {!config.hidePrices && (
                          <>
                            <td className="py-2 px-2">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                className={FORM_CONTROL}
                                value={line.unitPrice}
                                onChange={(e) =>
                                  updateLine(key, {
                                    unitPrice: e.target.value,
                                  })
                                }
                              />
                            </td>
                            <td className="py-2 px-2">
                              <input
                                type="number"
                                min="0"
                                max="1"
                                step="0.01"
                                className={FORM_CONTROL}
                                value={line.remise}
                                onChange={(e) =>
                                  updateLine(key, {
                                    remise: e.target.value,
                                  })
                                }
                                title="Remise décimale (0.10 = 10%)"
                              />
                            </td>
                            <td className="py-2 px-2 text-right font-semibold tabular-nums">
                              {t.totalTTC.toFixed(2)}
                            </td>
                          </>
                        )}
                        <td className="py-2 pl-2">
                          <button
                            type="button"
                            onClick={() => removeLine(key)}
                            className="p-2 rounded-lg text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!config.hidePrices && lines.length > 0 && (
            <div className="flex justify-end pt-2">
              <div className="w-56 space-y-1 text-sm">
                <div className="flex justify-between text-slate-500">
                  <span>Total HT</span>
                  <span className="tabular-nums">
                    {totals.totalHT.toFixed(2)} DH
                  </span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Total TVA</span>
                  <span className="tabular-nums">
                    {totals.totalTVA.toFixed(2)} DH
                  </span>
                </div>
                <div className="flex justify-between font-bold text-slate-900 dark:text-white text-base pt-1 border-t border-slate-100 dark:border-[#2e2e2e]">
                  <span>Total TTC</span>
                  <span className="tabular-nums">
                    {totals.totalTTC.toFixed(2)} DH
                  </span>
                </div>
              </div>
            </div>
          )}

          {config.hidePrices && (
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Document sans prix — imprimé comme demande de prix (quantités
              uniquement).
            </p>
          )}
        </FormCard>

      </form>
      </FormShell>

      <SelectSalesProductsModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirmProducts}
        alreadyInTable={lines}
        hidePrices={config.hidePrices}
        useProducts={useProducts}
      />
      </>
      )}
    </div>
  );
};
