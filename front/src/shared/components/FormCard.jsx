/**
 * Form section — no card chrome (no white box / border / radius).
 */
export const FormCard = ({
  title: _title,
  icon: _icon,
  description: _description,
  action,
  children,
  className = "",
  bodyClassName = "",
}) => (
  <section className={`${className}`}>
    {action ? (
      <div className="flex justify-end mb-3">{action}</div>
    ) : null}
    <div className={bodyClassName}>{children}</div>
  </section>
);

export const FormFieldGrid = ({ cols = 2, children, className = "" }) => {
  const colClass =
    cols === 4
      ? "sm:grid-cols-2 xl:grid-cols-4"
      : cols === 3
        ? "md:grid-cols-2 xl:grid-cols-3"
        : "md:grid-cols-2";

  return (
    <div className={`grid grid-cols-1 ${colClass} gap-x-4 gap-y-3 ${className}`}>
      {children}
    </div>
  );
};

export const FormGroup = ({ title: _title, children, className = "" }) => (
  <div className={className}>{children}</div>
);

export const NextNumberBadge = ({ label, value }) => {
  if (!value) return null;
  return (
    <div className="text-right">
      <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
      <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 font-mono mt-0.5">
        {value}
      </p>
    </div>
  );
};

export const FormShell = ({ children, wide = false, className = "" }) => (
  <div className={`w-full space-y-4 ${className}`}>
    {children}
  </div>
);
