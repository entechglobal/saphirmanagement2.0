import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ChevronRight, Search, X } from "lucide-react";
import { useTranslation } from "react-i18next";

/**
 * Phone full-menu sheet — same pages as desktop sidebar, accordion layout.
 */
export const MobileNavSheet = ({
  open,
  onClose,
  sections = [],
  isActivePath,
}) => {
  const { t, i18n } = useTranslation("sidebar");
  const isRTL = (i18n.dir?.() ?? "ltr") === "rtl";
  const shouldReduce = useReducedMotion();
  const [query, setQuery] = useState("");
  const [openGroup, setOpenGroup] = useState(null);

  useEffect(() => {
    if (!open) {
      setQuery("");
      return;
    }
    const active = sections.find((section) =>
      section.items.some((item) => isActivePath?.(item.path))
    );
    if (active?.label) setOpenGroup(active.key);
  }, [open, sections, isActivePath]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sections;
    return sections
      .map((section) => ({
        ...section,
        items: section.items.filter(
          (item) =>
            item.label?.toLowerCase().includes(q) ||
            section.label?.toLowerCase().includes(q)
        ),
      }))
      .filter((section) => section.items.length > 0);
  }, [sections, query]);

  const sheet = (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[60] md:hidden" role="dialog" aria-modal="true">
          <motion.button
            type="button"
            aria-label={t("close")}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="absolute inset-0 bg-black/50"
            onClick={onClose}
          />

          <motion.div
            initial={shouldReduce ? { opacity: 0 } : { y: "100%" }}
            animate={shouldReduce ? { opacity: 1 } : { y: 0 }}
            exit={shouldReduce ? { opacity: 0 } : { y: "100%" }}
            transition={{ type: "spring", stiffness: 420, damping: 38, mass: 0.85 }}
            className="absolute inset-x-0 bottom-0 flex max-h-[min(92vh,720px)] flex-col overflow-hidden rounded-t-2xl border border-slate-200 bg-white shadow-2xl dark:border-[#2e2e2e] dark:bg-[#161616]"
            style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom, 0px))" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex flex-col items-center pt-2.5 pb-1">
              <div className="h-1 w-10 rounded-full bg-slate-300 dark:bg-[#3a3a3a]" />
            </div>

            <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-1">
              <div>
                <h2 className="text-[15px] font-bold text-slate-900 dark:text-slate-50">
                  {t("menu")}
                </h2>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  {t("mainNavigation")}
                </p>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 dark:border-[#2e2e2e] dark:text-slate-300 dark:hover:bg-[#222]"
              >
                <X size={18} strokeWidth={2} />
              </button>
            </div>

            <div className="px-4 pb-3">
              <label className="flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 dark:border-[#2e2e2e] dark:bg-[#1c1c1c]">
                <Search size={16} className="shrink-0 text-slate-400" strokeWidth={2} />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder={t("searchPages", "Rechercher une page…")}
                  className="min-w-0 flex-1 bg-transparent text-[13px] text-slate-800 outline-none placeholder:text-slate-400 dark:text-slate-100"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  >
                    <X size={14} />
                  </button>
                )}
              </label>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
              {filteredSections.length === 0 ? (
                <p className="px-2 py-8 text-center text-sm text-slate-400">
                  {t("noPagesFound", "Aucune page trouvée")}
                </p>
              ) : (
                <div className="space-y-1.5">
                  {filteredSections.map((section) => {
                    if (!section.label) {
                      return (
                        <div key={section.key} className="space-y-0.5">
                          {section.items.map((item) => {
                            const Icon = item.icon;
                            const active = isActivePath?.(item.path);
                            return (
                              <Link
                                key={item.key}
                                to={item.path}
                                onClick={onClose}
                                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 transition-colors ${
                                  active
                                    ? "bg-[#B12B89]/12 font-semibold text-[#B12B89]"
                                    : "text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-[#222]"
                                }`}
                              >
                                <Icon size={18} strokeWidth={1.75} className="shrink-0" />
                                <span className="truncate text-[14px]">{item.label}</span>
                              </Link>
                            );
                          })}
                        </div>
                      );
                    }

                    const GroupIcon = section.icon;
                    const searching = Boolean(query.trim());
                    const isOpen = searching || openGroup === section.key;
                    const hasActiveChild = section.items.some((item) =>
                      isActivePath?.(item.path)
                    );

                    return (
                      <div
                        key={section.key}
                        className="overflow-hidden rounded-xl border border-slate-200/80 dark:border-[#2e2e2e]"
                      >
                        <button
                          type="button"
                          onClick={() =>
                            setOpenGroup((prev) =>
                              prev === section.key ? null : section.key
                            )
                          }
                          className={`flex w-full items-center gap-3 px-3 py-2.5 transition-colors ${
                            hasActiveChild
                              ? "bg-slate-50 dark:bg-[#1c1c1c]"
                              : "bg-white dark:bg-[#161616]"
                          }`}
                        >
                          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-[#222] dark:text-slate-300">
                            <GroupIcon size={16} strokeWidth={1.75} />
                          </span>
                          <span className="flex-1 truncate text-start text-[13px] font-semibold text-slate-800 dark:text-slate-100">
                            {section.label}
                          </span>
                          <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-bold tabular-nums text-slate-500 dark:bg-[#222] dark:text-slate-400">
                            {section.items.length}
                          </span>
                          {!searching && (
                            <ChevronRight
                              size={16}
                              className={`shrink-0 text-slate-400 transition-transform ${
                                isOpen ? "rotate-90" : isRTL ? "rotate-180" : ""
                              }`}
                            />
                          )}
                        </button>

                        <AnimatePresence initial={false}>
                          {isOpen && (
                            <motion.div
                              initial={shouldReduce ? false : { height: 0, opacity: 0 }}
                              animate={{ height: "auto", opacity: 1 }}
                              exit={shouldReduce ? undefined : { height: 0, opacity: 0 }}
                              transition={{ duration: 0.18 }}
                              className="overflow-hidden"
                            >
                              <div className="space-y-0.5 border-t border-slate-100 bg-slate-50/70 px-1.5 py-1.5 dark:border-[#2e2e2e] dark:bg-[#111]/40">
                                {section.items.map((item) => {
                                  const Icon = item.icon;
                                  const active = isActivePath?.(item.path);
                                  return (
                                    <Link
                                      key={item.key}
                                      to={item.path}
                                      onClick={onClose}
                                      className={`flex items-center gap-3 rounded-lg px-2.5 py-2 transition-colors ${
                                        active
                                          ? "bg-white font-semibold text-[#B12B89] shadow-sm dark:bg-[#222]"
                                          : "text-slate-600 hover:bg-white/80 dark:text-slate-300 dark:hover:bg-[#222]/70"
                                      }`}
                                    >
                                      <Icon size={16} strokeWidth={1.75} className="shrink-0" />
                                      <span className="truncate text-[13px]">{item.label}</span>
                                    </Link>
                                  );
                                })}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );

  if (typeof document === "undefined") return null;
  return createPortal(sheet, document.body);
};
