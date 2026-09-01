import { Link, useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { useBonRetourClientById } from "../hooks/useBonRetourClients";
import { PrintableDocumentSheet } from "../../../shared/components/PrintableDocumentSheet";

const mapPackLineToSheetLine = (packLine, index, startLineNumber) => {
  const unitPrice = Number(packLine.prixVente ?? packLine.pack?.prixVentePack ?? 0);
  const quantity = Number(packLine.quantity ?? 0);
  const totalHT = Number(packLine.totalHT ?? unitPrice * quantity);

  return {
    id: `pack-${packLine.id ?? index}`,
    lineNumber: startLineNumber + index,
    description: `Pack: ${packLine.pack?.name ?? "—"}`,
    quantity,
    unitPrice,
    remise: packLine.remise ?? 0,
    totalHT,
    totalTVA: Number(packLine.totalTVA ?? 0),
    totalTTC: Number(packLine.totalTTC ?? totalHT),
    article: { unitePrincipale: { symbol: "U" } },
  };
};

export const BonRetourClientPreviewPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data, isLoading, isError } = useBonRetourClientById(id);
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
        <p className="text-sm text-red-500">Bon de retour client introuvable.</p>
        <button
          type="button"
          onClick={() => navigate("/bon-retour-clients")}
          className="text-sm font-semibold text-[#B12B89] hover:underline"
        >
          Retour à la liste
        </button>
      </div>
    );
  }

  const header = br.document;
  const client =
    header?.client ||
    (header?.clientName ? { name: header.clientName } : null);

  const articleLines = header?.lines || [];
  const packLines = (br.packLines || []).map((line, index) =>
    mapPackLineToSheetLine(line, index, articleLines.length + 1),
  );
  const lines = [...articleLines, ...packLines];

  let infoBar = br.depot
    ? `Dépôt: ${br.depot.name}${br.depot.code ? ` (${br.depot.code})` : ""}`
    : "";
  if (br.bonLivraison?.document?.documentNumber) {
    infoBar += `  |  BL d'origine: ${br.bonLivraison.document.documentNumber}`;
  }
  if (br.motifRetour) infoBar += `  |  Motif: ${br.motifRetour}`;

  let subLine = `N°: ${header?.documentNumber || "—"}  |  Date: ${
    br.documentDate ? dayjs(br.documentDate).format("DD/MM/YYYY") : "—"
  }`;
  if (br.dateRetour) {
    subLine += `  |  Date retour: ${dayjs(br.dateRetour).format("DD/MM/YYYY")}`;
  }

  return (
    <div className="space-y-4 pb-10">
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/bon-retour-clients")}
            className="rounded-xl border border-slate-200 p-2 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              Aperçu — Bon de retour client
            </h1>
            <p className="font-mono text-xs text-slate-500">
              {header?.documentNumber}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/bon-retour-clients/${id}/edit`}
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold dark:border-slate-700"
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

      <div className="rounded-2xl border border-slate-200 bg-slate-100/80 p-4 dark:border-slate-800 dark:bg-slate-900/40 print:border-0 print:bg-transparent print:p-0">
        <PrintableDocumentSheet
          title="BON DE RETOUR CLIENT"
          documentNumber={header?.documentNumber}
          documentDate={br.documentDate}
          subLine={subLine}
          infoBar={infoBar || null}
          societe={header?.societe}
          client={client}
          clientLabel="CLIENT"
          lines={lines}
          hidePrices={false}
          notes={header?.notes}
          signatureLeft="Responsable retour"
          signatureRight="Signature du client"
        />
      </div>
    </div>
  );
};
