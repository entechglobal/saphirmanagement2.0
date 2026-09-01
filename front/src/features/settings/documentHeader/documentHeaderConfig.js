/**
 * Invoice-style document templates (keep front/server in sync).
 *
 * layout:
 *   ledger  — classic: company left, title+meta table right, BILL TO bar
 *   strip   — modern: logo/title row, amber meta strip with total block
 *   framed  — teal header + footer bars, meta left / client right
 *   wave    — curved header band, Bill To | From columns
 *   atelier — title+logo top, multi-column parties, accent divider
 */

export const DEFAULT_THEME_ID = "ledger";

const LEGACY_THEME_MAP = {
  saphir: "ledger",
  corporate: "atelier",
  banner: "framed",
  minimal: "strip",
  ocean: "wave",
};

/** @type {Record<string, object>} */
export const DOCUMENT_THEMES = {
  ledger: {
    id: "ledger",
    layout: "ledger",
    tableStyle: "solid",
    primaryColor: "#1e3a5f",
    secondaryColor: "#7eb6d9",
    accentColor: "#0f172a",
    titleColor: "#7eb6d9",
    textColor: "#334155",
    infoBarBg: "#1e3a5f",
    infoBarText: "#ffffff",
    tableHeaderBg: "#1e3a5f",
    tableHeaderText: "#ffffff",
    highlightBg: "#dbeafe",
    dividerColor: "#cbd5e1",
    showLogo: true,
    showIce: true,
    showAddress: true,
    showPhone: true,
  },
  strip: {
    id: "strip",
    layout: "strip",
    tableStyle: "lined",
    primaryColor: "#e8a317",
    secondaryColor: "#2d3436",
    accentColor: "#111827",
    titleColor: "#111827",
    textColor: "#4b5563",
    infoBarBg: "#e8a317",
    infoBarText: "#ffffff",
    tableHeaderBg: "transparent",
    tableHeaderText: "#111827",
    highlightBg: "#2d3436",
    dividerColor: "#e5e7eb",
    showLogo: true,
    showIce: true,
    showAddress: true,
    showPhone: true,
  },
  framed: {
    id: "framed",
    layout: "framed",
    tableStyle: "lined",
    primaryColor: "#1a4a5c",
    secondaryColor: "#c5dce6",
    accentColor: "#0f172a",
    titleColor: "#ffffff",
    textColor: "#475569",
    infoBarBg: "#f1f5f9",
    infoBarText: "#1a4a5c",
    tableHeaderBg: "transparent",
    tableHeaderText: "#0f172a",
    highlightBg: "#dbeafe",
    dividerColor: "#cbd5e1",
    showLogo: true,
    showIce: true,
    showAddress: true,
    showPhone: true,
  },
  wave: {
    id: "wave",
    layout: "wave",
    tableStyle: "solid",
    primaryColor: "#1e40af",
    secondaryColor: "#3b82f6",
    accentColor: "#0f172a",
    titleColor: "#ffffff",
    textColor: "#64748b",
    infoBarBg: "#eff6ff",
    infoBarText: "#1e40af",
    tableHeaderBg: "#1e40af",
    tableHeaderText: "#ffffff",
    highlightBg: "#1e40af",
    dividerColor: "#bfdbfe",
    showLogo: true,
    showIce: true,
    showAddress: true,
    showPhone: true,
  },
  atelier: {
    id: "atelier",
    layout: "atelier",
    tableStyle: "lined",
    primaryColor: "#1e3a5f",
    secondaryColor: "#c45c26",
    accentColor: "#1e3a5f",
    titleColor: "#1e3a5f",
    textColor: "#64748b",
    infoBarBg: "#fff7ed",
    infoBarText: "#c45c26",
    tableHeaderBg: "transparent",
    tableHeaderText: "#1e3a5f",
    highlightBg: "#fff7ed",
    dividerColor: "#c45c26",
    showLogo: true,
    showIce: true,
    showAddress: true,
    showPhone: true,
  },
};

export const DOCUMENT_THEME_IDS = Object.keys(DOCUMENT_THEMES);

export const DEFAULT_DOCUMENT_HEADER_CONFIG = {
  themeId: DEFAULT_THEME_ID,
  ...DOCUMENT_THEMES[DEFAULT_THEME_ID],
};

export function getThemeId(raw) {
  if (!raw || typeof raw !== "object") return DEFAULT_THEME_ID;
  const id = raw.themeId;
  if (DOCUMENT_THEMES[id]) return id;
  if (LEGACY_THEME_MAP[id]) return LEGACY_THEME_MAP[id];
  return DEFAULT_THEME_ID;
}

export function resolveDocumentHeaderConfig(raw) {
  const themeId = getThemeId(raw);
  return { themeId, ...DOCUMENT_THEMES[themeId] };
}

export function sanitizeDocumentHeaderConfig(input) {
  return { themeId: getThemeId(input) };
}
