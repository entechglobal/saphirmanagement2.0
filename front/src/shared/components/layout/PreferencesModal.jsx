import { useState, useCallback, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { motion, AnimatePresence } from "framer-motion";
import { MoonIcon, SunIcon, Cog6ToothIcon } from "@heroicons/react/24/outline";
import { Loader2 } from "lucide-react";
import { useTheme } from "@/app/providers/ThemeProvider";
import { BaseModal } from "../BaseModal";

import Usa from "../../../../public/lngIcons/usa.png";
import Fr from "../../../../public/lngIcons/fr.png";
import Ar from "../../../../public/lngIcons/ar.png";

const languages = [
  { name: "Français", image: Fr, code: "fr" },
  { name: "العربية", image: Ar, code: "ar" },
  { name: "English", image: Usa, code: "en" },
];

const MIN_SWITCH_MS = 480;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export const PreferencesModal = ({ isOpen, onClose }) => {
  const { t, i18n } = useTranslation("header");
  const { isDark, toggleTheme } = useTheme();
  const [selected, setSelected] = useState(() => {
    const saved = localStorage.getItem("i18nextLng");
    return languages.find((l) => l.code === saved) || languages[0];
  });
  const [switching, setSwitching] = useState(null);

  useEffect(() => {
    if (!isOpen) return;
    const current = localStorage.getItem("i18nextLng") || i18n.language;
    setSelected(languages.find((l) => l.code === current) || languages[0]);
  }, [isOpen, i18n.language]);

  const runSwitch = useCallback(async (type, action) => {
    if (switching) return;
    setSwitching(type);
    const start = Date.now();

    try {
      await action();
    } finally {
      const remaining = Math.max(0, MIN_SWITCH_MS - (Date.now() - start));
      await wait(remaining);
      setSwitching(null);
    }
  }, [switching]);

  const handleLanguage = (lang) => {
    if (lang.code === selected.code || switching) return;
    runSwitch("language", async () => {
      await i18n.changeLanguage(lang.code);
      localStorage.setItem("i18nextLng", lang.code);
      setSelected(lang);
    });
  };

  const handleTheme = (targetDark) => {
    if (targetDark === isDark || switching) return;
    runSwitch("theme", async () => {
      toggleTheme();
      await new Promise((resolve) => {
        requestAnimationFrame(() => requestAnimationFrame(resolve));
      });
    });
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      disableClose={!!switching}
      title={t("preferences.title")}
      subtitle={t("preferences.subtitle")}
      icon={<Cog6ToothIcon className="h-5 w-5 text-[#B12B89]" />}
      iconBg="bg-blue-50 dark:bg-blue-900/20"
      maxWidth="max-w-md"
      zIndex="z-[120]"
      bodyClassName="relative flex-1 overflow-y-auto p-6"
    >
      <AnimatePresence>
        {switching && (
          <motion.div
            key="preferences-loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-b-2xl bg-white/75 backdrop-blur-[6px] dark:bg-[#1c1c1c]/75"
          >
            <motion.div
              initial={{ scale: 0.85, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center"
            >
              <Loader2 className="h-7 w-7 animate-spin text-[#B12B89]" />
              <p className="mt-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                {switching === "language"
                  ? t("preferences.switching_language")
                  : t("preferences.switching_theme")}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        animate={{
          opacity: switching ? 0.45 : 1,
          scale: switching ? 0.985 : 1,
          filter: switching ? "blur(1px)" : "blur(0px)",
        }}
        transition={{ duration: 0.22, ease: "easeOut" }}
        className="space-y-6"
      >
        <div>
          <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t("preferences.language")}
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {languages.map((lang) => {
              const isActive = selected.code === lang.code;
              return (
                <motion.button
                  key={lang.code}
                  type="button"
                  disabled={!!switching}
                  onClick={() => handleLanguage(lang)}
                  whileHover={!switching ? { scale: 1.02 } : {}}
                  whileTap={!switching ? { scale: 0.98 } : {}}
                  animate={{
                    borderColor: isActive ? "#B12B89" : undefined,
                    backgroundColor: isActive ? "rgba(15, 131, 239, 0.08)" : undefined,
                  }}
                  transition={{ duration: 0.2 }}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-colors disabled:cursor-not-allowed ${
                    isActive
                      ? "border-[#B12B89] bg-blue-50 ring-1 ring-[#B12B89]/20 dark:bg-blue-900/20"
                      : "border-gray-200 bg-white hover:border-gray-300 dark:border-[#2e2e2e] dark:bg-[#1c1c1c] dark:hover:border-[#3a3a3a]"
                  }`}
                >
                  <img src={lang.image} alt={lang.name} className="h-6 w-6 rounded-full object-cover" />
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{lang.name}</p>
                    <p className="text-xs uppercase text-slate-400">{lang.code}</p>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold text-slate-700 dark:text-slate-200">
            {t("preferences.theme")}
          </p>
          <div className="grid grid-cols-2 gap-2">
            <motion.button
              type="button"
              disabled={!!switching}
              onClick={() => handleTheme(false)}
              whileHover={!switching && isDark ? { scale: 1.02 } : {}}
              whileTap={!switching && isDark ? { scale: 0.98 } : {}}
              animate={{
                borderColor: !isDark ? "#B12B89" : undefined,
              }}
              transition={{ duration: 0.2 }}
              className={`flex items-center gap-3 rounded-xl border px-3 py-3 transition-colors disabled:cursor-not-allowed ${
                !isDark
                  ? "border-[#B12B89] bg-blue-50 ring-1 ring-[#B12B89]/20 dark:bg-blue-900/20"
                  : "border-gray-200 bg-white hover:border-gray-300 dark:border-[#2e2e2e] dark:bg-[#1c1c1c] dark:hover:border-[#3a3a3a]"
              }`}
            >
              <SunIcon className="h-5 w-5 text-yellow-500" />
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {t("preferences.theme_light")}
              </span>
            </motion.button>
            <motion.button
              type="button"
              disabled={!!switching}
              onClick={() => handleTheme(true)}
              whileHover={!switching && !isDark ? { scale: 1.02 } : {}}
              whileTap={!switching && !isDark ? { scale: 0.98 } : {}}
              animate={{
                borderColor: isDark ? "#B12B89" : undefined,
              }}
              transition={{ duration: 0.2 }}
              className={`flex items-center gap-3 rounded-xl border px-3 py-3 transition-colors disabled:cursor-not-allowed ${
                isDark
                  ? "border-[#B12B89] bg-blue-50 ring-1 ring-[#B12B89]/20 dark:bg-blue-900/20"
                  : "border-gray-200 bg-white hover:border-gray-300 dark:border-[#2e2e2e] dark:bg-[#1c1c1c] dark:hover:border-[#3a3a3a]"
              }`}
            >
              <MoonIcon className="h-5 w-5 text-slate-500 dark:text-slate-300" />
              <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                {t("preferences.theme_dark")}
              </span>
            </motion.button>
          </div>
        </div>
      </motion.div>
    </BaseModal>
  );
};
