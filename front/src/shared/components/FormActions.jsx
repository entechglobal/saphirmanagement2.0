import { useState, useLayoutEffect, useRef, useId } from "react";
import { createPortal } from "react-dom";
import { CircularProgress } from "@mui/material";

const SLOT_ID = "form-actions-slot";

function useFormActionsSlot() {
  const [slot, setSlot] = useState(() =>
    typeof document !== "undefined" ? document.getElementById(SLOT_ID) : null
  );

  useLayoutEffect(() => {
    const el = document.getElementById(SLOT_ID);
    if (el !== slot) setSlot(el);
  }, [slot]);

  return slot;
}

/** Pins children to the layout action bar (bottom-left). Use placement="inline" in modals. */
export const FormActionBar = ({ children, placement = "fixed", className = "" }) => {
  const slot = useFormActionsSlot();
  const bar = (
    <div className={`flex w-full items-center justify-end gap-2.5 ${className}`}>
      {children}
    </div>
  );

  if (placement === "fixed" && slot) {
    return (
      <>
        <div className="h-20 w-full shrink-0" aria-hidden="true" />
        {createPortal(bar, slot)}
      </>
    );
  }
  return bar;
};

/**
 * Form actions. Default: pinned to the bottom-left of the page.
 * Use placement="inline" inside modals.
 */
export const FormActions = ({
  onCancel,
  cancelLabel = "Annuler",
  submitLabel = "Créer",
  isLoading = false,
  disabled = false,
  submitType = "submit",
  onSubmit,
  extra,
  bordered = true,
  placement = "fixed",
  className = "",
}) => {
  const isFixed = placement === "fixed";
  const slot = useFormActionsSlot();
  const anchorRef = useRef(null);
  const reactId = useId();
  const [formId, setFormId] = useState(null);

  useLayoutEffect(() => {
    if (!isFixed) return;
    const form = anchorRef.current?.closest("form");
    if (!form) return;
    if (!form.id) {
      form.id = `form-${reactId.replace(/:/g, "")}`;
    }
    setFormId(form.id);
  }, [isFixed, reactId]);

  const bar = (
    <div
      className={`flex w-full items-center justify-end gap-2.5 ${
        !isFixed && bordered
          ? "mt-2 pt-5 border-t border-slate-200 dark:border-[#2e2e2e]"
          : ""
      } ${className}`}
    >
      {extra ? <div className="me-auto">{extra}</div> : null}
      {onCancel && (
        <button
          type="button"
          onClick={onCancel}
          disabled={isLoading}
          className="px-4 h-10 rounded-md border border-slate-300 dark:border-[#2e2e2e] text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#222222] transition-colors disabled:opacity-50"
        >
          {cancelLabel}
        </button>
      )}
      <button
        type={submitType}
        form={isFixed && submitType === "submit" ? formId || undefined : undefined}
        onClick={onSubmit}
        disabled={isLoading || disabled}
        className="inline-flex items-center justify-center gap-2 px-5 h-10 rounded-md bg-[#B12B89] hover:bg-[#9A2478] disabled:opacity-50 text-white text-sm font-medium transition-colors"
      >
        {isLoading && <CircularProgress size={16} color="inherit" />}
        {submitLabel}
      </button>
    </div>
  );

  return (
    <>
      {isFixed ? (
        <div ref={anchorRef} className="h-20 w-full shrink-0" aria-hidden="true" />
      ) : null}
      {isFixed && slot ? createPortal(bar, slot) : bar}
    </>
  );
};
