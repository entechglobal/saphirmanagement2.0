"use client";

import React from "react";
import { useState, useRef, useEffect } from "react";
import { useTheme } from "@/app/providers/ThemeProvider";

import { MoonIcon, SunIcon, LanguageIcon } from "@heroicons/react/24/outline";
import { Maximize2, Minimize2, MoreHorizontal } from "lucide-react";

import Usa from "../../../public/lngIcons/usa.png";
import Fr from "../../../public/lngIcons/fr.png";
import Ar from "../../../public/lngIcons/ar.png";

import { useTranslation } from "react-i18next";

import LanguageSelector from "./LanguageSelector";

const languages = [
  { name: "Français", image: Fr, code: "fr" },
  { name: "العربية", image: Ar, code: "ar" },
  { name: "English", image: Usa, code: "en" },
];

export default function ToggleControls() {
  const { isDark, toggleTheme } = useTheme();

  const { i18n } = useTranslation();

  const [showLangMenu, setShowLangMenu] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const langRef = useRef(null);
  const mobileRef = useRef(null);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

    const [selected, setSelected] = useState(() => {
      const saved = localStorage.getItem("i18nextLng");
      return languages.find((l) => l.code === saved) || languages[0];
    });
    useEffect(() => {
      i18n.changeLanguage(selected.code);
      localStorage.setItem("i18nextLng", selected.code);
    }, [selected, i18n]);
  
    const isRTL = selected.code === "ar";
  

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (langRef.current && !langRef.current.contains(event.target))
        setShowLangMenu(false);
      if (mobileRef.current && !mobileRef.current.contains(event.target))
        setShowMobileMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);

    const onFsChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onFsChange);

    // initialize fullscreen state on mount (browser-only)
    if (typeof document !== "undefined")
      setIsFullscreen(!!document.fullscreenElement);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("fullscreenchange", onFsChange);
    };
  }, []);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch (err) {
      // ignore
    }
  };

  return (
    <>
      {/* Desktop / tablet: pill overlay */}
      <div className="hidden sm:flex absolute top-4 right-4 z-40 items-center gap-2 bg-white/60 dark:bg-gray-800/60 backdrop-blur rounded-md p-1.5 shadow-sm">
        <button
          onClick={toggleTheme}
          className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
          title={isDark ? "Light mode" : "Dark mode"}
        >
          {isDark ? (
            <SunIcon className="w-5 h-5 text-yellow-500" />
          ) : (
            <MoonIcon className="w-5 h-5 text-gray-700" />
          )}
        </button>

        <button
          onClick={toggleFullscreen}
          className="p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
          title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
        >
          {isFullscreen ? (
            <Minimize2 className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          ) : (
            <Maximize2 className="w-5 h-5 text-gray-700 dark:text-gray-300" />
          )}
        </button>

         <div >
          <LanguageSelector
            selected={selected}
            setSelected={setSelected}
            languages={languages}
          />
        </div>
      </div>

      {/* Mobile: single menu button that expands */}
      <div className="sm:hidden absolute top-3 right-3 z-40" ref={mobileRef}>
        <button
          onClick={() => setShowMobileMenu((s) => !s)}
          className="p-2 rounded-md bg-white/60 dark:bg-gray-800/60 backdrop-blur hover:bg-white dark:hover:bg-gray-700 transition-colors"
          aria-label="Open controls"
        >
          <MoreHorizontal className="w-5 h-5 text-gray-700 dark:text-gray-300" />
        </button>

        {showMobileMenu && (
          <div className="absolute right-0 mt-2 w-40 bg-white dark:bg-gray-700 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 overflow-visible z-50 p-2">
            <button
              onClick={toggleTheme}
              className="w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
            >
              {isDark ? (
                <SunIcon className="w-4 h-4 text-yellow-500" />
              ) : (
                <MoonIcon className="w-4 h-4 text-gray-700" />
              )}
              <span className="text-sm">{isDark ? "Light" : "Dark"}</span>
            </button>
            <button
              onClick={toggleFullscreen}
              className="w-full flex items-center gap-2 px-2 py-2 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
            >
              {isFullscreen ? (
                <Minimize2 className="w-4 h-4 text-gray-700 dark:text-white" />
              ) : (
                <Maximize2 className="w-4 h-4 text-gray-700 dark:text-white" />
              )}
              <span className="text-sm">
                {isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
              </span>
            </button>
            <div className="mt-1 border-t border-gray-100 dark:border-gray-600 pt-1" >
          <LanguageSelector
            selected={selected}
            setSelected={setSelected}
            languages={languages}
          />
        </div>
          </div>
        )}
      </div>
    </>
  );
}
