import React from "react";

export const OrderSection = ({ title, children, action }) => (
  <section>
    <div className="flex items-center justify-between gap-3 mb-2">
      <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
      {action}
    </div>
    <hr className="border-0 border-t border-slate-200 dark:border-[#2e2e2e] mb-4" />
    {children}
  </section>
);

export const FactureToggle = ({ value, onChange, withLabel, withoutLabel }) => (
  <div className="inline-flex rounded-lg border border-slate-200 dark:border-[#2e2e2e] p-0.5 bg-slate-50 dark:bg-[#222222]/60">
    <button
      type="button"
      onClick={() => onChange(false)}
      className={`px-3 h-8 rounded-md text-xs font-semibold transition-colors ${
        !value
          ? "bg-white dark:bg-[#2e2e2e] text-slate-800 dark:text-slate-100 shadow-sm"
          : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
      }`}
    >
      {withoutLabel}
    </button>
    <button
      type="button"
      onClick={() => onChange(true)}
      className={`px-3 h-8 rounded-md text-xs font-semibold transition-colors ${
        value
          ? "bg-[#B12B89] text-white shadow-sm"
          : "text-slate-500 dark:text-slate-400 hover:text-slate-700"
      }`}
    >
      {withLabel}
    </button>
  </div>
);
