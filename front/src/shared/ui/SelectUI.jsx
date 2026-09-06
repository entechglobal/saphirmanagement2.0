import React, {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { Search, ChevronDown, Loader2, Check } from "lucide-react";
import { useTranslation } from "react-i18next";

const sameValue = (a, b) => {
  if (a == null && b == null) return true;
  if (a == null || b == null) return false;
  return String(a) === String(b);
};

const isEmptyValue = (value, multiple) => {
  if (multiple) return !Array.isArray(value) || value.length === 0;
  return value === "" || value === null || value === undefined;
};

const isSelectedValue = (value, optionValue, multiple) => {
  if (multiple) {
    return Array.isArray(value) && value.some((v) => sameValue(v, optionValue));
  }
  return sameValue(value, optionValue);
};

export function SelectOption() {
  return null;
}
SelectOption.displayName = "SelectUI.Option";

function collectOptions(optionsProp, children) {
  const fromChildren = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) return;
    if (
      child.type !== SelectOption &&
      child.type?.displayName !== "SelectUI.Option"
    ) {
      return;
    }
    const {
      value,
      children: label,
      subLabel,
      img,
      icon,
      disabled,
    } = child.props;
    fromChildren.push({ value, label, subLabel, img, icon, disabled });
  });
  if (optionsProp?.length) return optionsProp;
  if (fromChildren.length) return fromChildren;
  return optionsProp ?? [];
}

function emitChange(onChange, name, value) {
  onChange?.({ target: { name, value } });
}

