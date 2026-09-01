/** Shared visual tokens for Add/Edit forms. */

export const FORM_CONTROL =
  "w-full px-3 h-10 text-sm rounded-md border outline-none transition-colors " +
  "bg-white dark:bg-slate-800/60 " +
  "border-slate-300 dark:border-slate-700 " +
  "text-slate-900 dark:text-slate-100 " +
  "placeholder:text-slate-400 dark:placeholder:text-slate-500 " +
  "hover:border-slate-400 dark:hover:border-slate-600 " +
  "focus:border-[#B12B89] focus:ring-2 focus:ring-[#B12B89]/15";

export const FORM_CONTROL_DISABLED =
  "w-full px-3 h-10 text-sm rounded-md border " +
  "bg-slate-50 dark:bg-slate-800/40 " +
  "border-slate-200 dark:border-slate-700 " +
  "text-slate-500 dark:text-slate-400 cursor-not-allowed";

export const FORM_CONTROL_DASHED =
  "w-full px-3 h-10 text-sm rounded-md border border-dashed " +
  "bg-slate-50 dark:bg-slate-800/30 " +
  "border-slate-300 dark:border-slate-700 " +
  "flex items-center text-xs text-slate-400 cursor-not-allowed";

export const FORM_ICON_BTN =
  "flex-shrink-0 h-10 w-10 inline-flex items-center justify-center " +
  "rounded-md bg-[#B12B89] hover:bg-[#9A2478] text-white transition-colors";

export const FORM_ICON_BTN_MUTED =
  "flex-shrink-0 h-10 w-10 inline-flex items-center justify-center " +
  "rounded-md border border-slate-300 dark:border-slate-700 " +
  "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors";

export const FORM_LABEL =
  "block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5";

/** MUI DateTimePicker slotProps.sx — matches Input / Select height & radius. */
export const DATE_PICKER_SX = (theme) => ({
  "& .MuiPickersInputBase-root, & .MuiPickersOutlinedInput-root": {
    backgroundColor: theme.palette.mode === "dark" ? "rgba(30, 41, 59, 0.6)" : "#ffffff",
    borderRadius: "6px",
    height: "40px",
    fontSize: "0.875rem",
  },
  "& .MuiPickersOutlinedInput-notchedOutline": {
    borderColor: theme.palette.mode === "dark" ? "#334155" : "#cbd5e1",
  },
  "&:hover .MuiPickersOutlinedInput-notchedOutline": { borderColor: "#94a3b8" },
  "& .Mui-focused .MuiPickersOutlinedInput-notchedOutline": { borderColor: "#B12B89" },
  "& .Mui-focused": { boxShadow: "0 0 0 2px rgba(177, 43, 137, 0.15)" },
  "& .MuiPickersSectionList-root": {
    padding: "0 4px",
    height: "100%",
    display: "flex",
    alignItems: "center",
  },
  "& .MuiPickersSectionList-section": { color: theme.palette.text.primary },
  "& .MuiInputLabel-root": { display: "none" },
});
