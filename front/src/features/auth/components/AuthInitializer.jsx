// src/features/auth/components/AuthInitializer.jsx
import { useEffect, useState } from "react";
import { useAuthRefresh } from "../hooks/useAuthRefresh";
import useAuthStore from "../store/authStore";
import { LoaderPage } from "../../../shared/components/loadersCollections/LoaderPage";
import { authChannel } from "../utils/authChannel";
import { isAuthenticated } from "../../../shared/utils/permissions";

let appLoadTimerDone = false;
export function AuthInitializer({ children }) {
  const { isInitialized, isLoading } = useAuthRefresh();
  const { updateLastActivity, clearAuth } = useAuthStore();
  const [timeOutReached, setTimeOutReached] = useState(appLoadTimerDone);
  /* ===============================
      MINIMUM LOADER TIMER
  =============================== */
  useEffect(() => {
    if (appLoadTimerDone) return;
    const timer = setTimeout(() => {
      appLoadTimerDone = true;
      setTimeOutReached(true);
    }, 800);
    return () => clearTimeout(timer);
  }, []);


  /* ===============================
     GLOBAL LOGOUT (ALL TABS)
  =============================== */
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === "LOGOUT" && event.data?.source === "auth-internal") {
        clearAuth();
        window.location.href = "/login";
      }
    };

    authChannel.addEventListener("message", handleMessage);

    return () => {
      authChannel.removeEventListener("message", handleMessage);
      // ❌ DO NOT close the channel here
    };
  }, [clearAuth]);
  /* ===============================
       ACTIVITY + INACTIVITY LOGOUT
    =============================== */

  useEffect(() => {
    if (!isInitialized) return;

    // Track user activity
    const events = ["mousedown", "keydown", "scroll", "touchstart"];
    const handleActivity = () => updateLastActivity();
    events.forEach((event) => window.addEventListener(event, handleActivity));

    // Auto-logout after inactivity (default 15 min, configurable via env)
    const INACTIVITY_TIMEOUT = Number(import.meta.env.VITE_SESSION_TIMEOUT_MS ?? 30 * 60 * 1000);
    const interval = setInterval(() => {
      const { status, accessToken, lastActivity } = useAuthStore.getState();
      if (
        isAuthenticated(status, accessToken) &&
        Date.now() - lastActivity > INACTIVITY_TIMEOUT
      ) {
        clearAuth();
        window.location.href = "/login?reason=inactivity";
      }
    }, 60_000);

    return () => {
      events.forEach((event) =>
        window.removeEventListener(event, handleActivity),
      );
      clearInterval(interval);
    };
  }, [isInitialized, updateLastActivity, clearAuth]);

  if (!isInitialized || isLoading || !timeOutReached) {
    return (
      <LoaderPage />
    );
  }

  return children;
}
