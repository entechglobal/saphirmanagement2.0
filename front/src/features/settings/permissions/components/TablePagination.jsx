// TablePagination.jsx
import { ChevronLeft, ChevronRight } from "lucide-react";

const TablePagination = ({ page, setPage, total = 1 }) => (
  <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
    <button
      onClick={() => setPage((p) => Math.max(1, p - 1))}
      disabled={page === 1}
      className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition disabled:opacity-30 text-slate-500 dark:text-slate-400"
    >
      <ChevronLeft size={16} />
    </button>
    <span className="text-[10px] font-bold px-2 text-slate-500 dark:text-slate-400">
      {page} / {total}
    </span>
    <button
      onClick={() => setPage((p) => Math.min(total, p + 1))}
      disabled={page >= total}
      className="p-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition disabled:opacity-30 text-slate-500 dark:text-slate-400"
    >
      <ChevronRight size={16} />
    </button>
  </div>
);

export default TablePagination;
