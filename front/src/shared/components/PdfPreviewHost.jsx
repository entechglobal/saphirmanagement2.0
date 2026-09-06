import { useRef } from "react";
import { Download, Printer } from "lucide-react";
import { BaseModal } from "./BaseModal";
import { usePdfPreviewStore } from "../utils/pdfPreviewStore";

export const PdfPreviewHost = () => {
  const iframeRef = useRef(null);
  const { open, blobUrl, filename, title, closePreview } = usePdfPreviewStore();

  const handleDownload = () => {
    if (!blobUrl) return;
    const a = document.createElement("a");
    a.href = blobUrl;
    a.download = filename || "document.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handlePrint = () => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    try {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    } catch {
      // Fallback: open in new tab for print
      window.open(blobUrl, "_blank");
    }
  };

  return (
    <BaseModal
      isOpen={open}
      onClose={closePreview}
      title={title}
      subtitle={filename}
      icon={<Printer className="w-5 h-5 text-[#B12B89]" />}
      iconBg="bg-blue-50 dark:bg-blue-900/20"
      maxWidth="max-w-5xl"
      zIndex="z-[10000]"
      bodyClassName="flex flex-col p-0 min-h-0 overflow-hidden"
      footer={
        <div className="flex items-center justify-between w-full gap-3">
          <button
            type="button"
            onClick={closePreview}
            className="px-4 py-2.5 border border-slate-200 dark:border-[#2e2e2e] rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300"
          >
            Fermer
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center gap-2 px-4 py-2.5 border border-slate-200 dark:border-[#2e2e2e] rounded-xl text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#222222]"
            >
              <Download className="w-4 h-4" />
              Télécharger
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#B12B89] hover:bg-[#B05596] text-white rounded-xl text-sm font-semibold"
            >
              <Printer className="w-4 h-4" />
              Imprimer
            </button>
          </div>
        </div>
      }
    >
      <div className="h-[min(75vh,720px)] w-full bg-slate-100 dark:bg-[#111111]">
        {blobUrl ? (
          <iframe
            ref={iframeRef}
            title={title}
            src={blobUrl}
            className="h-full w-full border-0"
          />
        ) : null}
      </div>
    </BaseModal>
  );
};
