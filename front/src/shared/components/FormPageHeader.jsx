import { useNavigate } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";

/**
 * Compact devis-style page header: back button + title (+ optional subtitle).
 */
export function FormPageHeader({
  entityName,
  backPath = "/",
  onBack = null,
  isEdit = false,
  isView = false,
  data = null,
  createTitle = "Create",
  editTitle = "Edit",
  createLabel = null,
  editLabel = null,
  viewTitle = "View",
  viewTitleMain = "Detailed View",
  editTitleKey = "name",
  backLabel = "Back",
  rightContent = null,
  subtitle = null,
}) {
  const navigate = useNavigate();
  const handleBack = onBack ?? (() => navigate(backPath));
  const getValue = (obj, path) =>
    path?.split(".").reduce((acc, key) => acc?.[key], obj);

  const title = isEdit
    ? editTitle || getValue(data, editTitleKey) || "..."
    : isView
      ? viewTitleMain || "..."
      : createTitle;

  const resolvedSubtitle =
    subtitle ??
    ((isEdit || isView) && data?.id ? `ID: #${data.id}` : null);

  return (
    <div className="flex items-center gap-3 pt-4 mb-6">
      <button
        type="button"
        onClick={handleBack}
        aria-label={backLabel}
        className="p-2 rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 transition-colors"
      >
        <ArrowLeft className="w-4 h-4 rtl:hidden" />
        <ArrowRight className="w-4 h-4 ltr:hidden" />
      </button>

      <div className="min-w-0 flex-1">
        <h1 className="text-xl font-bold text-slate-900 dark:text-white truncate">
          {title}
        </h1>
        {resolvedSubtitle && (
          <p className="text-xs text-slate-500 font-mono mt-0.5 truncate">
            {resolvedSubtitle}
          </p>
        )}
        {!resolvedSubtitle && entityName && !isEdit && !isView && createLabel && (
          <p className="text-xs text-slate-500 mt-0.5 truncate">{entityName}</p>
        )}
      </div>

      {rightContent ? <div className="shrink-0">{rightContent}</div> : null}
    </div>
  );
}
