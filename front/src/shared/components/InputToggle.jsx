
export const InputToggle = ({ label, description, name, checked, onChange, disabled }) => (
  <label className={`flex items-center justify-between group ${disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"}`}>
    <div className="flex flex-col pr-4">
      <span className="text-sm font-medium text-slate-800 dark:text-slate-200">
        {label}
      </span>
      <span className="text-[11px] text-slate-500">{description}</span>
    </div>
    <div className="relative flex items-center shrink-0">
      <input
        type="checkbox"
        name={name}
        checked={checked}
        disabled={disabled}
        onChange={onChange}
        className="sr-only peer"
      />
      <div className="w-11 h-6 bg-slate-200 dark:bg-[#222222] rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#C86AAC] shadow-inner"></div>
    </div>
  </label>
);
