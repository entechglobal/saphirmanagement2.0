// src/app/i18n/index.js
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import { supportedLangs } from "./supportedLngs";
import { DEFAULT_LANG, RTL_LANGS } from "./config";

// Bundle all locale JSON files at build time — no HTTP requests, no key flash on navigation
const localeModules = import.meta.glob(
  "../../../public/locales/**/*.json",
  { eager: true }
);

const resources = {};
for (const [path, module] of Object.entries(localeModules)) {
  const match = path.match(/\/locales\/([^/]+)\/([^/]+)\.json$/);
  if (!match) continue;
  const [, lang, ns] = match;
  if (!resources[lang]) resources[lang] = {};
  resources[lang][ns] = module.default ?? module;
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: DEFAULT_LANG,
    supportedLngs: supportedLangs.map((lang) => lang.code),
    defaultNS: "common",
    debug: false,
    saveMissing: false,
    returnNull: false,
    returnEmptyString: false,
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["querystring", "localStorage", "navigator"],
      lookupQuerystring: "lng",
      lookupLocalStorage: "i18nextLng",
      caches: ["localStorage"],
    },
    react: {
      useSuspense: false,
    },
  });


// Initialize language and direction
const initializeLanguageAndDirection = () => {
  const savedLanguage = localStorage.getItem("i18nextLng") || DEFAULT_LANG;
  const isRTL = RTL_LANGS.includes(savedLanguage);
  const direction = isRTL ? "rtl" : "ltr";

  document.documentElement.lang = savedLanguage;
  document.documentElement.dir = direction;
  localStorage.setItem("direction", direction);
};

if (typeof window !== "undefined") {
  initializeLanguageAndDirection();
}

// Update direction on language change
i18n.on("languageChanged", (lng) => {
  // Use .startsWith('ar') to catch 'ar', 'ar-SA', 'ar-EG', etc.
  const isRTL = RTL_LANGS.includes(lng) || lng.startsWith("ar");
  const direction = isRTL ? "rtl" : "ltr";

  document.documentElement.lang = lng;
  document.documentElement.dir = direction;

  // // Force a tiny delay to ensure the DOM is ready for the change
  // console.log(`Language changed to: ${lng}, Direction: ${direction}`);
});

export default i18n;
