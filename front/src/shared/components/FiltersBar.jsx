import { useState, useRef, useCallback, useEffect, useMemo, memo } from "react";
import {
  Box,
  Autocomplete,
  TextField,
  InputAdornment,
  Chip,
} from "@mui/material";
import { X, Package, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import DateTimeRangePicker from "../DateTimeRangePicker";

// ── SearchFilter ───────────────────────────────────────────────────────────────
const SearchFilter = memo(({ config, t }) => {
  const {
    label,
    value,
    onChange,
    placeholder,
    debounceMs = 350,
  } = config;
  const [draft, setDraft] = useState(value ?? "");

  useEffect(() => {
    setDraft(value ?? "");
  }, [value]);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (draft !== (value ?? "")) onChange?.(draft);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [draft, debounceMs, onChange, value]);

  return (
    <TextField
      size="small"
      fullWidth
      variant="outlined"
      label={label ?? t?.("search") ?? "Recherche"}
      placeholder={
        placeholder ?? t?.("search_placeholder") ?? "Rechercher…"
      }
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      InputProps={{
        startAdornment: (
          <InputAdornment position="start">
            <Search className="w-4 h-4 text-slate-400" />
          </InputAdornment>
        ),
      }}
    />
  );
});
SearchFilter.displayName = "SearchFilter";

// ── SimpleSelectFilter ─────────────────────────────────────────────────────────
const SimpleSelectFilter = memo(({ config, t }) => {
  const { label, icon: Icon, options = [], value, onChange } = config;
  const allOption = useMemo(() => ({ value: null, label: t?.("all") ?? "Tous" }), [t]);
  const finalOptions = useMemo(() => [allOption, ...options], [options, allOption]);

  return (
    <Autocomplete
      size="small"
      options={finalOptions}
      value={value || allOption}
      onChange={(_, newVal) => onChange(newVal?.value === null ? null : newVal)}
      getOptionLabel={(o) => o?.label ?? ""}
      disableClearable
      isOptionEqualToValue={(opt, val) => opt?.value === val?.value}
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          variant="outlined"
          size="small"
          inputProps={{ ...params.inputProps, readOnly: true }}
          InputProps={{
            ...params.InputProps,
            ...(Icon && {
              startAdornment: (
                <InputAdornment position="start">
                  <Icon className="w-4 h-4 text-slate-400" />
                </InputAdornment>
              ),
            }),
          }}
        />
      )}
    />
  );
});
SimpleSelectFilter.displayName = "SimpleSelectFilter";

// ── AsyncSelectFilter ──────────────────────────────────────────────────────────
const AsyncSelectFilter = memo(({ config, t }) => {
  const {
    label,
    icon: Icon,
    options = [],
    value,
    onChange,
    loading,
    getOptionLabel,
    onInputChange,
    debounceMs = 300,
    allLabel,
  } = config;

  const timerRef = useRef(null);
  const allOption = useMemo(
    () => ({ id: null, label: allLabel ?? t?.("all") ?? "Tous" }),
    [allLabel, t]
  );
  const allOptions = useMemo(() => [allOption, ...options], [options, allOption]);

  const handleChange = useCallback(
    (_, newVal) => onChange(newVal?.id === null ? null : newVal),
    [onChange]
  );

  const handleInputChange = useCallback(
    (_, newInput, reason) => {
      if (reason === "input") {
        if (!onInputChange) return;
        clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => onInputChange(newInput), debounceMs);
      }
      if (reason === "reset" && onInputChange) onInputChange("");
      if (reason === "clear" && onInputChange) onInputChange("");
    },
    [onInputChange, debounceMs]
  );

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <Autocomplete
      size="small"
      options={allOptions}
      value={value || allOption}
      onChange={handleChange}
      onInputChange={handleInputChange}
      loading={loading}
      getOptionLabel={(opt) => opt?.label ?? getOptionLabel?.(opt) ?? ""}
      isOptionEqualToValue={(opt, val) => opt?.id === val?.id}
      filterOptions={onInputChange ? (opts) => opts : undefined}
      disableClearable
      renderInput={(params) => (
        <TextField
          {...params}
          label={label}
          variant="outlined"
          size="small"
          placeholder={t?.("search") ?? "Rechercher…"}
          InputProps={{
            ...params.InputProps,
            ...(Icon && {
              startAdornment: (
                <InputAdornment position="start">
                  <Icon className="w-4 h-4 text-slate-400" />
                </InputAdornment>
              ),
            }),
          }}
        />
      )}
    />
  );
});
AsyncSelectFilter.displayName = "AsyncSelectFilter";

