import { useState, useEffect, useRef } from "react";
import { Search, ChevronDown, Loader2, Check, User } from "lucide-react";

export const SearchableClientSelect = ({
  useClientsHook,
  societeId,
  value,
  onChange,
  placeholder,
  disabled = false,
}) => {
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");
  const containerRef = useRef(null);
  const searchRef = useRef(null);

  useEffect(() => {
    const t = setTimeout(() => setDebouncedKeyword(keyword), 300);
    return () => clearTimeout(t);
  }, [keyword]);

  const { data, isLoading } = useClientsHook({ keyword: debouncedKeyword, societeId });
  const clients = data?.data ?? [];

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

  return (
    <div ref={containerRef} className="relative w-full">
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((v) => !v)}
        className={`w-full flex items-center justify-between gap-2 px-3 h-10 rounded-md border text-sm transition-colors
          bg-white dark:bg-[#222222]/60 text-slate-700 dark:text-slate-200
          disabled:opacity-60 disabled:cursor-not-allowed
          ${open
            ? "border-[#B12B89] ring-2 ring-[#B12B89]/15"
            : "border-slate-300 dark:border-[#2e2e2e] hover:border-slate-400 dark:hover:border-[#3a3a3a]"
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

      {open && !disabled && (
        <div className="absolute z-[200] mt-1.5 w-full bg-white dark:bg-[#1c1c1c] border border-slate-200 dark:border-[#2e2e2e] rounded-lg shadow-lg overflow-hidden">
          <div className="p-2 border-b border-slate-100 dark:border-[#2e2e2e]">
            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-[#222222] rounded-lg">
              <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
              <input
                ref={searchRef}
                type="text"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Rechercher un client..."
                className="flex-1 text-sm bg-transparent outline-none text-slate-700 dark:text-slate-200 placeholder:text-slate-400"
              />
              {isLoading && (
                <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin flex-shrink-0" />
              )}
            </div>
          </div>

          <div className="max-h-60 overflow-y-auto py-1 scrollbar-thin">
            {!isLoading && clients.length === 0 ? (
              <div className="px-4 py-6 text-center text-sm text-slate-400 dark:text-slate-500">
                Aucun client trouvé
              </div>
            ) : (
              clients.map((client) => {
                const selected = value?.id === client.id;
                return (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => { onChange(client); setOpen(false); }}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors
                      ${selected
                        ? "bg-blue-50 dark:bg-blue-900/20"
                        : "hover:bg-slate-50 dark:hover:bg-[#222222]/60"
                      }
                    `}
                  >
                    <div className="flex-shrink-0 w-7 h-7 rounded-lg bg-slate-100 dark:bg-[#222222] flex items-center justify-center">
                      <User className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 truncate">
                        {client.name}
                      </p>
                      {client.type && (
                        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          {client.type}
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
