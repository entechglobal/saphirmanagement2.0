import { Plus } from "lucide-react";
import { SelectDropDown } from "../../../shared/components/SelectDropDown";

export const SelectWithQuickAdd = ({
  onAdd,
  addLabel,
  disabled,
  ...selectProps
}) => (
  <div className="flex items-start gap-2">
    <div className="min-w-0 flex-1">
      <SelectDropDown {...selectProps} disabled={disabled} />
    </div>
    <button
      type="button"
      onClick={onAdd}
      disabled={disabled}
      title={addLabel}
      aria-label={addLabel}
      className="mt-[28px] h-10 w-10 shrink-0 inline-flex items-center justify-center rounded-md border border-slate-300 dark:border-[#3a3a3a] bg-white dark:bg-[#222222] text-[#B12B89] hover:bg-[#B12B89]/5 dark:hover:bg-[#B12B89]/10 transition disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <Plus size={16} />
    </button>
  </div>
);
