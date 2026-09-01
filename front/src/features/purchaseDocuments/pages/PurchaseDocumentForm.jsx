import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "@/shared/utils/toast";
import useAuthStore from "../../../features/auth/store/authStore";
import { SearchableFrsSelect } from "../../bonreception/components/SearchableFrsSelect";
import { SelectPurchaseProductsModal } from "../components/SelectPurchaseProductsModal";
import { createPurchaseDocumentHooks } from "../hooks/usePurchaseDocuments";
import { FormCard, FormFieldGrid, FormGroup, FormShell, NextNumberBadge } from "../../../shared/components/FormCard";
import { FormActions } from "../../../shared/components/FormActions";
import { FORM_CONTROL, FORM_LABEL } from "../../../shared/components/formStyles";

const lineKey = (l) =>
  `${l.variantId ? "variant" : "article"}-${l.variantId || l.articleId}`;

export const PurchaseDocumentForm = ({ config }) => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const hooks = useMemo(() => createPurchaseDocumentHooks(config), [config]);
  const { useById, useNextNumber, useCreate, useUpdate, useProducts } = hooks;

  const { data: existingRes, isLoading: loadingExisting } = useById(
    isEdit ? id : null,
  );

  const [selectedFrs, setSelectedFrs] = useState(null);
  const societeId =
    selectedFrs?.societeId ??
    selectedFrs?.societe?.id ??
    user?.societeId ??
    null;

  const { data: nextNumberData } = useNextNumber(!isEdit ? societeId : null);
  const createMutation = useCreate();
  const updateMutation = useUpdate();

  const [documentDate, setDocumentDate] = useState(
    dayjs().format("YYYY-MM-DD"),
  );
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    if (!isEdit || !existingRes?.data || hydrated) return;
    const doc = existingRes.data;
    const header = doc.document;
    setSelectedFrs(header?.fournisseur || null);
    setDocumentDate(
      dayjs(doc.documentDate).isValid()
        ? dayjs(doc.documentDate).format("YYYY-MM-DD")
        : dayjs().format("YYYY-MM-DD"),
    );
    setNotes(header?.notes || "");
    setLines(
      (header?.lines || []).map((l) => ({
        articleId: l.articleId,
        variantId: l.variantId,
        name: l.article?.name || l.variant?.name || l.description,
        description: l.description,
        quantity: Number(l.quantity),
        unit: l.article?.unitePrincipale || l.variant?.article?.unitePrincipale,
      })),
    );
    setHydrated(true);
  }, [existingRes, isEdit, hydrated]);

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
            unit: p.unit,
          });
        }
      }
      return Array.from(map.values());
    });
    setModalOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (config.requireFournisseur && !selectedFrs) {
      toast.error("Fournisseur requis");
      return;
    }
    if (lines.length === 0) {
      toast.error("Ajoutez au moins un produit");
      return;
    }

    const payload = {
      frsId: selectedFrs.id,
      societeId: societeId || undefined,
      documentDate: documentDate
        ? dayjs(documentDate).startOf("day").toISOString()
        : undefined,
      notes: notes || null,
      status: "DRAFT",
      lines: lines.map((l) => ({
        quantity: Number(l.quantity),
        description: l.description || l.name,
        ...(l.variantId
          ? { variantId: l.variantId }
          : { articleId: l.articleId }),
      })),
    };

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

  return (
    <div className="-m-4 lg:-m-6 px-3 pt-3">
      <div className="flex items-center gap-3 pt-4 mb-6">
        <button
          type="button"
          onClick={() => navigate(config.path)}
          className="p-2 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            {isEdit ? `Modifier — ${config.singular}` : config.createLabel}
          </h1>
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
                    Fournisseur <span className="text-red-500">*</span>
                  </label>
                  <SearchableFrsSelect
                    societeId={societeId}
                    value={selectedFrs}
                    onChange={setSelectedFrs}
                    placeholder="Sélectionner un fournisseur"
                  />
                </div>
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
            <p className="text-sm text-slate-400 py-8 text-center border border-dashed border-slate-200 dark:border-slate-700 rounded-lg">
              Aucun produit — cliquez sur Ajouter
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-slate-500 border-b border-slate-100 dark:border-slate-800">
                    <th className="py-2 pr-3 font-bold">Produit</th>
                    <th className="py-2 px-2 font-bold w-28">Qté</th>
                    <th className="py-2 pl-2 w-10" />
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line) => {
                    const key = lineKey(line);
                    return (
                      <tr
                        key={key}
                        className="border-b border-slate-50 dark:border-slate-800/80"
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
                              updateLine(key, { quantity: e.target.value })
                            }
                          />
                        </td>
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

          <p className="text-xs text-amber-600 dark:text-amber-400">
            Document sans prix — imprimé comme demande de prix (quantités
            uniquement).
          </p>
        </FormCard>
      </form>
      </FormShell>

      <SelectPurchaseProductsModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirmProducts}
        alreadyInTable={lines}
        useProducts={useProducts}
      />
    </div>
  );
};
