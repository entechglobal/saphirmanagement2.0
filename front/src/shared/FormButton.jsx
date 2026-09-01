import React from "react";
import { CircularProgress } from "@mui/material";

/** @deprecated Prefer FormActions for devis-style footers */
export const FormButton = ({
  children,
  isLoading,
  type = "submit",
  onClick,
  disabled,
  fullWidth = false,
  className = "",
}) => {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isLoading || disabled}
      className={`
        ${fullWidth ? "w-full" : "inline-flex px-5"}
        h-10 text-sm font-medium rounded-lg text-white
        bg-[#B12B89] hover:bg-[#9A2478]
        transition-colors
        disabled:opacity-50 disabled:cursor-not-allowed
        inline-flex items-center justify-center gap-2
        ${className}
      `}
    >
      {isLoading ? (
        <>
          <CircularProgress size={16} color="inherit" />
          <span>{children}</span>
        </>
      ) : (
        children
      )}
    </button>
  );
};
