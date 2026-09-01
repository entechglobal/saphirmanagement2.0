import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "@/shared/utils/toast";
import {
  useBonRetourFournisseurById,
  useUpdateBonRetourFournisseur,
  useBRFProducts,
} from "../hooks/useBonRetourFournisseurs";
import { SelectBRFProductsModal } from "./SelectBRFProductsModal";
import { FormCard, FormFieldGrid, FormGroup, FormShell, NextNumberBadge } from "../../../shared/components/FormCard";
import { FormActions } from "../../../shared/components/FormActions";
import { FORM_CONTROL, FORM_LABEL } from "../../../shared/components/formStyles";

const lineKey = (l) =>
  `${l.variantId ? "variant" : "article"}-${l.variantId || l.articleId}`;

export const BonRetourFournisseurEditForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading } = useBonRetourFournisseurById(id);
  const updateMutation = useUpdateBonRetourFournisseur();

  const [motifRetour, setMotifRetour] = useState("");
  const [notes, setNotes] = useState("");
  const [documentDate, setDocumentDate] = useState("");
  const [lines, setLines] = useState([]);
  const [hydrated, setHydrated] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);

  const brf = data?.data;
  const depotId = brf?.depotId;

  useEffect(() => {
    if (!brf || hydrated) return;
    if (brf.document?.status !== "DRAFT") {
      toast.error("Seul un brouillon peut être modifié");
      navigate(`/bon-retour-fournisseurs/${id}/preview`);
      return;
    }
    setMotifRetour(brf.motifRetour || "");
    setNotes(brf.document?.notes || "");
    setDocumentDate(
      dayjs(brf.documentDate).isValid()
        ? dayjs(brf.documentDate).format("YYYY-MM-DD")
        : "",
    );
    setLines(
      (brf.document?.lines || []).map((l) => ({
        id: l.id,
        articleId: l.articleId,
        variantId: l.variantId,
        name: l.article?.name || l.variant?.name || l.description,
        description: l.description,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
        remise: Number(l.discount || 0),
      })),
    );
    setHydrated(true);
  }, [brf, hydrated, id, navigate]);

  const updateLine = (key, patch) => {
    setLines((prev) =>
      prev.map((l) => (lineKey(l) === key ? { ...l, ...patch } : l)),
    );
  };

  const removeLine = (key) =>
    setLines((prev) => prev.filter((l) => lineKey(l) !== key));

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
            unitPrice: Number(p.unitPrice || 0),
            remise: 0,
          });
        }
      }
      return Array.from(map.values());
    });
    setModalOpen(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (lines.length === 0) {
      toast.error("Au moins une ligne requise");
      return;
    }
    try {
      await updateMutation.mutateAsync({
        id: Number(id),
        payload: {
          documentDate: documentDate
            ? dayjs(documentDate).startOf("day").toISOString()
            : undefined,
          motifRetour: motifRetour || null,
          notes: notes || null,
          lines: lines.map((l) => ({
            quantity: Number(l.quantity),
            unitPrice: Number(l.unitPrice),
            remise: Number(l.remise || 0),
            description: l.description || l.name,
            ...(l.variantId
              ? { variantId: l.variantId }
              : { articleId: l.articleId }),
          })),
        },
      });
      toast.success("Retour mis à jour");
      navigate("/bon-retour-fournisseurs");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Mise à jour impossible");
    }
  };

  if (isLoading || !hydrated) {
    return (
      <div className="flex justify-center py-24 text-slate-400 gap-2">
        <Loader2 className="w-5 h-5 animate-spin" />
        Chargement…
      </div>
    );
  }

  return (
    <div className="-m-4 lg:-m-6 px-3 pt-3">
      <div className="flex items-center gap-3 px-4 md:px-6 mt-6">
        <button
          type="button"
          onClick={() => navigate("/bon-retour-fournisseurs")}
          className="p-2 rounded-md border"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold">
            Modifier — {brf.document?.documentNumber}
          </h1>
          <p className="text-xs text-slate-500">
            {brf.document?.fournisseur?.name} · {brf.depot?.name}
          </p>
        </div>
      </div>

      <FormShell wide>
      <form onSubmit={handleSubmit} className="space-y-5">
        <FormCard
          title="Informations"
          action={brf.document?.documentNumber ? (
            <NextNumberBadge label="N° Document" value={brf.document.documentNumber} />
          ) : null}
        >
          <div className="space-y-5">
            <FormGroup>
              <FormFieldGrid>
                <div>
                  <label className={FORM_LABEL}>Date</label>
                  <input
                    type="date"
                    className={FORM_CONTROL}
                    value={documentDate}
                    onChange={(e) => setDocumentDate(e.target.value)}
                  />
                </div>
                <div>
                  <label className={FORM_LABEL}>Motif</label>
                  <input
                    className={FORM_CONTROL}
                    value={motifRetour}
                    onChange={(e) => setMotifRetour(e.target.value)}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className={FORM_LABEL}>Notes</label>
                  <textarea
                    rows={2}
                    className={`${FORM_CONTROL} h-auto py-3`}
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                  />
                </div>
              </FormFieldGrid>
            </FormGroup>

            <FormActions
              submitType="button"
              onSubmit={handleSubmit}
              onCancel={() => navigate("/bon-retour-fournisseurs")}
              cancelLabel="Annuler"
              submitLabel="Enregistrer"
              isLoading={updateMutation.isPending}
            />
          </div>
        </FormCard>

        <FormCard
          title="Lignes"
          action={
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-md bg-[#B12B89] hover:bg-[#9A2478] text-white text-sm font-medium"
            >
              <Plus className="w-4 h-4" /> Ajouter
            </button>
          }
        >
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[11px] uppercase text-slate-500 border-b">
                <th className="py-2">Produit</th>
                <th className="py-2 w-24">Qté</th>
                <th className="py-2 w-28">P.U.</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {lines.map((line) => {
                const key = lineKey(line);
                return (
                  <tr key={key} className="border-b">
                    <td className="py-2 font-semibold">{line.name}</td>
                    <td className="py-2 pr-2">
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
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className={FORM_CONTROL}
                        value={line.unitPrice}
                        onChange={(e) =>
                          updateLine(key, { unitPrice: e.target.value })
                        }
                      />
                    </td>
                    <td>
                      <button
                        type="button"
                        onClick={() => removeLine(key)}
                        className="p-2 text-red-500"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </FormCard>
      </form>
      </FormShell>

      <SelectBRFProductsModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirmProducts}
        alreadyInTable={lines}
        depotId={depotId}
        useProducts={useBRFProducts}
      />
    </div>
  );
};
