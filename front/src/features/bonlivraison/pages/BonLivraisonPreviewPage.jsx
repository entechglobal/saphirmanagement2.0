import { Link, useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { useBonLivraisonById } from "../hooks/useBonLivraisons";
import { PrintableDocumentSheet } from "../../../shared/components/PrintableDocumentSheet";

export const BonLivraisonPreviewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useBonLivraisonById(id);
  const bl = data?.data;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        Chargement de l’aperçu…
      </div>
    );
  }

  if (isError || !bl) {
    return (
      <div className="space-y-4 py-10 text-center">
        <p className="text-sm text-red-500">Bon de livraison introuvable.</p>
        <button
          type="button"
          onClick={() => navigate("/bon-livraisons")}
          className="text-sm font-semibold text-[#B12B89] hover:underline"
        >
          Retour à la liste
        </button>
      </div>
    );
  }

  const header = bl.document;
  const client =
    header?.client ||
    (header?.clientName ? { name: header.clientName } : null);

  let infoBar = bl.depot
    ? `Dépôt: ${bl.depot.name}${bl.depot.code ? ` (${bl.depot.code})` : ""}`
    : "";
  if (bl.delivery?.name) infoBar += `  |  Livreur: ${bl.delivery.name}`;

  let subLine = `N°: ${header?.documentNumber || "—"}  |  Date: ${
    bl.documentDate ? dayjs(bl.documentDate).format("DD/MM/YYYY") : "—"
  }`;
  if (bl.dateLivraison) {
    subLine += `  |  Livraison: ${dayjs(bl.dateLivraison).format("DD/MM/YYYY")}`;
  }

  return (
    <div className="space-y-4 pb-10">
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/bon-livraisons")}
            className="rounded-xl border border-slate-200 p-2 hover:bg-slate-50 dark:border-[#2e2e2e] dark:hover:bg-[#222222]"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              Aperçu — Bon de livraison
            </h1>
            <p className="font-mono text-xs text-slate-500">
              {header?.documentNumber}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/bon-livraisons/${id}/edit`}
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
          title="BON DE LIVRAISON"
          documentNumber={header?.documentNumber}
          documentDate={bl.documentDate}
          subLine={subLine}
          infoBar={infoBar || null}
          societe={header?.societe}
          client={client}
          clientLabel="DESTINATAIRE / CLIENT"
          lines={header?.lines || []}
          hidePrices={false}
          notes={header?.notes}
          signatureLeft="Signature du livreur"
          signatureRight="Signature du client"
        />
      </div>
    </div>
  );
};