// ── ProductSelectFilter ────────────────────────────────────────────────────────
const ProductSelectFilter = memo(({ config, t }) => {
  const { options = [], value, onChange, loading, onInputChange, debounceMs = 300 } = config;
  const [inputValue, setInputValue] = useState("");
  const timerRef = useRef(null);

  const handleInputChange = useCallback(
    (_, newInput) => {
      setInputValue(newInput);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onInputChange?.(newInput), debounceMs);
    },
    [onInputChange, debounceMs]
  );

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <Autocomplete
      size="small"
      options={options}
      value={value}
      onChange={(_, newVal) => onChange(newVal)}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      loading={loading}
      getOptionLabel={(o) => o?.name ?? ""}
      isOptionEqualToValue={(opt, val) => opt?.id === val?.id && opt?.type === val?.type}
      clearOnEscape
      renderOption={(props, option) => (
        <li {...props} key={`${option.type}-${option.id}`}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 0.2 }}>
            <span style={{ fontSize: "0.875rem", fontWeight: 500 }}>{option.name}</span>
            <Box sx={{ display: "flex", gap: 0.5, alignItems: "center" }}>
              <Chip
                label={option.type === "variant" ? (t?.("variant") ?? "Variant") : (t?.("article") ?? "Article")}
                size="small"
                color={option.type === "variant" ? "primary" : "default"}
                sx={{ height: 18, fontSize: "0.65rem" }}
              />
              <span style={{ fontSize: "0.7rem", color: "#94a3b8" }}>{option.barcode}</span>
            </Box>
          </Box>
        </li>
      )}
      renderInput={(params) => (
        <TextField
          {...params}
          label={
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Package className="w-3.5 h-3.5" />
              <span>
                {t?.("product") ?? "Produit"}{" "}
                <span style={{ color: "#ef4444" }}>*</span>
              </span>
            </Box>
          }
          variant="outlined"
          size="small"
          inputProps={{ ...params.inputProps, readOnly: true }}
        />
      )}
    />
  );
});
ProductSelectFilter.displayName = "ProductSelectFilter";

// ── FilterItem ─────────────────────────────────────────────────────────────────
const FilterItem = ({ filter, t }) => {
  switch (filter.type) {
    case "search":
      return <SearchFilter config={filter} t={t} />;
    case "select":
      return <SimpleSelectFilter config={filter} t={t} />;
    case "async-select":
      return <AsyncSelectFilter config={filter} t={t} />;
    case "date-range":
      return (
        <DateTimeRangePicker
          startDateTime={filter.startDateTime}
          endDateTime={filter.endDateTime}
          onStartChange={filter.onStartChange}
          onEndChange={filter.onEndChange}
          startLabel={filter.startLabel}
          endLabel={filter.endLabel}
        />
      );
    case "product-select":
      return <ProductSelectFilter config={filter} t={t} />;
    default:
      return null;
  }
};

// ── helpers ────────────────────────────────────────────────────────────────────
const autoGridCols = (count) => ({
  xs: "1fr",
  sm: `repeat(${Math.min(count, 2)}, 1fr)`,
  md: `repeat(${Math.min(count, 4)}, 1fr)`,
});

const colSpanSx = (colSpan) => {
  if (!colSpan) return undefined;
  if (typeof colSpan === "number") return { gridColumn: `span ${colSpan}` };
  return { gridColumn: colSpan };
};

// ── FiltersBar ─────────────────────────────────────────────────────────────────
export const FiltersBar = ({
  filters,
  cols,
  rows,
  hasActiveFilters,
  onReset,
  t,
  searchValue,
  onSearchChange,
  searchPlaceholder,
}) => {
  const effectiveRows = useMemo(() => {
    if (rows?.length > 0) return rows;
    if (filters?.length > 0) return [{ filters, cols }];
    return [];
  }, [filters, cols, rows]);

  const showSearch = typeof onSearchChange === "function";
  const { t: tCommon } = useTranslation("common");

  if (effectiveRows.length === 0 && !showSearch) return null;

  const searchLabel = t?.("search") ?? tCommon("search");
  const searchPh =
    searchPlaceholder ??
    t?.("filter_search_placeholder") ??
    t?.("search_placeholder") ??
    tCommon("search_placeholder");
  const resetLabel = t?.("reset") ?? tCommon("reset");

  return (
    <div className="mb-3">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1 flex flex-col gap-4">
          {effectiveRows.map((row, rowIdx) => (
            <div key={rowIdx}>
              {row.divider && (
                <div className="my-3 border-t border-dashed border-slate-200 dark:border-[#2e2e2e]/50" />
              )}
              <Box
                sx={{
                  display: "grid",
                  gridTemplateColumns:
                    row.cols ?? autoGridCols(row.filters?.length ?? 1),
                  gap: 1.5,
                  ...(rowIdx < effectiveRows.length - 1 && { mb: 1.5 }),
                }}
              >
                {(row.filters ?? []).map((filter) => (
                  <Box key={filter.id} sx={colSpanSx(filter.colSpan)}>
                    {filter.type !== "spacer" && (
                      <FilterItem filter={filter} t={t} />
                    )}
                  </Box>
                ))}
              </Box>
            </div>
          ))}

          {showSearch && (
            <SearchFilter
              t={t}
              config={{
                label: searchLabel,
                placeholder: searchPh,
                value: searchValue ?? "",
                onChange: onSearchChange,
              }}
            />
          )}
        </div>

        {hasActiveFilters && onReset && (
          <button
            type="button"
            onClick={onReset}
            className="mt-1 flex shrink-0 cursor-pointer items-center gap-1 rounded-lg px-2 py-1.5 text-[12px] font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-red-500 dark:text-slate-400 dark:hover:bg-[#2e2e2e]/60 dark:hover:text-red-400"
          >
            <X className="h-3.5 w-3.5" strokeWidth={2.25} />
            {resetLabel}
          </button>
        )}
      </div>

      <hr className="mt-4 border-0 border-t border-slate-200 dark:border-[#2e2e2e]" />
    </div>
  );
};

export default FiltersBar;