export const SelectUI = React.forwardRef(function SelectUI(
  props,
  ref,
) {
  const isControlled = Object.prototype.hasOwnProperty.call(props, "value");
  const {
    label,
    options: optionsProp,
    children,
    value,
    defaultValue,
    onChange,
    onBlur,
    name,
    error,
    required = false,
    disabled = false,
    isLoading = false,
    placeholder,
    multiple = false,
    searchable: searchableProp,
    searchPlaceholder,
    emptyMessage,
    renderValue,
    renderOption,
    creatable = false,
    createLabel,
    onCreate,
    onSearch,
    footer,
    clearable = false,
    className = "",
    hint,
    id,
    autoFocus,
    onFocus,
    icon,
    sx: _sx,
    SelectProps: _selectProps,
  } = props;
  const { t } = useTranslation("components");
  const reactId = useId();
  const fieldId = id || `select-ui-${reactId}`;
  const listboxId = `${fieldId}-listbox`;

  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [highlight, setHighlight] = useState(-1);
  const [position, setPosition] = useState({
    top: 0,
    left: 0,
    width: 0,
    maxHeight: 256,
  });

  const containerRef = useRef(null);
  const buttonRef = useRef(null);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const hiddenRef = useRef(null);

  const setHiddenRef = useCallback(
    (el) => {
      hiddenRef.current = el;
      if (typeof ref === "function") ref(el);
      else if (ref) ref.current = el;
    },
    [ref],
  );

  const options = useMemo(
    () => collectOptions(optionsProp, children),
    [optionsProp, children],
  );

  const searchable =
    searchableProp ?? Boolean(onSearch || creatable || options.length > 8);

  const filteredOptions = useMemo(() => {
    if (onSearch || !search.trim()) return options;
    const q = search.toLowerCase();
    return options.filter((opt) => {
      const label =
        typeof opt.label === "string" || typeof opt.label === "number"
          ? String(opt.label).toLowerCase()
          : "";
      const sub = String(opt.subLabel ?? "").toLowerCase();
      return label.includes(q) || sub.includes(q);
    });
  }, [options, search, onSearch]);

  const [innerValue, setInnerValue] = useState(() =>
    isControlled ? value : defaultValue ?? (multiple ? [] : ""),
  );
  const currentValue = isControlled ? value : innerValue;

  const commitChange = useCallback(
    (next) => {
      if (!isControlled) setInnerValue(next);
      emitChange(onChange, name, next);
    },
    [isControlled, name, onChange],
  );

  useEffect(() => {
    if (isControlled || !hiddenRef.current) return;
    const raw = hiddenRef.current.value;
    if (!raw) return;
    setInnerValue((prev) =>
      isEmptyValue(prev, multiple) ? (multiple ? raw.split(",") : raw) : prev,
    );
  }, [isControlled, multiple, options.length]);

  const selectedOption = useMemo(() => {
    if (multiple) return null;
    return options.find((opt) => sameValue(opt.value, currentValue));
  }, [options, currentValue, multiple]);

  const canCreate =
    creatable &&
    search.trim() &&
    !filteredOptions.some(
      (opt) => String(opt.label).toLowerCase() === search.trim().toLowerCase(),
    );

  const updatePosition = useCallback(() => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const gap = 8;
    const dropdownH = dropdownRef.current?.offsetHeight ?? 320;
    const spaceBelow = window.innerHeight - rect.bottom - gap;
    const spaceAbove = rect.top - gap;
    const openUp = spaceBelow < Math.min(dropdownH, 256) && spaceAbove > spaceBelow;
    const maxHeight = Math.max(160, openUp ? spaceAbove : spaceBelow);
    const width = rect.width;
    let left = rect.left;
    if (left + width > window.innerWidth - 8) left = window.innerWidth - width - 8;
    if (left < 8) left = 8;
    const top = openUp
      ? Math.max(8, rect.top - Math.min(dropdownH, maxHeight) - gap)
      : rect.bottom + gap;
    setPosition({ top, left, width, maxHeight });
  }, []);

  useEffect(() => {
    if (!isOpen) return undefined;
    updatePosition();
    const onScrollOrResize = () => updatePosition();
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);
    return () => {
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [isOpen, updatePosition, filteredOptions.length, search, isLoading]);

  useEffect(() => {
    if (!isOpen) return undefined;
    const handleClickOutside = (e) => {
      if (
        containerRef.current?.contains(e.target) ||
        dropdownRef.current?.contains(e.target)
      ) {
        return;
      }
      setIsOpen(false);
      setSearch("");
      onSearch?.("");
      onBlur?.({ target: { name } });
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, name, onBlur, onSearch]);

  useEffect(() => {
    if (!isOpen) {
      setHighlight(-1);
      return;
    }
    const selectedIdx = filteredOptions.findIndex((opt) =>
      isSelectedValue(currentValue, opt.value, multiple),
    );
    setHighlight(selectedIdx >= 0 ? selectedIdx : 0);
    const focusTimer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(focusTimer);
  }, [isOpen, filteredOptions, currentValue, multiple]);

  useEffect(() => {
    if (!isOpen || highlight < 0 || !listRef.current) return;
    const el = listRef.current.querySelector(`[data-index="${highlight}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [highlight, isOpen]);

  const close = useCallback(() => {
    setIsOpen(false);
    setSearch("");
    onSearch?.("");
  }, [onSearch]);

  const selectOption = useCallback(
    (option) => {
      if (option?.disabled) return;
      if (multiple) {
        const current = Array.isArray(currentValue) ? currentValue : [];
        const next = current.some((v) => sameValue(v, option.value))
          ? current.filter((v) => !sameValue(v, option.value))
          : [...current, option.value];
        commitChange(next);
        return;
      }
      commitChange(option.value);
      close();
    },
    [close, commitChange, currentValue, multiple],
  );

  const confirmCreate = useCallback(() => {
    const next = search.trim();
    if (!next) return;
    if (onCreate) onCreate(next);
    else commitChange(next);
    close();
  }, [close, commitChange, onCreate, search]);

  const handleKeyDown = (e) => {
    if (disabled) return;

    if (e.key === "Escape") {
      e.preventDefault();
      close();
      buttonRef.current?.focus();
      return;
    }

    if (e.key === "Tab") {
      close();
      return;
    }

    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      const max = filteredOptions.length + (canCreate ? 1 : 0) - 1;
      if (max < 0) return;
      setHighlight((prev) => (prev < max ? prev + 1 : 0));
      return;
    }

    if (e.key === "ArrowUp") {
      e.preventDefault();
      if (!isOpen) {
        setIsOpen(true);
        return;
      }
      const max = filteredOptions.length + (canCreate ? 1 : 0) - 1;
      if (max < 0) return;
      setHighlight((prev) => (prev > 0 ? prev - 1 : max));
      return;
    }

    if (e.key === "Enter") {
      if (!isOpen) {
        e.preventDefault();
        setIsOpen(true);
        return;
      }
      e.preventDefault();
      if (canCreate && highlight === filteredOptions.length) {
        confirmCreate();
        return;
      }
      if (filteredOptions[highlight]) {
        selectOption(filteredOptions[highlight]);
        return;
      }
      if (canCreate) confirmCreate();
    }
  };

  const defaultTriggerLabel = () => {
    if (renderValue) return renderValue(currentValue);
    if (multiple) {
      const selected = Array.isArray(currentValue) ? currentValue : [];
      if (selected.length === 0) {
        return (
          <span className="text-slate-500 dark:text-slate-400">
            {placeholder || t("select_option")}
          </span>
        );
      }
      if (selected.length === options.length && options.length > 0) {
        return t("all_selected");
      }
      return t("selected_count", { count: selected.length });
    }
    if (selectedOption) return selectedOption.label;
    if (!isEmptyValue(currentValue, false)) return String(currentValue);
    return (
      <span className="text-slate-500 dark:text-slate-400">
        {placeholder || t("select_option")}
      </span>
    );
  };

  const stateStyles = error
    ? "border-red-500 ring-4 ring-red-500/5"
    : isOpen
      ? "border-[#B12B89] ring-4 ring-[#B12B89]/5"
      : "border-slate-200 dark:border-[#2e2e2e] hover:border-slate-300 dark:hover:border-[#3a3a3a]";

  const hiddenValue = multiple
    ? (Array.isArray(currentValue) ? currentValue.join(",") : "")
    : (currentValue ?? "");

  const dropdown = isOpen && !disabled && (
    <div
      ref={dropdownRef}
      id={listboxId}
      role="listbox"
      aria-multiselectable={multiple || undefined}
      style={{
        position: "fixed",
        top: `${position.top}px`,
        left: `${position.left}px`,
        width: `${position.width}px`,
        maxHeight: `${position.maxHeight}px`,
        zIndex: 10001,
      }}
      className="bg-white dark:bg-[#222222] border border-slate-200 dark:border-[#2e2e2e] rounded-xl shadow-lg overflow-hidden flex flex-col"
    >
      {searchable && (
        <div className="p-3 border-b border-slate-100 dark:border-[#2e2e2e] shrink-0">
          <div className="relative">
            <Search
              size={14}
              className="absolute start-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
            />
            <input
              ref={inputRef}
              type="text"
              value={search}
              onChange={(e) => {
                const next = e.target.value;
                setSearch(next);
                onSearch?.(next);
              }}
              onKeyDown={handleKeyDown}
              placeholder={searchPlaceholder || t("search")}
              className="w-full ps-9 pe-3 py-2 rounded-lg border border-slate-200 dark:border-[#3a3a3a] dark:bg-[#2e2e2e] dark:text-slate-100 text-sm outline-none focus:ring-2 focus:ring-[#B12B89] focus:border-[#B12B89] transition-all"
            />
            {canCreate && search.trim() && (
              <button
                type="button"
                onClick={confirmCreate}
                className="absolute end-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-[#B12B89] text-white text-xs font-semibold rounded-lg hover:bg-[#B05596] transition-colors"
              >
                <Check size={12} />
              </button>
            )}
          </div>
        </div>
      )}

      {isLoading && (
        <div className="p-4 flex items-center justify-center gap-2 text-slate-500">
          <Loader2 size={14} className="animate-spin" />
          <span className="text-xs">{t("loading")}</span>
        </div>
      )}

      {!isLoading && (
        <div
          ref={listRef}
          className="overflow-y-auto min-h-0"
          style={{ maxHeight: Math.max(120, position.maxHeight - (searchable ? 68 : 0)) }}
        >
          {filteredOptions.length === 0 && !canCreate ? (
            <div className="p-4 text-center text-xs text-slate-500 dark:text-slate-400">
              {emptyMessage || t("no_results")}
            </div>
          ) : (
            <ul className="py-2">
              {filteredOptions.map((option, index) => {
                const selected = isSelectedValue(currentValue, option.value, multiple);
                const active = highlight === index;
                return (
                  <li key={`${option.value}-${index}`} data-index={index}>
                    <button
                      type="button"
                      role="option"
                      id={`${fieldId}-opt-${index}`}
                      aria-selected={selected}
                      disabled={option.disabled}
                      onMouseEnter={() => setHighlight(index)}
                      onClick={() => selectOption(option)}
                      className={`
                        w-full px-4 py-3 text-left text-sm transition-colors flex items-center justify-between gap-3
                        disabled:opacity-50 disabled:cursor-not-allowed
                        ${
                          selected
                            ? "bg-blue-50 dark:bg-blue-900/20 text-[#B12B89] dark:text-blue-400 font-semibold"
                            : active
                              ? "bg-slate-50 dark:bg-[#2e2e2e]/50 text-slate-700 dark:text-slate-200"
                              : "text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-[#2e2e2e]/50"
                        }
                      `}
                    >
                      {renderOption ? (
                        renderOption(option, { selected, active })
                      ) : (
                        <>
                          <div className="flex items-center gap-3 min-w-0">
                            {multiple && (
                              <span
                                className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                  selected
                                    ? "bg-[#B12B89] border-[#B12B89]"
                                    : "border-slate-300 dark:border-[#3a3a3a] bg-white dark:bg-[#222222]"
                                }`}
                              >
                                {selected && <Check size={10} className="text-white" />}
                              </span>
                            )}
                            {option.img && (
                              <div className="relative shrink-0">
                                <img
                                  src={option.img}
                                  alt=""
                                  className="w-9 h-9 rounded-md object-cover border border-slate-200 dark:border-[#2e2e2e] bg-white"
                                  onError={(e) => {
                                    e.currentTarget.src =
                                      "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=";
                                  }}
                                />
                                {option.icon && (
                                  <div className="absolute -bottom-1 -end-1 bg-white dark:bg-[#1c1c1c] rounded-full p-1 shadow-sm border border-slate-100 dark:border-[#2e2e2e]">
                                    {option.icon}
                                  </div>
                                )}
                              </div>
                            )}
                            <div className="flex flex-col min-w-0 leading-tight">
                              <span className="truncate">{option.label}</span>
                              {option.subLabel && (
                                <span className="text-[11px] font-normal text-slate-400 dark:text-slate-500 truncate">
                                  {option.subLabel}
                                </span>
                              )}
                            </div>
                          </div>
                          {selected && !multiple && (
                            <Check size={16} className="text-blue-500 shrink-0" />
                          )}
                        </>
                      )}
                    </button>
                  </li>
                );
              })}
              {canCreate && (
                <li data-index={filteredOptions.length}>
                  <button
                    type="button"
                    onMouseEnter={() => setHighlight(filteredOptions.length)}
                    onClick={confirmCreate}
                    className={`w-full px-4 py-3 text-left text-sm transition-colors ${
                      highlight === filteredOptions.length
                        ? "bg-slate-50 dark:bg-[#2e2e2e]/50 text-[#B12B89]"
                        : "text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-[#2e2e2e]/50"
                    }`}
                  >
                    {createLabel?.(search.trim()) ||
                      t("use_value", { value: search.trim() })}
                  </button>
                </li>
              )}
            </ul>
          )}
        </div>
      )}

      {footer && (
        <div className="border-t border-slate-100 dark:border-[#2e2e2e] shrink-0">
          {footer}
        </div>
      )}
    </div>
  );

  return (
    <div ref={containerRef} className={`w-full group ${className}`}>
      {label && (
        <label
          htmlFor={fieldId}
          className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5"
        >
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative">
        <input
          type="hidden"
          name={name}
          value={hiddenValue}
          ref={setHiddenRef}
          onFocus={() => buttonRef.current?.focus()}
        />
        <button
          ref={buttonRef}
          id={fieldId}
          type="button"
          disabled={disabled}
          autoFocus={autoFocus}
          onFocus={onFocus}
          onClick={() => {
            if (disabled || isLoading) return;
            setIsOpen((open) => {
              const next = !open;
              if (next) window.setTimeout(updatePosition, 0);
              else {
                setSearch("");
                onSearch?.("");
              }
              return next;
            });
          }}
          onKeyDown={handleKeyDown}
          role="combobox"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
          aria-controls={isOpen ? listboxId : undefined}
          aria-invalid={!!error}
          aria-required={required || undefined}
          aria-activedescendant={
            isOpen && highlight >= 0 ? `${fieldId}-opt-${highlight}` : undefined
          }
          className={`
            w-full px-4 text-sm rounded-md border transition-all duration-200 outline-none
            h-[40px] leading-none
            bg-white dark:bg-[#222222]/60
            disabled:opacity-60 disabled:cursor-not-allowed
            flex items-center justify-between gap-2
            ${stateStyles}
          `}
        >
          <div className="flex items-center gap-2 min-w-0 flex-1 text-start">
            {icon ? <span className="text-slate-400 shrink-0">{icon}</span> : null}
            <span
              className={`text-sm truncate ${
                isEmptyValue(currentValue, multiple)
                  ? "text-slate-500 dark:text-slate-400"
                  : "text-slate-900 dark:text-slate-100"
              }`}
            >
              {defaultTriggerLabel()}
            </span>
          </div>
          <span className="flex items-center gap-1 shrink-0">
            {isLoading && <Loader2 size={14} className="animate-spin text-[#C86AAC]" />}
            {clearable && !isEmptyValue(currentValue, multiple) && !disabled && (
              <span
                role="button"
                tabIndex={-1}
                onClick={(e) => {
                  e.stopPropagation();
                  commitChange(multiple ? [] : "");
                }}
                className="p-0.5 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                ×
              </span>
            )}
            <ChevronDown
              size={16}
              className={`transition-transform text-slate-400 ${isOpen ? "rotate-180" : ""}`}
            />
          </span>
        </button>
      </div>

      {typeof document !== "undefined" && dropdown
        ? createPortal(dropdown, document.body)
        : null}

      {hint && !error && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">{hint}</p>
      )}
      {error && (
        <p className="text-[10px] font-bold text-red-500 mt-1.5 ml-1 animate-in fade-in slide-in-from-top-1">
          {error}
        </p>
      )}
    </div>
  );
});

SelectUI.displayName = "SelectUI";
SelectUI.Option = SelectOption;
