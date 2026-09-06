import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * Unified modal shell for all modals in the app.
 *
 * Props:
 *   isOpen            – boolean (default true; return null when false)
 *   onClose           – close handler
 *   disableClose      – disables backdrop click + X button (e.g. during loading)
 *   title             – header title text
 *   subtitle          – header subtitle text
 *   subtitleUppercase – render subtitle in uppercase tracking style
 *   icon              – JSX icon element (wrapped in icon container)
 *   iconBg            – Tailwind bg classes for icon container
 *   headerLeft        – JSX inserted left of the icon (e.g. back button)
 *   subHeader         – JSX rendered between header bar and scrollable body (e.g. step indicators)
 *   footer            – JSX rendered in the footer bar
 *   maxWidth          – Tailwind max-w class (default "max-w-lg")
 *   zIndex            – Tailwind z-index class (default "z-50")
 *   bodyClassName     – class overrides for the scrollable body wrapper
 *   children          – body content
 */
export const BaseModal = ({
  isOpen = true,
  onClose,
  disableClose = false,
  title,
  subtitle,
  subtitleUppercase = false,
  icon,
  iconBg = "bg-slate-100 dark:bg-[#222222]",
  headerLeft,
  subHeader,
  footer,
  maxWidth = "max-w-lg",
  zIndex = "z-50",
  bodyClassName = "flex-1 overflow-y-auto p-6",
  children,
}) => {
  if (!isOpen) return null;

  return createPortal(
    <div
      className={`fixed inset-0 ${zIndex} modal-backdrop flex items-center justify-center p-4`}
      onClick={!disableClose ? onClose : undefined}
    >
      <div
        className={`bg-white dark:bg-[#1c1c1c] rounded-xl border border-slate-200 dark:border-[#2e2e2e] shadow-2xl w-full ${maxWidth} flex flex-col max-h-[92vh] modal-panel`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-[#2e2e2e] flex-shrink-0">
          <div className="flex items-center gap-3">
            {headerLeft}
            {icon && (
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 ${iconBg}`}
              >
                {icon}
              </div>
            )}
            <div>
              {title && (
                <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
                  {title}
                </h2>
              )}
              {subtitle && (
                <p
                  className={`text-[11px] mt-0.5 font-semibold text-slate-400 ${
                    subtitleUppercase ? "uppercase tracking-wider" : ""
                  }`}
                >
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={disableClose}
            className="p-2 ml-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-[#222222] rounded-lg transition-colors disabled:opacity-50 flex-shrink-0"
          >
            <X size={18} />
          </button>
        </div>

        {/* Sub-header (step indicators, tabs, etc.) */}
        {subHeader && (
          <div className="px-6 pt-4 flex-shrink-0">{subHeader}</div>
        )}

        {/* Body */}
        <div className={bodyClassName}>{children}</div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-slate-200 dark:border-[#2e2e2e] flex-shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
};
