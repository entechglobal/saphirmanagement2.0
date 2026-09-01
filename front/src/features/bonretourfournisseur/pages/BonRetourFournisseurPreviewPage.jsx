import { Link, useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { PrintableDocumentSheet } from "../../../shared/components/PrintableDocumentSheet";
import { useBonRetourFournisseurById } from "../hooks/useBonRetourFournisseurs";

export const BonRetourFournisseurPreviewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useBonRetourFournisseurById(id);
  const brf = data?.data;
  const header = brf?.document;

  if (isLoading) {
    return (
      <div className="flex justify-center py-24 text-slate-400 gap-2">
        <Loader2 className="h-5 w-5 animate-spin" />
        Chargement…
      </div>
    );
  }

  if (isError || !brf) {
    return (
      <div className="py-10 text-center space-y-4">
        <p className="text-sm text-red-500">Document introuvable.</p>
        <button
          type="button"
          onClick={() => navigate("/bon-retour-fournisseurs")}
          className="text-sm font-semibold text-[#B12B89]"
        >
          Retour
        </button>
      </div>
    );
  }

  let infoBar = brf.depot
    ? `Dépôt: ${brf.depot.name} (${brf.depot.code})`
    : "";
  if (brf.bonReception?.document?.documentNumber) {
    infoBar += `${infoBar ? "  |  " : ""}BR: ${brf.bonReception.document.documentNumber}`;
  }
  if (brf.motifRetour) {
    infoBar += `${infoBar ? "  |  " : ""}Motif: ${brf.motifRetour}`;
  }

  return (
    <div className="space-y-4 pb-10">
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/bon-retour-fournisseurs")}
            className="rounded-xl border p-2"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold">
              Aperçu — Bon de retour fournisseur
            </h1>
            <p className="font-mono text-xs text-slate-500">
              {header?.documentNumber}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          {header?.status === "DRAFT" && (
            <Link
              to={`/bon-retour-fournisseurs/${id}/edit`}
              className="rounded-xl border px-4 py-2.5 text-sm font-semibold"
            >
              Modifier
            </Link>
          )}
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#B12B89] px-5 py-2.5 text-sm font-semibold text-white"
          >
            <Printer className="h-4 w-4" />
            Imprimer
          </button>
        </div>
      </div>

      <div className="rounded-2xl border bg-slate-100/80 p-4 print:border-0 print:bg-transparent print:p-0">
        <PrintableDocumentSheet
          title="BON DE RETOUR FOURNISSEUR"
          documentNumber={header?.documentNumber}
          documentDate={brf.documentDate}
          subLine={`N°: ${header?.documentNumber || "—"}  |  Date: ${
            brf.documentDate
              ? dayjs(brf.documentDate).format("DD/MM/YYYY")
              : "—"
          }`}
          infoBar={infoBar || "Retour fournisseur"}
          societe={header?.societe}
          client={header?.fournisseur}
          clientLabel="FOURNISSEUR"
          lines={header?.lines || []}
          hidePrices={false}
          notes={header?.notes}
          signatureLeft="Responsable retour"
          signatureRight="Signature fournisseur"
        />
      </div>
    </div>
  );
};
