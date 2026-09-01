// src/features/auth/hooks/useAuthRefresh.js
import { useEffect, useState, useRef } from "react";
import { authApi } from "../api/auth.api";
import useAuthStore from "../store/authStore";

/**
 * Hook to handle auth rehydration on app load
 * Attempts to refresh token from httpOnly cookie
 */
export const useAuthRefresh = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const hasRun = useRef(false);
  const { setAuth, setStatus, clearAuth } = useAuthStore();

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    const initAuth = async () => {
      setStatus("loading");

      try {
        const data = await authApi.refresh();

        setAuth({
          accessToken: data.token,
          user: data.user,
        });
      } catch (error) {
        clearAuth();
        setStatus("unauthenticated");
      } finally {
        setIsInitialized(true);
      }
    };

    initAuth();
  }, [setAuth, setStatus, clearAuth]);

  return {
    isInitialized,
    isLoading: !isInitialized,
  };
};
