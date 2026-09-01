import useAuthStore from "../store/authStore";
import { isAuthenticated } from "../../../shared/utils/permissions";

/**
 * Main auth hook
 */
export const useAuth = () => {
  const { user, status, isRefreshing, accessToken, setAuth, clearAuth } =
    useAuthStore();

  return {
    // State
    user,
    status,
    isRefreshing,
    accessToken,
    isLoading: status === "loading" || status === "idle",
    isAuthenticated: isAuthenticated(status, accessToken),

    // Actions
    setAuth,
    clearAuth,
  };
};
