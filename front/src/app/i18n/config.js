// src/app/i18n/config.js
import { supportedLangs } from "./supportedLngs"

export const DEFAULT_LANG = "fr"
export const RTL_LANGS = supportedLangs.filter(lang => lang.dir === "rtl").map(lang => lang.code)
