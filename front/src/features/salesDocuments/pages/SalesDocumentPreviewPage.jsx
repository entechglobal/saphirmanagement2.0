import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { PrintableDocumentSheet } from "../../../shared/components/PrintableDocumentSheet";
import { createSalesDocumentHooks } from "../hooks/useSalesDocuments";

const DOC_META = {
  commande: {
    title: "BON DE COMMANDE",
    clientLabel: "CLIENT / DESTINATAIRE",
    infoBar: "Demande de prix — quantités uniquement (sans montants HT / TVA / TTC)",
    signatureLeft: "Signature",
    signatureRight: "Signature client",
  },
  devis: {
    title: "DEVIS",
    clientLabel: "CLIENT",
    signatureLeft: "Signature société",
    signatureRight: "Signature client",
  },
  facture: {
    title: "FACTURE",
    clientLabel: "CLIENT",
    signatureLeft: "Signature société",
    signatureRight: "Signature client",
  },
};

export const SalesDocumentPreviewPage = ({ config }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const hooks = useMemo(() => createSalesDocumentHooks(config), [config]);
  const { useById } = hooks;
  const { data, isLoading, isError } = useById(id);
  const meta = DOC_META[config.key] || DOC_META.devis;

  const doc = data?.data;
  const header = doc?.document;

  const infoBar = (() => {
    if (config.key === "commande") return meta.infoBar;
    if (config.key === "devis" && doc?.paymentMethod) {
      return `Mode de paiement: ${doc.paymentMethod}`;
    }
    if (config.key === "facture") {
      let text = doc?.paymentMethod
        ? `Mode de paiement: ${doc.paymentMethod}`
        : "Facture";
      const blNum = doc?.bonLivraison?.document?.documentNumber;
      if (blNum) text += `  |  BL: ${blNum}`;
      return text;
    }
    return null;
  })();

  const subLine = (() => {
    if (!doc) return "";
    let line = `N°: ${header?.documentNumber || "—"}  |  Date: ${
      doc.documentDate ? dayjs(doc.documentDate).format("DD/MM/YYYY") : "—"
    }`;
    if (config.key === "devis" && doc.validUntil) {
      line += `  |  Validité: ${dayjs(doc.validUntil).format("DD/MM/YYYY")}`;
    }
    if (config.key === "facture" && doc.dateEcheance) {
      line += `  |  Échéance: ${dayjs(doc.dateEcheance).format("DD/MM/YYYY")}`;
    }
    return line;
  })();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center gap-2 py-24 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        Chargement de l’aperçu…
      </div>
    );
  }

  if (isError || !doc) {
    return (
      <div className="space-y-4 py-10 text-center">
        <p className="text-sm text-red-500">Document introuvable.</p>
        <button
          type="button"
          onClick={() => navigate(config.path)}
          className="text-sm font-semibold text-[#B12B89] hover:underline"
        >
          Retour à la liste
        </button>
      </div>
    );
  }

  const client =
    header?.client ||
    (header?.clientName ? { name: header.clientName } : null);

  return (
    <div className="space-y-4 pb-10">
      <div className="print:hidden flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(config.path)}
            className="rounded-xl border border-slate-200 p-2 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-slate-900 dark:text-white">
              Aperçu — {config.singular}
            </h1>
            <p className="font-mono text-xs text-slate-500">
              {header?.documentNumber}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {config.editable !== false && (
            <Link
              to={`${config.path}/${id}/edit`}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold dark:border-slate-700"
            >
              Modifier
            </Link>
          )}
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
          title={meta.title}
          documentNumber={header?.documentNumber}
          documentDate={doc.documentDate}
          subLine={subLine}
          infoBar={infoBar}
          societe={header?.societe}
          client={client}
          clientLabel={meta.clientLabel}
          lines={header?.lines || []}
          hidePrices={config.hidePrices}
          notes={header?.notes}
          signatureLeft={meta.signatureLeft}
          signatureRight={meta.signatureRight}
        />
      </div>
    </div>
  );
};
