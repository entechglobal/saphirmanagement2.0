/**
 * Normalize & translate unit symbols / names for display.
 * Unknown units are returned as-is (kg → KG).
 */

const SYMBOL_ALIASES = {
  pc: "pc",
  pcs: "pc",
  pce: "pc",
  piece: "pc",
  pièce: "pc",
  pair: "pair",
  paire: "pair",
  box: "box",
  boite: "box",
  boîte: "box",
  kg: "kg",
  g: "g",
  gr: "g",
  l: "l",
  lt: "l",
  litre: "l",
  liters: "l",
  m: "m",
  ml: "ml",
  u: "u",
  unit: "u",
  unité: "u",
  unite: "u",
  carton: "carton",
  cartons: "carton",
  pack: "pack",
  set: "set",
  doz: "dozen",
  dozen: "dozen",
  douzaine: "dozen",
};

/** Fallback when i18n is unavailable (e.g. PDF) — French display labels */
const FALLBACK_FR = {
  pc: "Pièce",
  pair: "Paire",
  box: "Boîte",
  kg: "KG",
  g: "g",
  l: "L",
  ml: "ml",
  m: "m",
  u: "U",
  carton: "Carton",
  pack: "Pack",
  set: "Set",
  dozen: "Douzaine",
};

function resolveKey(value) {
  if (value == null || value === "") return null;
  const raw = String(value).trim();
  const lower = raw.toLowerCase();
  return SYMBOL_ALIASES[lower] || null;
}

/**
 * @param {string|null|undefined} symbolOrName
 * @param {(key: string, options?: object) => string} [t] - i18next `t` from "common"
 * @returns {string}
 */
export function formatUnit(symbolOrName, t) {
  if (symbolOrName == null || symbolOrName === "") return "";
  const raw = String(symbolOrName).trim();
  const key = resolveKey(raw);

  if (key) {
    if (typeof t === "function") {
      const translated = t(`units.${key}`, { defaultValue: "" });
      if (translated) return translated;
    }
    return FALLBACK_FR[key] || raw;
  }

  // Convention: kg-like codes stay uppercase when short
  if (/^[a-z]{1,3}$/i.test(raw)) return raw.toUpperCase();
  return raw;
}

/**
 * Label for unit selects: "Pièce (pc)" style when both name & symbol exist.
 */
export function formatUnitOption(unit, t) {
  if (!unit) return "";
  const name = formatUnit(unit.name || unit.symbol, t);
  const symbol = unit.symbol ? String(unit.symbol).trim() : "";
  if (symbol && name && name.toLowerCase() !== symbol.toLowerCase()) {
    return `${name} (${symbol})`;
  }
  return name || symbol;
}
