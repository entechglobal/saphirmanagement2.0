// Card.jsx
// Generic card component for settings/permissions UI

const Card = ({ title, children, icon: Icon, iconColor = "text-blue-500" }) => (
  <div className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col transition-all hover:shadow-md">
    <div className="px-6 py-5 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 rounded-t-[2rem] flex items-center justify-between shrink-0">
      <h3 className="font-bold text-[11px] uppercase tracking-[0.15em] text-slate-500 dark:text-slate-400">{title}</h3>
      {Icon && <Icon size={18} className={iconColor} />}
    </div>
    <div className="p-6 flex flex-col gap-4">{children}</div>
  </div>
);

export default Card;
