import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import dayjs from "dayjs";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { toast } from "@/shared/utils/toast";
import useAuthStore from "../../auth/store/authStore";
import { SearchableFrsSelect } from "../../bonreception/components/SearchableFrsSelect";
import { SelectDropDown } from "../../../shared/components/SelectDropDown";
import {
  useCreateBonRetourFournisseur,
  useNextBRFNumber,
  useBonReceptionsByFrs,
  useDepots,
  useBRFProducts,
} from "../hooks/useBonRetourFournisseurs";
import { SelectBRFProductsModal } from "../components/SelectBRFProductsModal";
import { FormCard, FormFieldGrid, FormGroup, FormShell, NextNumberBadge } from "../../../shared/components/FormCard";
import { FormActions } from "../../../shared/components/FormActions";
import { FORM_CONTROL, FORM_LABEL } from "../../../shared/components/formStyles";

const lineKey = (l) =>
  `${l.variantId ? "variant" : "article"}-${l.variantId || l.articleId}`;

export const BonRetourFournisseurForm = () => {
  const { t: tCommon } = useTranslation("common");
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const societeId = user?.societeId ?? null;

  const [selectedDepot, setSelectedDepot] = useState(null);
  const [selectedFrs, setSelectedFrs] = useState(null);
  const [selectedReception, setSelectedReception] = useState(null);
  const [documentDate, setDocumentDate] = useState(dayjs().format("YYYY-MM-DD"));
  const [motifRetour, setMotifRetour] = useState("");
  const [notes, setNotes] = useState("");
  const [status, setStatus] = useState("COMPLETED");
  const [lines, setLines] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);

  const { data: nextNumberData } = useNextBRFNumber(societeId);
  const { data: depotsData, isLoading: depotsLoading } = useDepots({
    pageSize: 10000,
  });
  const { data: receptionsData, isLoading: brLoading } = useBonReceptionsByFrs(
    selectedFrs?.id,
  );
  const createMutation = useCreateBonRetourFournisseur();

  const depots = depotsData?.data ?? [];
  const receptions = receptionsData?.data ?? [];
  const nextNumber = nextNumberData?.data?.nextNumber;

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
            unitPrice: Number(p.unitPrice || p.selectedPrice || 0),
            remise: 0,
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
    if (!selectedDepot) {
      toast.error("Dépôt requis");
      return;
    }
    if (!selectedFrs) {
      toast.error("Fournisseur requis");
      return;
    }
    if (lines.length === 0) {
      toast.error("Ajoutez au moins un produit");
      return;
    }

    const payload = {
      frsId: selectedFrs.id,
      depotId: selectedDepot.id,
      bonReceptionId: selectedReception?.id || undefined,
      documentDate: dayjs(documentDate).startOf("day").toISOString(),
      motifRetour: motifRetour || null,
      notes: notes || null,
      status,
      lines: lines.map((l) => ({
        quantity: Number(l.quantity),
        unitPrice: Number(l.unitPrice),
        remise: Number(l.remise || 0),
        description: l.description || l.name,
        ...(l.variantId
          ? { variantId: l.variantId }
          : { articleId: l.articleId }),
      })),
    };

    try {
      await createMutation.mutateAsync(payload);
      toast.success("Bon de retour fournisseur créé");
      navigate("/bon-retour-fournisseurs");
    } catch (err) {
      toast.error(err?.response?.data?.message || "Création impossible");
    }
  };

  return (
    <div className="-m-4 lg:-m-6 px-3 pt-3">
      <div className="flex items-center gap-3 px-4 md:px-6 mt-6">
        <button
          type="button"
          onClick={() => navigate("/bon-retour-fournisseurs")}
          className="p-2 rounded-md border border-slate-200 dark:border-[#2e2e2e]"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-slate-900 dark:text-white">
            Nouveau retour fournisseur
          </h1>
        </div>
      </div>

      <FormShell wide>
      <form onSubmit={handleSubmit} className="space-y-5">
        <FormCard
          title="Informations"
          action={nextNumber ? (
            <NextNumberBadge label="Prochain N°" value={nextNumber} />
          ) : null}
        >
          <div className="space-y-5">
            <FormGroup title={tCommon("form_group_parties")}>
              <FormFieldGrid cols={3}>
                <div>
                  <label className={FORM_LABEL}>
                    Dépôt <span className="text-red-500">*</span>
                  </label>
                  <SelectDropDown
                    value={selectedDepot?.id || ""}
                    onChange={(e) => {
                      const depot = depots.find(
                        (d) => d.id === parseInt(e.target.value),
                      );
                      setSelectedDepot(depot || null);
                      setLines([]);
                    }}
                    placeholder="Sélectionner un dépôt"
                    options={depots.map((d) => ({
                      value: d.id,
                      label: d.name,
                      subLabel: d.code,
                    }))}
                    isLoading={depotsLoading}
                  />
                </div>
                <div>
                  <label className={FORM_LABEL}>
                    Fournisseur <span className="text-red-500">*</span>
                  </label>
                  <SearchableFrsSelect
                    societeId={societeId}
                    value={selectedFrs}
                    onChange={(frs) => {
                      setSelectedFrs(frs);
                      setSelectedReception(null);
                    }}
                    placeholder="Sélectionner un fournisseur"
                  />
                </div>
                <div>
                  <label className={FORM_LABEL}>Bon de réception (optionnel)</label>
                  <SelectDropDown
                    value={selectedReception?.id || ""}
                    onChange={(e) => {
                      const br = receptions.find(
                        (b) => b.id === parseInt(e.target.value),
                      );
                      setSelectedReception(br || null);
                    }}
                    placeholder={
                      selectedFrs
                        ? "Lier à un BR complété"
                        : "Choisir un fournisseur d'abord"
                    }
                    options={receptions.map((br) => ({
                      value: br.id,
                      label: br.document?.documentNumber || `BR #${br.id}`,
                    }))}
                    isLoading={brLoading}
                    disabled={!selectedFrs}
                  />
                </div>
              </FormFieldGrid>
            </FormGroup>

            <FormGroup title={tCommon("form_group_dates_status")}>
              <FormFieldGrid cols={3}>
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
                  <label className={FORM_LABEL}>Statut initial</label>
                  <select
                    className={FORM_CONTROL}
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="COMPLETED">Validé (sort le stock)</option>
                    <option value="DRAFT">Brouillon</option>
                  </select>
                </div>
                <div>
                  <label className={FORM_LABEL}>Motif retour</label>
                  <input
                    className={FORM_CONTROL}
                    value={motifRetour}
                    onChange={(e) => setMotifRetour(e.target.value)}
                    placeholder="Motif du retour…"
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
              submitLabel="Créer"
              isLoading={createMutation.isPending}
              disabled={lines.length === 0}
            />
          </div>
        </FormCard>

        <FormCard
          title="Lignes"
          action={
            <button
              type="button"
              onClick={() => {
                if (!selectedDepot) {
                  toast.error("Sélectionnez un dépôt d'abord");
                  return;
                }
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 h-9 rounded-md bg-[#B12B89] hover:bg-[#9A2478] text-white text-sm font-medium"
            >
              <Plus className="w-4 h-4" />
              Ajouter
            </button>
          }
        >

          {lines.length === 0 ? (
            <p className="text-sm text-slate-400 py-8 text-center border border-dashed rounded-lg">
              Aucun produit
            </p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase text-slate-500 border-b">
                  <th className="py-2">Produit</th>
                  <th className="py-2 w-24">Qté</th>
                  <th className="py-2 w-28">P.U. TTC</th>
                  <th className="py-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {lines.map((line) => {
                  const key = lineKey(line);
                  return (
                    <tr key={key} className="border-b border-slate-50">
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
          )}
        </FormCard>
      </form>
      </FormShell>

      <SelectBRFProductsModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onConfirm={handleConfirmProducts}
        alreadyInTable={lines}
        depotId={selectedDepot?.id}
        useProducts={useBRFProducts}
      />
    </div>
  );
};
