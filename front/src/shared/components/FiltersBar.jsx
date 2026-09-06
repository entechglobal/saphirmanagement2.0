import { useState, useRef, useCallback, useEffect, useMemo, memo } from "react";
import { Box, TextField, InputAdornment } from "@mui/material";
import { X, Package, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import DateTimeRangePicker from "../DateTimeRangePicker";
import { SelectUI } from "../ui/SelectUI";

const ALL_VALUE = "__all__";

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
  const { label, icon: Icon, options = [], value, onChange, searchable = false } = config;
  const allLabel = t?.("all") ?? "Tous";

  const selectOptions = useMemo(
    () => [{ value: ALL_VALUE, label: allLabel }, ...options.map((o) => ({ value: o.value, label: o.label }))],
    [options, allLabel],
  );

  return (
    <SelectUI
      label={label}
      icon={Icon ? <Icon className="w-4 h-4" /> : undefined}
      options={selectOptions}
      value={value?.value ?? ALL_VALUE}
      searchable={searchable}
      onChange={(e) => {
        const next = e.target.value;
        if (next === ALL_VALUE || next == null || next === "") {
          onChange(null);
          return;
        }
        onChange(options.find((o) => String(o.value) === String(next)) ?? null);
      }}
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
    searchable,
  } = config;

  const timerRef = useRef(null);
  const resolvedAllLabel = allLabel ?? t?.("all") ?? "Tous";

  const resolveLabel = useCallback(
    (opt) => opt?.label ?? getOptionLabel?.(opt) ?? opt?.name ?? opt?.raisonSocial ?? "",
    [getOptionLabel],
  );

  const selectOptions = useMemo(() => {
    const mapped = options.map((o) => ({ value: o.id, label: resolveLabel(o) }));
    if (value?.id != null && !mapped.some((o) => String(o.value) === String(value.id))) {
      mapped.unshift({ value: value.id, label: resolveLabel(value) });
    }
    return [{ value: ALL_VALUE, label: resolvedAllLabel }, ...mapped];
  }, [options, resolveLabel, resolvedAllLabel, value]);

  const handleSearch = useCallback(
    (query) => {
      if (!onInputChange) return;
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onInputChange(query), debounceMs);
    },
    [onInputChange, debounceMs],
  );

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <SelectUI
      label={label}
      icon={Icon ? <Icon className="w-4 h-4" /> : undefined}
      options={selectOptions}
      value={value?.id ?? ALL_VALUE}
      searchable={searchable ?? (Boolean(onInputChange) || options.length > 8)}
      isLoading={loading}
      searchPlaceholder={t?.("search") ?? "Rechercher…"}
      onSearch={onInputChange ? handleSearch : undefined}
      onChange={(e) => {
        const next = e.target.value;
        if (next === ALL_VALUE || next == null || next === "") {
          onChange(null);
          return;
        }
        const match =
          options.find((o) => String(o.id) === String(next)) ||
          (value && String(value.id) === String(next) ? value : null);
        onChange(match);
      }}
    />
  );
});
AsyncSelectFilter.displayName = "AsyncSelectFilter";

// ── ProductSelectFilter ────────────────────────────────────────────────────────
const ProductSelectFilter = memo(({ config, t }) => {
  const { options = [], value, onChange, loading, onInputChange, debounceMs = 300, searchable = true } = config;
  const timerRef = useRef(null);

  const optionKey = (o) => (o ? `${o.type}-${o.id}` : "");

  const selectOptions = useMemo(() => {
    const mapped = options.map((o) => ({
      value: optionKey(o),
      label: o.name,
      subLabel: o.barcode,
      type: o.type,
    }));
    if (value && !mapped.some((o) => o.value === optionKey(value))) {
      mapped.unshift({
        value: optionKey(value),
        label: value.name,
        subLabel: value.barcode,
        type: value.type,
      });
    }
    return mapped;
  }, [options, value]);

  const handleSearch = useCallback(
    (query) => {
      if (!onInputChange) return;
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => onInputChange(query), debounceMs);
    },
    [onInputChange, debounceMs],
  );

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <SelectUI
      label={t?.("product") ?? "Produit"}
      icon={<Package className="w-4 h-4" />}
      required
      options={selectOptions}
      value={value ? optionKey(value) : ""}
      searchable={searchable}
      clearable
      isLoading={loading}
      onSearch={onInputChange ? handleSearch : undefined}
      onChange={(e) => {
        const next = e.target.value;
        if (!next) {
          onChange(null);
          return;
        }
        const match =
          options.find((o) => optionKey(o) === next) ||
          (value && optionKey(value) === next ? value : null);
        onChange(match);
      }}
      renderOption={(option) => (
        <div className="flex flex-col min-w-0 gap-0.5">
          <span className="truncate">{option.label}</span>
          <span className="flex items-center gap-1.5">
            <span
              className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${
                option.type === "variant"
                  ? "bg-[#B12B89]/10 text-[#B12B89]"
                  : "bg-slate-100 dark:bg-[#2e2e2e] text-slate-500"
              }`}
            >
              {option.type === "variant" ? (t?.("variant") ?? "Variant") : (t?.("article") ?? "Article")}
            </span>
            {option.subLabel && (
              <span className="text-[11px] text-slate-400">{option.subLabel}</span>
            )}
          </span>
        </div>
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
