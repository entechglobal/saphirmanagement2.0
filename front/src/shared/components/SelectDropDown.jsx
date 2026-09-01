import React from "react";
import { MenuItem, TextField, CircularProgress } from "@mui/material";
import { ChevronDown } from "lucide-react";
import { useTranslation } from "react-i18next";

const MENU_PROPS = {
  PaperProps: {
    sx: {
      maxHeight: 300,
      marginTop: "6px",
      borderRadius: "8px",
      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
      border: "1px solid",
      borderColor: (theme) => theme.palette.mode === "dark" ? "#334155" : "#e2e8f0",
      "&::-webkit-scrollbar": { width: "4px" },
      "&::-webkit-scrollbar-track": { background: "transparent", margin: "6px 0" },
      "&::-webkit-scrollbar-thumb": {
        backgroundColor: (theme) => theme.palette.mode === "dark" ? "#475569" : "#cbd5e1",
        borderRadius: "10px",
      },
    },
  },
  disableScrollLock: true,
  sx: { zIndex: 10001 },
};

const TEXT_FIELD_SX = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "6px",
    fontSize: "0.875rem",
    height: "40px",
    backgroundColor: (theme) =>
      theme.palette.mode === "dark" ? "rgba(30, 41, 59, 0.6)" : "white",
    transition: "border-color 0.15s, box-shadow 0.15s",
    "& fieldset": {
      borderColor: (theme) => theme.palette.mode === "dark" ? "#334155" : "#cbd5e1",
    },
    "&:hover fieldset": {
      borderColor: (theme) => theme.palette.mode === "dark" ? "#475569" : "#94a3b8",
    },
    "&.Mui-focused fieldset": {
      borderWidth: "1px",
      borderColor: "#B12B89",
    },
    "&.Mui-focused": {
      boxShadow: "0 0 0 2px rgba(177, 43, 137, 0.15)",
    },
    "&.Mui-error fieldset": { borderColor: "#f87171" },
    "&.Mui-error.Mui-focused": {
      boxShadow: "0 0 0 2px rgba(239, 68, 68, 0.15)",
    },
  },
  "& .MuiSelect-select": {
    padding: "9px 14px",
    color: (theme) => theme.palette.mode === "dark" ? "#f1f5f9" : "#0f172a",
  },
  "& .MuiFormHelperText-root": {
    fontSize: "12px",
    fontWeight: 500,
    marginLeft: "0px",
    marginTop: "6px",
    color: "#dc2626",
  },
};

const LoadingIcon = () => (
  <CircularProgress size={16} sx={{ marginRight: "12px", color: "#C86AAC" }} />
);

export const SelectDropDown = React.memo(React.forwardRef(({
  label,
  options = [],
  error,
  required,
  isLoading,
  placeholder,
  multiple = false,
  renderValue,
  emptyMessage,
  sx,
  SelectProps,
  ...props
}, ref) => {
  const { t } = useTranslation("components");

  const defaultRenderValue = (selected) => {
    if (!multiple) {
      if (selected === "" || selected === null || selected === undefined) {
        return <span style={{ opacity: 0.5 }}>{placeholder || t("select_option")}</span>;
      }
      const option = options.find((opt) => opt.value == selected);
      return option ? option.label : selected;
    }
    if (Array.isArray(selected) && selected.length > 0) {
      if (selected.length === options.length) return "All selected";
      return `${selected.length} selected`;
    }
    return <span style={{ opacity: 0.5 }}>{placeholder || "Select options"}</span>;
  };

  const mergedSx = sx ? { ...TEXT_FIELD_SX, ...sx } : TEXT_FIELD_SX;

  return (
    <div className="w-full">
      {label && (
        <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <TextField
        select
        fullWidth
        inputRef={ref}
        error={!!error}
        disabled={isLoading || props.disabled}
        variant="outlined"
        {...props}
        SelectProps={{
          multiple,
          IconComponent: isLoading ? LoadingIcon : ChevronDown,
          displayEmpty: true,
          renderValue: renderValue || defaultRenderValue,
          MenuProps: MENU_PROPS,
          ...SelectProps,
        }}
        sx={mergedSx}
      >
        {!multiple && (
          <MenuItem value="" disabled={required}>
            <span className="opacity-50">
              {isLoading ? t("loading") : (placeholder || t("select_option"))}
            </span>
          </MenuItem>
        )}

        {!isLoading && options.length === 0 && emptyMessage && (
          <MenuItem disabled sx={{ fontSize: "13px", py: 1.5, opacity: "1 !important" }}>
            <span className="text-slate-400 dark:text-slate-500 italic">{emptyMessage}</span>
          </MenuItem>
        )}

        {options.map((option) => (
          <MenuItem key={option.value} value={option.value} sx={{ fontSize: "14px", py: 1 }}>
            <div className="flex items-center gap-3 w-full">
              {multiple && (
                <input
                  type="checkbox"
                  checked={Array.isArray(props.value) && props.value.includes(option.value)}
                  readOnly
                  className="w-4 h-4 rounded border-slate-300 text-[#B12B89] focus:ring-[#B12B89]"
                />
              )}
              {option.img && (
                <div className="relative flex-shrink-0">
                  <img
                    src={option.img}
                    alt=""
                    className="w-9 h-9 rounded-md object-cover border border-slate-200 dark:border-slate-700 flex-shrink-0 bg-white"
                    onError={(e) => (e.currentTarget.src = "data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=")}
                  />
                  {option.icon && (
                    <div className="absolute -bottom-1 -right-1 bg-white dark:bg-slate-900 rounded-full p-1 shadow-sm border border-slate-100 dark:border-slate-800">
                      {option.icon}
                    </div>
                  )}
                </div>
              )}
              <div className="flex flex-col min-w-0 leading-tight">
                <span className="font-medium text-slate-800 dark:text-slate-100 truncate">
                  {option.label}
                </span>
                {option.subLabel && (
                  <span className="text-[11px] text-slate-400 dark:text-slate-500">
                    {option.subLabel}
                  </span>
                )}
              </div>
            </div>
          </MenuItem>
        ))}
      </TextField>

      {error && (
        <p className="text-xs font-medium mt-1.5 text-red-600 dark:text-red-400">{error}</p>
      )}
    </div>
  );
}));

SelectDropDown.displayName = "SelectDropDown";
