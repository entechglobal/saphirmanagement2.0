import { FilePlus2, Truck } from "lucide-react";
import { BaseModal } from "../../../shared/components/BaseModal";

export const FactureCreateModeModal = ({ isOpen, onClose, onChooseBlank, onChooseFromBl }) => {
  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title="Nouvelle facture"
      subtitle="Comment souhaitez-vous créer la facture ?"
      icon={<FilePlus2 className="w-5 h-5 text-[#B12B89]" />}
      iconBg="bg-blue-50 dark:bg-blue-900/20"
      maxWidth="max-w-lg"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-semibold text-slate-600 dark:text-slate-300"
        >
          Annuler
        </button>
      }
    >
      <div className="grid gap-3">
        <button
          type="button"
          onClick={onChooseBlank}
          className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-left hover:border-[#B12B89] hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-800">
            <FilePlus2 className="w-5 h-5 text-slate-600 dark:text-slate-300" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Facture libre
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Créer une facture en sélectionnant client et produits manuellement.
            </p>
          </div>
        </button>

        <button
          type="button"
          onClick={onChooseFromBl}
          className="flex items-start gap-3 rounded-xl border border-slate-200 dark:border-slate-700 p-4 text-left hover:border-[#B12B89] hover:bg-blue-50/50 dark:hover:bg-blue-950/20 transition"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 dark:bg-emerald-900/30">
            <Truck className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
              À partir d’un bon de livraison
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Reprendre client, lignes et montants d’un BL — la facture sera liée à
              ce BL.
            </p>
          </div>
        </button>
      </div>
    </BaseModal>
  );
};
