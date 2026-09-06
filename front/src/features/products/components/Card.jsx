export const Card = ({ title, children }) => (
  <div className="bg-white dark:bg-[#1c1c1c] rounded-3xl border border-slate-200 dark:border-[#2e2e2e] p-6 space-y-4">
    <h3 className="text-xs font-bold uppercase tracking-widest text-slate-400">
      {title}
    </h3>
    {children}
  </div>
);

export const Info = ({ label, value }) => (
  <div className="flex justify-between border-b pb-2 text-sm">
    <span className="text-slate-500">{label}</span>
    <span className="font-semibold">{value ?? "—"}</span>
  </div>
);

export const Badge = ({ label, value, yes, no }) => (
  <div className="flex justify-between items-center">
    <span className="text-sm text-slate-500">{label}</span>
    <span
      className={`px-3 py-1 rounded-full text-xs font-bold ${
        value
          ? "bg-green-100 text-green-800"
          : "bg-red-100 text-red-800"
      }`}
    >
      {value ? yes : no}
    </span>
  </div>
);
