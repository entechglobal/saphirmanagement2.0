import { Plus } from "lucide-react";

/**
 * Page header for list pages.
 * Optional `onCreate` renders a primary "+ …" button aligned to the right of the title.
 * `actions` can still be used for extra controls (rendered after Create).
 */
export const HeaderTable = ({
  title,
  subtitle,
  count,
  onCreate,
  createLabel = "Nouveau",
  actions,
  className = "",
}) => {
  const hasRight = onCreate || actions;

  return (
    <div
      className={`mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-3 ${className}`}
    >
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
          {actions}
        </div>
      )}
    </div>
  );
};
