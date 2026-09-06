import { Plus, ArrowLeft, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * Shared page header for list pages and create/edit/view pages.
 */
export const HeaderTable = ({
  title,
  subtitle,
  count,
  icon,
  onCreate,
  createLabel = "Nouveau",
  actions,
  rightContent,
  onBack,
  backPath,
  backLabel = "Back",
  className = "",
}) => {
  const navigate = useNavigate();
  const showBack = typeof onBack === "function" || !!backPath;
  const handleBack = onBack ?? (() => navigate(backPath || -1));
  const right = rightContent ?? actions;
  const hasRight = onCreate || right;

  return (
    <div
      className={`mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 ${className}`}
    >
      <div className="flex min-w-0 items-center gap-2">
        {showBack && (
          <button
            type="button"
            onClick={handleBack}
            aria-label={backLabel}
            className="inline-flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-800 dark:text-slate-400 dark:hover:bg-[#222222] dark:hover:text-slate-100"
          >
            <ArrowLeft className="h-4 w-4 rtl:hidden" />
            <ArrowRight className="h-4 w-4 ltr:hidden" />
          </button>
        )}

        {icon ? <span className="flex-shrink-0">{icon}</span> : null}

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1 className="truncate text-[22px] font-bold leading-8 tracking-[-0.02em] text-slate-900 dark:text-slate-50 md:text-[25px]">
              {title}
            </h1>

            {count !== undefined && count !== null && (
              <span className="flex-shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-slate-600 dark:bg-[#1c1c1c] dark:text-slate-300">
                {count}
              </span>
            )}
          </div>

          {subtitle && (
            <p className="mt-0.5 truncate text-[13px] leading-5 text-slate-500 dark:text-slate-400">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {hasRight && (
        <div className="flex flex-shrink-0 flex-wrap items-center gap-2">
          {onCreate && (
            <button
              type="button"
              onClick={onCreate}
              className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#B12B89] px-3.5 text-[13px] font-semibold text-white shadow-[0_1px_2px_rgba(16,24,40,0.06)] transition-all hover:brightness-110 active:scale-[0.98]"
            >
              <Plus className="h-4 w-4" strokeWidth={2.25} />
              {createLabel}
            </button>
          )}
          {right}
        </div>
      )}
    </div>
  );
};

const getValue = (obj, path) =>
  path?.split(".").reduce((acc, key) => acc?.[key], obj);

/**
 * Create / edit / view header — same design as HeaderTable.
 * Resolves the title from form mode, then renders HeaderTable.
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
  viewTitleMain = "Detailed View",
  editTitleKey = "name",
  backLabel = "Back",
  rightContent = null,
  actions,
  subtitle = null,
  count,
  icon,
  className = "",
}) {
  const title = isEdit
    ? editTitle || getValue(data, editTitleKey) || "..."
    : isView
      ? viewTitleMain || "..."
      : createTitle;

  const resolvedSubtitle =
    subtitle ??
    ((isEdit || isView) && data?.id
      ? `ID: #${data.id}`
      : !isEdit && !isView && createLabel
        ? entityName
        : null);

  return (
    <HeaderTable
      title={title}
      subtitle={resolvedSubtitle}
      count={count}
      icon={icon}
      onBack={onBack}
      backPath={backPath}
      backLabel={backLabel}
      actions={rightContent ?? actions}
      className={className}
    />
  );
}
