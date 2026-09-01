// ActionButtons.jsx
import { Trash2 } from "lucide-react";

const ActionButtons = ({ onAssign, onRemove, assignLabel, isAssigning, isRemoving, disabled }) => (
  <div className="flex gap-2">
    <button
      onClick={onAssign}
      disabled={disabled || isAssigning}
      className="flex-1 font-bold py-2.5 rounded-2xl transition text-xs text-white shadow-sm disabled:opacity-40 disabled:cursor-not-allowed bg-inherit"
      style={{ background: "inherit" }}
    >
      {isAssigning ? "…" : assignLabel}
    </button>
    <button
      onClick={onRemove}
      disabled={disabled || isRemoving}
      className="px-4 border border-red-200 dark:border-red-900 text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-2xl transition disabled:opacity-40 disabled:cursor-not-allowed"
    >
      <Trash2 size={16} />
    </button>
  </div>
);

export default ActionButtons;
