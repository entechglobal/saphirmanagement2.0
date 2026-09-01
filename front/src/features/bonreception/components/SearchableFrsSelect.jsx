import { useState, useEffect, useRef } from "react";
import { Search, ChevronDown, Loader2, Check, Building2 } from "lucide-react";
import { useBRFournisseurs } from "../hooks/useBonReceptions";

export const SearchableFrsSelect = ({ societeId, value, onChange, placeholder }) => {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const containerRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedKeyword(keyword), 300);
    return () => clearTimeout(t);
  }, [keyword]);

  const { data: frsData, isLoading } = useBRFournisseurs({ keyword: debouncedKeyword, societeId });
  const fournisseurs = frsData?.data ?? [];

  useEffect(() => {
    const onClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  useEffect(() => {
    if (open) searchRef.current?.focus();
    else setKeyword("");
  }, [open]);

  const handleSelect = (frs) => {
    onChange(frs);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      {/* Trigger */}
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-2 px-3 h-10 rounded-md border text-sm transition-colors
          bg-white dark:bg-slate-800/60 text-slate-700 dark:text-slate-200
          ${open
            ? "border-[#B12B89] ring-2 ring-[#B12B89]/10"
            : "border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600"
          }
        `}
      >
        {value ? (
          <div className="flex flex-col items-start min-w-0 flex-1">
            <span className="font-semibold text-sm text-slate-800 dark:text-slate-100 truncate leading-none">
              {value.name}
            </span>
            {value.type && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mt-0.5">
                {value.type}
              </span>
            )}
          </div>
        ) : (
          <span className="text-slate-400 text-sm flex-1 text-left">{placeholder}</span>
        )}
        <ChevronDown
          className={`w-4 h-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div className="absolute z-[200] mt-1.5 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl overflow-hidden">
          {/* Search */}
          <div className="p-2 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800 rounded-lg">
              <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <input
                ref={searchRef}
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Rechercher un fournisseur..."
                className="flex-1 text-sm bg-transparent outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
              />
              {isLoading && (
                <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin flex-shrink-0" />
              )}
            </div>
          </div>

          {/* List */}
          <div className="max-h-60 overflow-y-auto py-1 scrollbar-thin">
            {!isLoading && fournisseurs.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-400 dark:text-slate-500">
                Aucun fournisseur trouvé
              </div>
            ) : (
              fournisseurs.map((frs) => {
                const selected = value?.id === frs.id;
                return (
                  <button
                    key={frs.id}
                    type="button"
                    onClick={() => handleSelect(frs)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors
                      ${selected
                        ? "bg-blue-50 dark:bg-blue-900/20"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/60"
                      }
                    `}
                  >
                    <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                      <Building2 className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
                        {frs.name}
                      </p>
                      {frs.type && (
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {frs.type}
                        </p>
                      )}
                    </div>
                    {selected && <Check className="w-4 h-4 text-blue-500 flex-shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
