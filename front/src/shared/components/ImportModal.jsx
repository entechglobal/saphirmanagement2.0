import { useState } from "react";
import { UploadCloud, FileCheck2, X, Loader2 } from "lucide-react";
import { BaseModal } from "./BaseModal";
import { SelectDropDown } from "./SelectDropDown";

export const ImportModal = ({
  isOpen,
  onClose,
  onSubmit,        // (file: File, societeId: number) => void
  societes = [],   // [{ label: string, value: number }]
  isLoading = false,
  title = "Importer",
  societeLabel = "Société",
  cancelText = "Annuler",
  submitText = "Importer",
  importingText = "Importation...",
}) => {
  const [selectedSocieteId, setSelectedSocieteId] = useState(null);
  const [importFile, setImportFile] = useState(null);

  const handleClose = () => {
    setSelectedSocieteId(null);
    setImportFile(null);
    onClose();
  };

  const handleSubmit = () => {
    if (!selectedSocieteId || !importFile || isLoading) return;
    onSubmit(importFile, selectedSocieteId);
  };

  const canSubmit = !!selectedSocieteId && !!importFile && !isLoading;

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={handleClose}
      disableClose={isLoading}
      title={title}
      subtitle="CSV · XLSX"
      icon={<UploadCloud size={18} className="text-[#B12B89]" />}
      iconBg="bg-blue-50 dark:bg-blue-900/30"
      maxWidth="max-w-md"
      zIndex="z-[9999]"
      footer={
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleClose}
            disabled={isLoading}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 dark:border-[#2e2e2e] text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#222222] transition disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#B12B89] hover:bg-[#B05596] text-sm font-bold text-white transition shadow-lg shadow-[#B12B89]/30 dark:shadow-none disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                {importingText}
              </>
            ) : (
              <>
                <UploadCloud size={15} />
                {submitText}
              </>
            )}
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        {/* Societe selector */}
        <SelectDropDown
          label={societeLabel}
          value={selectedSocieteId || ""}
          onChange={(e) =>
            setSelectedSocieteId(e.target.value ? Number(e.target.value) : null)
          }
          options={societes}
          required
        />

        {/* File drop zone */}
        <div>
          <label
            className={`flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all ${
              importFile
                ? "border-blue-400 bg-blue-50/50 dark:bg-blue-900/10"
                : "border-slate-200 dark:border-[#2e2e2e] hover:border-blue-400 hover:bg-blue-50/40 dark:hover:bg-blue-900/10"
            }`}
          >
            {importFile ? (
              <div className="flex flex-col items-center gap-2 px-4 text-center">
                <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                  <FileCheck2 size={18} className="text-[#B12B89]" />
                </div>
                <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate max-w-[220px]">
                  {importFile.name}
                </span>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    setImportFile(null);
                  }}
                  className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-red-500 transition-colors"
                >
                  <X size={11} /> Supprimer
                </button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2 text-slate-400">
                <div className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-[#222222] flex items-center justify-center">
                  <UploadCloud size={18} className="text-slate-400" />
                </div>
                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                  Glissez un fichier ou{" "}
                  <span className="text-[#B12B89]">parcourez</span>
                </span>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  CSV · XLSX
                </span>
              </div>
            )}
            <input
              type="file"
              accept=".csv,.xlsx"
              className="hidden"
              onChange={(e) => setImportFile(e.target.files[0] ?? null)}
            />
          </label>
        </div>
      </div>
    </BaseModal>
  );
};
