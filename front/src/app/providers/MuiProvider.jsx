import { useMemo } from "react";
import {
  ThemeProvider as MuiThemeProvider,
  createTheme,
} from "@mui/material/styles";
import CssBaseline from "@mui/material/CssBaseline";
import { useTheme } from "./ThemeProvider";
import { useTranslation } from "react-i18next";
import { CacheProvider } from "@emotion/react";
import createCache from "@emotion/cache";
import { prefixer } from "stylis";
import rtlPlugin from "stylis-plugin-rtl";
import { themes } from "../theme";

export const MuiProvider = ({ children }) => {  
  const { isDark } = useTheme();
  const currentTheme = isDark ? themes.dark : themes.light;
  const { i18n } = useTranslation();
  const isRtl = i18n.language === "ar";

  const cacheRtl = useMemo(
    () =>
      createCache({
        key: isRtl ? "muirtl" : "mui",
        stylisPlugins: isRtl ? [prefixer, rtlPlugin] : [],
      }),
    [isRtl]
  );

  const muiTheme = useMemo(
    () =>
      createTheme({
        direction: isRtl ? "rtl" : "ltr",

        typography: {
          fontFamily: '"DM Sans", system-ui, -apple-system, sans-serif',
        },

        palette: {
          mode: isDark ? "dark" : "light",

          primary: { main: "#B12B89" },

          mainButton: {
            main: "#B12B89",
            contrastText: "#ffffff",
          },
          buttonXLSX: {
            main: "#1993C7",
            contrastText: "#ffffff",
          },
          buttonCSV: {
            main: "#1C955F",
            contrastText: "#ffffff",
          },

          background: {
            default: isDark ? "#161616" : "#f8fafc",
            paper: isDark ? "#1c1c1c" : "#ffffff",
            filter: isDark ? "#1c1c1c" : "#f8fafc",
          },

          divider: isDark ? "#2e2e2e" : "#e2e8f0",

          text: {
            primary: isDark ? "#e5e5e5" : "#0f172a",
            secondary: isDark ? "#a3a3a3" : "#64748b",
          },
        },

        shape: { borderRadius: 8 },

        components: {
          // ── Buttons — flat, tight, sentence case ─────────────────
          MuiButton: {
            defaultProps: { disableElevation: true },
            styleOverrides: {
              root: {
                textTransform: "none",
                fontWeight: 600,
                letterSpacing: 0,
                borderRadius: 8,
                boxShadow: "none",
                "&:hover": { boxShadow: "none" },
              },
              sizeSmall: {
                minHeight: 36,
                paddingInline: 12,
                fontSize: "0.8125rem",
              },
            },
          },

          // ── Table head ───────────────────────────────────────────
          MuiTableHead: {
            styleOverrides: {
              root: {
                "& .MuiTableCell-head": {
                  backgroundColor: isDark ? "#1a1a1a" : "#f8fafc",
                  color: isDark ? "#94a3b8" : "#64748b",
                  fontSize: "0.6875rem",
                  fontWeight: 600,
                  letterSpacing: "0.05em",
                  textTransform: "uppercase",
                  whiteSpace: "nowrap",
                  padding: "9px 14px",
                  borderBottom: `1px solid ${isDark ? "#2e2e2e" : "#e2e8f0"}`,
                },
              },
            },
          },

          // ── Table rows — flat surface, quiet hover ───────────────
          MuiTableRow: {
            styleOverrides: {
              root: {
                "&:hover .MuiTableCell-body": {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.035)"
                    : "rgba(15,23,42,0.025)",
                },
                "&:last-of-type .MuiTableCell-body": {
                  borderBottom: "none",
                },
              },
            },
          },

          // ── Table cells ──────────────────────────────────────────
          MuiTableCell: {
            styleOverrides: {
              root: {
                borderBottom: `1px solid ${isDark ? "#2e2e2e" : "#f1f5f9"}`,
                fontSize: "0.8125rem",
                padding: "11px 14px",
                color: isDark ? "#e5e5e5" : "#0f172a",
              },
            },
          },

          // ── Paper — elevation0 only (table wrapper) ──────────────
          // elevation0 = muiTablePaperProps elevation={0}
          // This avoids affecting Menus, Dialogs, Autocomplete popovers
          MuiPaper: {
            styleOverrides: {
              root: {
                backgroundImage: "none",
              },
              elevation0: {
                border: "none",
                borderRadius: 0,
                boxShadow: "none !important",
                backgroundColor: "transparent",
              },
            },
          },

          // ── Pagination footer ────────────────────────────────────
          MuiTablePagination: {
            styleOverrides: {
              root: {
                backgroundColor: "transparent",
                color: isDark ? "#94a3b8" : "#64748b",
                border: "none",
                fontSize: "0.78rem",
              },
              selectIcon: {
                color: "#64748b",
              },
            },
          },

          // ── Outlined inputs (search bar, filter selects) ─────────
          MuiOutlinedInput: {
            styleOverrides: {
              root: {
                borderRadius: 8,
                backgroundColor: isDark ? "#222222" : "#ffffff",
                "& .MuiOutlinedInput-notchedOutline": {
                  borderColor: isDark ? "#2e2e2e" : "#e2e8f0",
                },
                "&:hover .MuiOutlinedInput-notchedOutline": {
                  borderColor: isDark ? "#3a3a3a" : "#cbd5e1",
                },
                "&.Mui-focused .MuiOutlinedInput-notchedOutline": {
                  borderColor: "#B12B89",
                  borderWidth: 1.5,
                },
                "& input": {
                  color: isDark ? "#e5e5e5" : "#0f172a",
                },
              },
            },
          },

          // ── DateTimePicker outlined input (uses separate Pickers classes) ──
          MuiPickersOutlinedInput: {
            styleOverrides: {
              root: {
                borderRadius: 8,
                backgroundColor: isDark ? "#222222" : "#ffffff",
                height: "40px",
                "& .MuiPickersOutlinedInput-notchedOutline": {
                  borderColor: isDark ? "#2e2e2e" : "#e2e8f0",
                },
                "&:hover .MuiPickersOutlinedInput-notchedOutline": {
                  borderColor: isDark ? "#3a3a3a" : "#cbd5e1",
                },
                "&.Mui-focused .MuiPickersOutlinedInput-notchedOutline": {
                  borderColor: "#B12B89",
                },
              },
            },
          },

          // ── Menu / Dialog / Popover surfaces ─────────────────────
          MuiMenu: {
            styleOverrides: {
              paper: {
                backgroundColor: isDark ? "#1c1c1c" : "#ffffff",
                backgroundImage: "none",
                border: `1px solid ${isDark ? "#2e2e2e" : "#e2e8f0"}`,
              },
            },
          },
          MuiPopover: {
            styleOverrides: {
              paper: {
                backgroundColor: isDark ? "#1c1c1c" : "#ffffff",
                backgroundImage: "none",
                border: `1px solid ${isDark ? "#2e2e2e" : "#e2e8f0"}`,
              },
            },
          },
          MuiDialog: {
            styleOverrides: {
              paper: {
                backgroundColor: isDark ? "#1c1c1c" : "#ffffff",
                backgroundImage: "none",
              },
            },
          },
          MuiAutocomplete: {
            styleOverrides: {
              paper: {
                backgroundColor: isDark ? "#1c1c1c" : "#ffffff",
                backgroundImage: "none",
                border: `1px solid ${isDark ? "#2e2e2e" : "#e2e8f0"}`,
              },
              listbox: {
                backgroundColor: isDark ? "#1c1c1c" : "#ffffff",
              },
            },
          },
          MuiMenuItem: {
            styleOverrides: {
              root: {
                fontSize: "0.875rem",
                "&:hover": {
                  backgroundColor: isDark
                    ? "rgba(255,255,255,0.05)"
                    : "rgba(15,23,42,0.04)",
                },
              },
            },
          },

          // ── Select icon ──────────────────────────────────────────
          MuiSelect: {
            styleOverrides: {
              icon: { color: isDark ? "#a3a3a3" : "#64748b" },
            },
          },
        },
      }),
    [isDark, isRtl]
  );

  return (
    <CacheProvider value={cacheRtl}>
      <MuiThemeProvider theme={muiTheme}>
        <CssBaseline />
        <div dir={isRtl ? "rtl" : "ltr"} style={{ width: "100%" }}>
          {children}
        </div>
      </MuiThemeProvider>
    </CacheProvider>
  );
};