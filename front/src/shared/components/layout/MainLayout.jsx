import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";

const COLLAPSED_KEY = "sidebar_collapsed";
const LG = 1024;

export const MainLayout = () => {
  const [isSidebarOpen, setSidebarOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() => window.innerWidth >= LG);
  const [isSidebarCollapsed, setSidebarCollapsed] = useState(
    () => localStorage.getItem(COLLAPSED_KEY) === "true"
  );

  // Auto-close the mobile drawer; track desktop breakpoint
  useEffect(() => {
    const handleResize = () => {
      const desktop = window.innerWidth >= LG;
      setIsDesktop(desktop);
      if (!desktop) setSidebarOpen(false);
    };
    window.addEventListener("resize", handleResize);
    handleResize();
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleToggleCollapse = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSED_KEY, String(next));
      return next;
    });
  };

  // The navbar button collapses the rail on desktop and opens the drawer on mobile
  const handleSidebarToggle = () => {
    if (isDesktop) handleToggleCollapse();
    else setSidebarOpen((prev) => !prev);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        handleSidebarToggle();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isDesktop]);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-slate-50 dark:bg-[#161616]">
      <Header />

      <div className="flex min-h-0 flex-1">
        <Sidebar
          isOpen={isSidebarOpen}
          isCollapsed={isSidebarCollapsed}
          isDesktop={isDesktop}
          onClose={() => setSidebarOpen(false)}
          onOpen={() => setSidebarOpen(true)}
        />

        <main className="flex min-h-0 flex-1 flex-col overflow-hidden pb-[calc(6.25rem+env(safe-area-inset-bottom,0px))] md:pb-0">
          <div
            id="form-actions-slot"
            className="order-2 shrink-0 empty:hidden w-full bg-white dark:bg-[#1c1c1c] border-t border-slate-200 dark:border-[#2e2e2e] px-4 py-3"
          />
          <div
            className="
              order-1 min-h-0 flex-1 overflow-y-auto p-4 lg:p-6
              [&::-webkit-scrollbar]:w-2
              [&::-webkit-scrollbar-track]:bg-transparent
              [&::-webkit-scrollbar-thumb]:bg-gray-300
              dark:[&::-webkit-scrollbar-thumb]:bg-[#3a3a3a]
              [&::-webkit-scrollbar-thumb]:rounded-full
              hover:[&::-webkit-scrollbar-thumb]:bg-[#B12B89]
            "
          >
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
