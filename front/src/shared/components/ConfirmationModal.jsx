import React from "react";
import { AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";
import { BaseModal } from "./BaseModal";

export const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Are you sure?",
  message = "This action cannot be undone.",
  confirmText = "Confirm",
  cancelText = "Cancel",
  isLoading = false,
  variant = "danger",
}) => {
  const isDanger = variant === "danger";

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      disableClose={isLoading}
      title={title}
      subtitle="Confirmation requise"
      subtitleUppercase
      icon={
        isDanger ? (
          <AlertTriangle size={18} className="text-red-500" />
        ) : (
          <CheckCircle2 size={18} className="text-[#B12B89]" />
        )
      }
      iconBg={
        isDanger
          ? "bg-red-50 dark:bg-red-900/20"
          : "bg-blue-50 dark:bg-blue-900/20"
      }
      maxWidth="max-w-md"
      zIndex="z-[9999]"
      footer={
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isLoading}
            className="px-6 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition disabled:opacity-50"
          >
            {cancelText}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className={`flex items-center gap-2 px-7 py-2.5 rounded-xl text-sm font-bold text-white transition shadow-lg disabled:opacity-50 disabled:cursor-not-allowed ${
              isDanger
                ? "bg-red-600 hover:bg-red-700 shadow-red-200 dark:shadow-none"
                : "bg-[#B12B89] hover:bg-[#B05596] shadow-[#B12B89]/30 dark:shadow-none"
            }`}
          >
            {isLoading ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Chargement...
              </>
            ) : (
              confirmText
            )}
          </button>
        </div>
      }
    >
      <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
        {message}
      </p>
    </BaseModal>
  );
};
