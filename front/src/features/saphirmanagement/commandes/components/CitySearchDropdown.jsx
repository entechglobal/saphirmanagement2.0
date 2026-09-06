import React, { useState, useRef, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Search, ChevronDown, Loader2, Check, Plus, Edit3 } from "lucide-react";
import { useCities } from "../hooks/useCommands";
import staticCitiesData from "@/assets/cities.json";

export const CitySearchDropdown = React.forwardRef(({
  value,
  onChange,
  label,
  placeholder,
  error,
  required = false,
  disabled = false,
  name = "ville",
}, ref) => {
  const { t } = useTranslation("commands");
  const { data: citiesData, isLoading, isError } = useCities();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const [manualMode, setManualMode] = useState(false);
  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);



  // Extract cities from API response, fall back to static data on error or empty
  const cities = React.useMemo(() => {
    const source = (isError || !citiesData?.cities) ? staticCitiesData : citiesData;
    if (!source?.cities) return [];
    return Object.entries(source.cities).map(([key, city]) => ({
      id: city.ref !== null && city.ref !== undefined ? Number(city.ref) : Number(key),
      name: city.name,
      lat: city.lat,
      lng: city.lng,
      zone: city.zone,
      relaunch_zone: city.relaunch_zone,
      d_fees: city.d_fees,
      r_fees: city.r_fees,
    }));
  }, [citiesData, isError]);

  // Filter cities based on search
  const filteredCities = React.useMemo(() => {
    if (!search.trim()) return cities;
    return cities.filter((city) =>
      city.name.toLowerCase().includes(search.toLowerCase())
    );
  }, [cities, search]);

  // Calculate dropdown position
  const updatePosition = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + 8,
        left: rect.left,
        width: rect.width,
      });
    }
  };

  // Handle dropdown open/close and position update
  useEffect(() => {
    if (isOpen) {
      updatePosition();
      window.addEventListener("scroll", updatePosition);
      window.addEventListener("resize", updatePosition);
      return () => {
        window.removeEventListener("scroll", updatePosition);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [isOpen]);

  // Handle click outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target) && 
          dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
        setManualMode(false);
        setSearch("");
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = (e) => {
    if (e.key === "Escape") {
      setIsOpen(false);
      setManualMode(false);
      setSearch("");
    } else if (e.key === "Enter" && search.trim()) {
      e.preventDefault();
      // If in manual mode or no filtered cities, use manual input
      if (manualMode || filteredCities.length === 0) {
        handleConfirmManual();
      } else if (filteredCities.length === 1) {
        // If only one city matches, select only id and name
        onChange({
          target: {
            name,
            value: {
              id: filteredCities[0].id,
              name: filteredCities[0].name,
            },
          },
        });
        setIsOpen(false);
        setSearch("");
      }
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  const handleManualInput = () => {
    setManualMode(true);
    setSearch("");
    // Focus on input
    setTimeout(() => {
      inputRef.current?.focus();
    }, 0);
  };

  const handleConfirmManual = () => {
    if (search.trim()) {
      onChange({
        target: {
          name,
          value: search.trim(),
        },
      });
      setIsOpen(false);
      setManualMode(false);
      setSearch("");
    }
  };

  const selectedCity = React.useMemo(() => {
    if (value && typeof value === "object") {
      return cities.find((c) => c.id === value.id);
    }
    return cities.find((c) => c.name === value);
  }, [cities, value]);

  const isManualValue = value && !selectedCity;
  
  const stateStyles = error
    ? "border-red-500 ring-4 ring-red-500/5"
    : "border-slate-200 dark:border-[#2e2e2e] hover:border-slate-300 dark:hover:border-[#3a3a3a] focus-within:border-[#B12B89] focus-within:ring-4 focus-within:ring-[#B12B89]/5";

  return (
    <div ref={containerRef} className="w-full group">
      {label && (
        <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2 ml-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          disabled={disabled}
          onClick={() => {
            if (!disabled) {
              setIsOpen(!isOpen);
              if (!isOpen) {
                setTimeout(updatePosition, 0);
              }
            }
          }}
          onKeyDown={handleKeyDown}
          className={`
            w-full px-4 text-sm rounded-xl border transition-all duration-200 outline-none
            h-[46px] leading-none
            bg-white dark:bg-[#222222]/60
            text-slate-900 dark:text-slate-100
            placeholder:text-slate-400 dark:placeholder:text-slate-500
            disabled:opacity-60 disabled:cursor-not-allowed
            flex items-center justify-between
            ${stateStyles}
          `}
        >
          <div className="flex items-center gap-2">
            <span
              className={`text-sm font-medium ${
                value
                  ? "text-slate-900 dark:text-slate-100"
                  : "text-slate-500 dark:text-slate-400"
              }`}
            >
              {typeof value === "object" ? value?.name : value || placeholder || t("city_placeholder")}
            </span>
            {isManualValue && (
              <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 uppercase">
                {t("city_manual_badge")}
              </span>
            )}
          </div>
          <ChevronDown
            size={16}
            className={`transition-transform text-slate-400 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </button>
      </div>

      {/* Fixed Position Dropdown */}
      {isOpen && !disabled && (
        <div
          ref={dropdownRef}
          style={{
            position: "fixed",
            top: `${position.top}px`,
            left: `${position.left}px`,
            width: `${position.width}px`,
            zIndex: 10001,
          }}
          className="bg-white dark:bg-[#222222] border border-slate-200 dark:border-[#2e2e2e] rounded-xl shadow-lg overflow-hidden"
        >
          {/* Search Input */}
          <div className="p-3 border-b border-slate-100 dark:border-[#2e2e2e]">
            <div className="relative">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                ref={inputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={manualMode ? t("city_type_name") : t("city_search")}
                className="w-full pl-9 pr-3 py-2 rounded-lg border border-slate-200 dark:border-[#3a3a3a] dark:bg-[#2e2e2e] dark:text-slate-100 text-sm outline-none focus:ring-2 focus:ring-[#B12B89] focus:border-[#B12B89] transition-all"
                autoFocus
              />
              {manualMode && search.trim() && (
                <button
                  type="button"
                  onClick={handleConfirmManual}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-[#B12B89] text-white text-xs font-semibold rounded-lg hover:bg-[#B05596] transition-colors"
                >
                  <Check size={12} />
                </button>
              )}
            </div>
          </div>

          {/* Loading State */}
          {isLoading && !manualMode && (
            <div className="p-4 flex items-center justify-center gap-2 text-slate-500">
              <Loader2 size={14} className="animate-spin" />
              <span className="text-xs">{t("city_loading")}</span>
            </div>
          )}




          {/* Cities List */}
          {!isLoading && !manualMode && (
            <div className="max-h-64 overflow-y-auto">
              {filteredCities.length === 0 ? (
                <div className="p-4">
                  <div className="text-center text-xs text-slate-500 dark:text-slate-400 mb-3">
                    {t("city_not_found")}
                  </div>
                 
                </div>
              ) : (
                <ul className="py-2">
                  {filteredCities.map((city) => {
                    const isSelected = selectedCity?.id === city.id;
                    return (
                      <li key={city.id}>
                        <button
                          type="button"
                          onClick={() => {
                            onChange({
                              target: {
                                name,
                                value: {
                                  id: city.id,
                                  name: city.name,
                                },
                              },
                            });
                            setIsOpen(false);
                            setSearch("");
                            setManualMode(false);
                          }}
                          className={`
                            w-full px-4 py-3 text-left text-sm transition-colors flex items-center justify-between
                            ${
                              isSelected
                                ? "bg-blue-50 dark:bg-blue-900/20 text-[#B12B89] dark:text-blue-400 font-semibold"
                                : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#2e2e2e]/50"
                            }
                          `}
                        >
                          <span>{city.name}</span>
                          {isSelected && (
                            <Check size={16} className="text-blue-500 flex-shrink-0" />
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </div>
      )}

      {error && (
        <p className="text-[10px] font-bold text-red-500 mt-1.5 ml-1 animate-in fade-in slide-in-from-top-1">
          {error}
        </p>
      )}
    </div>
  );
});

CitySearchDropdown.displayName = "CitySearchDropdown";