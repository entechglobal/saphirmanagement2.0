import { Link, useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { useBonReceptionById } from "../hooks/useBonReceptions";
import { PrintableDocumentSheet } from "../../../shared/components/PrintableDocumentSheet";

export const BonReceptionPreviewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useBonReceptionById(id);
  const br = data?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        Chargement de l’aperçu…
      </div>
    );
  }

  if (isError || !br) {
    return (
      <div className="space-y-4 py-10 text-center">
        <p className="text-sm text-red-500">Bon de réception introuvable.</p>
        <button
          type="button"
          onClick={() => navigate("/bon-receptions")}
          className="text-sm font-semibold text-[#B12B89] hover:underline"
        >
          Retour à la liste
        </button>
      </div>
    );
  }

  const header = br.document;
  const fournisseur = header?.fournisseur;

  const lines = (header?.lines || []).map((line) => ({
    ...line,
    remise: line.remise ?? line.discount ?? 0,
  }));

  let infoBar = br.depot
    ? `Dépôt: ${br.depot.name}${br.depot.code ? ` (${br.depot.code})` : ""}`
    : "";

  let subLine = `N°: ${header?.documentNumber || "—"}  |  Réf: ${br.documentReference || "—"}  |  Date: ${
    br.documentDate ? dayjs(br.documentDate).format("DD/MM/YYYY") : "—"
  }`;
  if (br.dateReception) {
    subLine += `  |  Date réception: ${dayjs(br.dateReception).format("DD/MM/YYYY")}`;
  }

  return (
    <div className="space-y-4 pb-10">
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/bon-receptions")}
            className="rounded-xl border border-slate-200 p-2 hover:bg-slate-50 dark:border-[#2e2e2e] dark:hover:bg-[#222222]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              Aperçu — Bon de réception
            </h1>
            <p className="font-mono text-xs text-slate-500">
              {header?.documentNumber}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/bon-receptions/${id}/edit`}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold dark:border-[#2e2e2e]"
          >
            Modifier
          </Link>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-xl bg-[#B12B89] px-5 py-2.5 text-sm font-semibold text-white hover:bg-[#B05596]"
          >
            <Printer className="h-4 w-4" />
            Imprimer
          </button>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-100/80 p-4 dark:border-[#2e2e2e] dark:bg-[#1c1c1c]/40 print:border-0 print:bg-transparent print:p-0">
        <PrintableDocumentSheet
          title="BON DE RÉCEPTION"
          documentNumber={header?.documentNumber}
          documentDate={br.documentDate}
          subLine={subLine}
          infoBar={infoBar || null}
          societe={header?.societe}
          client={fournisseur}
          clientLabel="FOURNISSEUR"
          lines={lines}
          hidePrices={false}
          notes={header?.notes}
          signatureLeft="Responsable réception"
          signatureRight="Signature du fournisseur"
        />
      </div>
    </div>
  );
};
