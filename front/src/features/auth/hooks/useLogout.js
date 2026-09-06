// src/features/auth/hooks/useLogout.js
import { useMutation, useQueryClient } from "@/shared/lib/query";
import { useNavigate } from "react-router-dom";
import { authApi } from "../api/auth.api";
import useAuthStore from "../store/authStore";
import { tokenManager } from "../utils/tokenManager";
import { broadcastLogout } from "../utils/authChannel";
import { toast } from "@/shared/utils/toast";

export const useLogout = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { clearAuth } = useAuthStore();

  return useMutation({
    mutationFn: authApi.logout,

    onSuccess: (data) => {
      // Clear auth state
      clearAuth();

      // Broadcast logout to other tabs
      broadcastLogout();

      // Reset token manager
      tokenManager.reset();

      // Clear all query cache
      queryClient.clear();

      // Show backend message if provided
      const backendMsg = data?.message || data?.msg;
      if (backendMsg) {
        toast.success(backendMsg);
      } else {
        toast.success("Logged out successfully");
      }

      // Redirect to login
      navigate("/login", { replace: true });
    },

    onError: (error) => {
      // Even if logout request fails, clear client state
      console.error("Logout request failed:", error);

      clearAuth();
      tokenManager.reset();
      queryClient.clear();

      const errMsg =
        error?.response?.data?.message || error?.message || "Logout failed";
      toast.error(errMsg);

      navigate("/login", { replace: true });
    },
  });
};
