import { useState, useRef, useEffect, useCallback } from "react"
import { createPortal } from "react-dom"
import { ChevronDown, Search, Check, ChevronLeft, ChevronRight, X } from "lucide-react"

/**
 * SearchableDropdown — portal-based dropdown that escapes overflow:hidden parents
 *
 * Props:
 *   label         string
 *   placeholder   string
 *   selected      { id, label, sub?, badge? } | null
 *   onSelect      (item | null) => void
 *   items         { id, label, sub?, badge? }[]
 *   isLoading     bool
 *   isFetching    bool
 *   page          number
 *   totalPages    number
 *   onPageChange  (page: number) => void
 *   searchValue   string
 *   onSearch      (value: string) => void  — optional
 *   emptyText     string
 */
export const SearchableDropdown = ({
  label,
  placeholder = "Sélectionner…",
  selected,
  onSelect,
  items = [],
  isLoading,
  isFetching,
  page = 1,
  totalPages = 1,
  onPageChange,
  searchValue = "",
  onSearch,
  emptyText = "Aucun résultat",
}) => {
  const [open, setOpen] = useState(false)
  const [dropdownStyle, setDropdownStyle] = useState({})
  const triggerRef = useRef(null)
  const panelRef = useRef(null)

  // Compute position of the portal panel relative to the trigger
  const updatePosition = useCallback(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const spaceBelow = window.innerHeight - rect.bottom
    const panelHeight = 320

    const openUpward = spaceBelow < panelHeight && rect.top > panelHeight

    setDropdownStyle({
      position: "fixed",
      left: rect.left,
      width: rect.width,
      zIndex: 9999,
      ...(openUpward
        ? { bottom: window.innerHeight - rect.top + 6 }
        : { top: rect.bottom + 6 }),
    })
  }, [])

  const handleOpen = () => {
    updatePosition()
    setOpen(true)
  }

  // Close on outside click; reposition on scroll/resize
  useEffect(() => {
    if (!open) return
    const onOutside = (e) => {
      if (triggerRef.current?.contains(e.target) || panelRef.current?.contains(e.target)) return
      setOpen(false)
    }
    document.addEventListener("mousedown", onOutside)
    window.addEventListener("scroll", updatePosition, true)
    window.addEventListener("resize", updatePosition)
    return () => {
      document.removeEventListener("mousedown", onOutside)
      window.removeEventListener("scroll", updatePosition, true)
      window.removeEventListener("resize", updatePosition)
    }
  }, [open, updatePosition])

  const handleSelect = (item) => { onSelect(item); setOpen(false) }
  const handleClear = (e) => { e.stopPropagation(); onSelect(null) }

  // ── Portal panel ──────────────────────────────────────────────────────────
  const panel = open && (
    <div
      ref={panelRef}
      style={dropdownStyle}
      className="bg-white dark:bg-[#1c1c1c] rounded-2xl border border-slate-200 dark:border-[#2e2e2e] shadow-2xl overflow-hidden"
    >
      {onSearch && (
        <div className="p-3 border-b border-slate-100 dark:border-[#2e2e2e]">
          <div className="relative">
            <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              autoFocus
              value={searchValue}
              onChange={(e) => onSearch(e.target.value)}
              placeholder="Rechercher…"
              className="w-full pl-8 pr-3 py-2 bg-slate-100 dark:bg-[#222222] rounded-xl outline-none text-sm text-slate-700 dark:text-slate-200 placeholder:text-slate-400 border border-transparent focus:border-blue-400 dark:focus:border-[#B12B89] transition"
            />
          </div>
        </div>
      )}

      <div className="max-h-52 overflow-y-auto">
        {isLoading ? (
          <div className="space-y-2 p-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="animate-pulse h-9 bg-slate-100 dark:bg-[#222222] rounded-xl" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <p className="text-center text-xs text-slate-400 py-6">{emptyText}</p>
        ) : (
          <div className="p-2 space-y-0.5">
            {items.map((item) => {
              const isSelected = selected?.id === item.id
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => handleSelect(item)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all ${
                    isSelected
                      ? "bg-blue-50 dark:bg-blue-950/40"
                      : "hover:bg-slate-50 dark:hover:bg-[#222222]/60"
                  }`}
                >
                  <div className={`w-4 h-4 rounded-md flex items-center justify-center shrink-0 transition ${
                    isSelected ? "bg-[#B12B89]" : "border border-slate-200 dark:border-[#2e2e2e]"
                  }`}>
                    {isSelected && <Check size={10} className="text-white" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm truncate ${
                      isSelected
                        ? "text-blue-700 dark:text-blue-400 font-semibold"
                        : "text-slate-700 dark:text-slate-200 font-medium"
                    }`}>
                      {item.label}
                    </p>
                    {item.sub && <p className="text-[11px] text-slate-400 truncate">{item.sub}</p>}
                  </div>
                  {item.badge && (
                    <span className="shrink-0 text-[10px] font-bold uppercase tracking-tight px-2 py-0.5 rounded-lg bg-slate-100 dark:bg-[#222222] text-slate-500 dark:text-slate-400">
                      {item.badge}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-100 dark:border-[#2e2e2e] bg-slate-50/50 dark:bg-[#222222]/30">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            {isFetching ? "…" : `${page} / ${totalPages}`}
          </span>
          <div className="flex gap-1">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onPageChange(page - 1) }}
              disabled={page <= 1 || isFetching}
              className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-[#2e2e2e] disabled:opacity-30 transition text-slate-500 dark:text-slate-400"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onPageChange(page + 1) }}
              disabled={page >= totalPages || isFetching}
              className="p-1 rounded-lg hover:bg-slate-200 dark:hover:bg-[#2e2e2e] disabled:opacity-30 transition text-slate-500 dark:text-slate-400"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      )}
    </div>
  )

  return (
    <div className="relative">
      {label && (
        <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5 ml-1">
          {label}
        </label>
      )}

      {/* Trigger */}
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (open ? setOpen(false) : handleOpen())}
        className={`w-full flex items-center justify-between gap-2 px-4 py-2.5 rounded-xl border text-sm transition-all text-left ${
          open
            ? "border-blue-400 dark:border-[#B12B89] bg-white dark:bg-[#222222] shadow-md ring-2 ring-blue-400/20"
            : "border-slate-200 dark:border-[#2e2e2e] bg-white dark:bg-[#222222] hover:border-slate-300 dark:hover:border-[#3a3a3a]"
        }`}
      >
        <span className={`flex-1 truncate ${
          selected ? "text-slate-800 dark:text-slate-100 font-medium" : "text-slate-400"
        }`}>
          {selected ? selected.label : placeholder}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          {selected && (
            <span
              onClick={handleClear}
              className="p-0.5 rounded-md hover:bg-slate-100 dark:hover:bg-[#2e2e2e] text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition cursor-pointer"
            >
              <X size={13} />
            </span>
          )}
          <ChevronDown
            size={15}
            className={`text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </div>
      </button>

      {/* Render panel via portal — escapes all overflow:hidden ancestors */}
      {typeof document !== "undefined" && createPortal(panel, document.body)}
    </div>
  )
}