import { useState, useEffect, useRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Loader2, Phone, User, X } from "lucide-react";
import { useCommandClients } from "../hooks/useCommands";

export const toLocalMoroccoPhone = (phone) => {
  if (!phone) return "";
  const digits = String(phone).replace(/\D/g, "");
  if (digits.startsWith("212") && digits.length >= 12) return `0${digits.slice(3, 12)}`;
  if (digits.startsWith("0") && digits.length >= 10) return digits.slice(0, 10);
  return String(phone).replace(/\s/g, "");
};

export const PhoneClientAutocomplete = ({
  value,
  onChange,
  onSelectClient,
  selectedClient,
  onClearClient,
  societeId,
  label,
  error,
  required = false,
  placeholder = "0612345678",
  disabled = false,
}) => {
  const { t } = useTranslation("commands");
  const [open, setOpen] = useState(false);
  const [debounced, setDebounced] = useState("");
  const containerRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value?.trim() ?? ""), 250);
    return () => clearTimeout(timer);
  }, [value]);

  const canSearch = debounced.replace(/\s/g, "").length >= 2 && !disabled;

  const { data, isFetching } = useCommandClients({
    keyword: debounced,
    societeId,
    limit: 20,
    enabled: canSearch,
  });

  const clients = useMemo(() => {
    const list = data?.data ?? [];
    const q = debounced.replace(/\s/g, "").toLowerCase();
    return [...list].sort((a, b) => {
      const aPhone = String(a.phone ?? "").toLowerCase();
      const bPhone = String(b.phone ?? "").toLowerCase();
      const aHit = aPhone.includes(q) ? 0 : 1;
      const bHit = bPhone.includes(q) ? 0 : 1;
      return aHit - bHit;
    });
  }, [data, debounced]);

  useEffect(() => {
    const onClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const showDropdown = open && canSearch && !selectedClient;

  const stateStyles = error
    ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/15"
    : selectedClient
      ? "border-emerald-400 focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
      : "border-slate-300 dark:border-[#2e2e2e] hover:border-slate-400 dark:hover:border-[#3a3a3a] focus:border-[#B12B89] focus:ring-2 focus:ring-[#B12B89]/15";

  return (
    <div ref={containerRef} className="relative w-full">
      {label && (
        <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative">
        <Phone
          size={15}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
        />
        <input
          ref={inputRef}
          type="tel"
          name="telephone"
          value={value}
          disabled={disabled}
          autoComplete="off"
          placeholder={placeholder}
          onFocus={() => setOpen(true)}
          onChange={(e) => {
            onChange(e);
            setOpen(true);
          }}
          className={`
            w-full pl-9 pr-9 h-10 text-sm rounded-md border outline-none transition-colors
            bg-white dark:bg-[#222222]/60
            text-slate-900 dark:text-slate-100
            placeholder:text-slate-400 dark:placeholder:text-slate-500
            disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-50 dark:disabled:bg-[#222222]/40
            ${stateStyles}
          `}
        />
        {isFetching && canSearch && (
          <Loader2
            size={14}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#B12B89] animate-spin"
          />
        )}
      </div>

      {selectedClient && (
        <div className="mt-2 flex items-center gap-2 px-3 py-2 rounded-md bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
          <User size={14} className="text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-200 truncate">
              {selectedClient.name}
            </p>
            <p className="text-[11px] text-emerald-600 dark:text-emerald-400">
              {selectedClient.phone}
              {selectedClient.city || selectedClient.region ? ` · ${selectedClient.city || selectedClient.region}` : ""}
              {selectedClient.type ? ` · ${selectedClient.type}` : ""}
            </p>
          </div>
          {onClearClient && (
            <button
              type="button"
              onClick={onClearClient}
              className="p-1 rounded-md text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 transition"
              title={t("phone_clear_client")}
            >
              <X size={14} />
            </button>
          )}
        </div>
      )}

      {showDropdown && (
        <div className="absolute z-[200] mt-1.5 w-full bg-white dark:bg-[#1c1c1c] border border-slate-200 dark:border-[#2e2e2e] rounded-lg shadow-lg overflow-hidden">
          {!isFetching && clients.length === 0 ? (
            <div className="px-4 py-3 text-xs text-slate-400 dark:text-slate-500">
              {t("phone_no_client")}
            </div>
          ) : (
            <ul className="max-h-60 overflow-y-auto py-1">
              {clients.map((client) => (
                <li key={client.id}>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectClient(client);
                      setOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-slate-50 dark:hover:bg-[#222222]/60 transition-colors"
                  >
                    <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-slate-100 dark:bg-[#222222] flex items-center justify-center">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {client.phone || "—"}
                      </p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                        {client.name}
                        {client.city || client.region ? ` · ${client.city || client.region}` : ""}
                        {client.address ? ` · ${client.address}` : ""}
                      </p>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {error && (
        <p className="text-xs font-medium text-red-600 dark:text-red-400 mt-1.5">
          {error}
        </p>
      )}
    </div>
  );
};
