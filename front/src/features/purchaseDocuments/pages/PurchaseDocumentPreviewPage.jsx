import { useMemo } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import dayjs from "dayjs";
import { ArrowLeft, Loader2, Printer } from "lucide-react";
import { PrintableDocumentSheet } from "../../../shared/components/PrintableDocumentSheet";
import { createPurchaseDocumentHooks } from "../hooks/usePurchaseDocuments";

export const PurchaseDocumentPreviewPage = ({ config }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const hooks = useMemo(() => createPurchaseDocumentHooks(config), [config]);
  const { useById } = hooks;
  const { data, isLoading, isError } = useById(id);

  const doc = data?.data;
  const header = doc?.document;

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

  const fournisseur = header?.fournisseur || null;
  const subLine = `N°: ${header?.documentNumber || "—"}  |  Date: ${
    doc.documentDate ? dayjs(doc.documentDate).format("DD/MM/YYYY") : "—"
  }`;

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
          title="BON DE COMMANDE FOURNISSEUR"
          documentNumber={header?.documentNumber}
          documentDate={doc.documentDate}
          subLine={subLine}
          infoBar="Demande de prix — quantités uniquement (sans montants HT / TVA / TTC)"
          societe={header?.societe}
          client={fournisseur}
          clientLabel="FOURNISSEUR"
          lines={header?.lines || []}
          hidePrices={config.hidePrices}
          notes={header?.notes}
          signatureLeft="Signature"
          signatureRight="Signature fournisseur"
        />
      </div>
    </div>
  );
};
