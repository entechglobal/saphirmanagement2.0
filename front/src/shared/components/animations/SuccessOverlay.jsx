import Lottie from "lottie-react";
import { CheckCircle2 } from "lucide-react";
import successAnimationData from "./Success.json"; // put Success.json next to this file

const BRAND = "#B12B89";

export const SuccessOverlay = ({ onClose }) => (
  <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50 p-4">
    <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl flex flex-col items-center px-12 py-14 max-w-sm w-full">
      <Lottie
        animationData={successAnimationData}
        loop={false}
        className="w-36 h-36"
        onComplete={() => setTimeout(onClose, 600)}
      />
      <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 mt-4">
        Commande créée !
      </h2>
      <p className="text-sm text-slate-400 mt-1 text-center">
        La commande a été enregistrée avec succès.
      </p>
      {/* <button
        type="button"
        onClick={onClose}
        className="mt-8 flex items-center gap-2 px-7 py-3 rounded-2xl text-sm font-bold text-white transition shadow-lg shadow-[#B12B89]/30 dark:shadow-none"
        style={{ backgroundColor: BRAND }}
      >
        <CheckCircle2 size={16} /> Voir les commandes
      </button> */}
    </div>
  </div>
);