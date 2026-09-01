import React, { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

export const Input = React.forwardRef(({
  label,
  error,
  required,
  hint,
  className = "",
  type,
  ...props
}, ref) => {
  const isPassword = type === "password";
  const [showPassword, setShowPassword] = useState(false);

  const stateStyles = error
    ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/15"
    : "border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 focus:border-[#B12B89] focus:ring-2 focus:ring-[#B12B89]/15";

  return (
    <div className={`w-full ${className}`}>
      {label && (
        <label className="block text-[13px] font-medium text-slate-700 dark:text-slate-300 mb-1.5">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}

      <div className="relative">
        <input
          ref={ref}
          type={isPassword ? (showPassword ? "text" : "password") : type}
          {...props}
          className={`
            w-full px-3 h-10 text-sm rounded-md border outline-none transition-colors
            bg-white dark:bg-slate-800/60
            text-slate-900 dark:text-slate-100
            placeholder:text-slate-400 dark:placeholder:text-slate-500
            disabled:opacity-60 disabled:cursor-not-allowed disabled:bg-slate-50 dark:disabled:bg-slate-800/40
            ${isPassword ? "pl-3 pr-10" : ""}
            ${stateStyles}
          `}
        />
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        )}
      </div>

      {hint && !error && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1.5">{hint}</p>
      )}
      {error && (
        <p className="text-xs font-medium text-red-600 dark:text-red-400 mt-1.5">
          {error}
        </p>
      )}
    </div>
  );
});

Input.displayName = "Input";
