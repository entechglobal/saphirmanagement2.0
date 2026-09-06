// src/features/auth/hooks/useLogin.js
import { useMutation } from "@/shared/lib/query";
import { useNavigate } from "react-router-dom";
import { authApi } from "../api/auth.api";
import useAuthStore from "../store/authStore";
import { toast } from "@/shared/utils/toast";

export const useLogin = () => {
  const navigate = useNavigate();
  const { setAuth, setStatus } = useAuthStore();

  return useMutation({
    mutationFn: authApi.login,

    onMutate: () => {
      setStatus("loading");
    },

    onSuccess: (data) => {
      // Store auth data in memory
      setAuth({
        accessToken: data.token,
        user: data.user,
      });

       
      toast.success(
        data?.message || "Login successful"
      );

      // Redirect to dashboard or intended page — only allow same-origin relative paths
      const raw = new URLSearchParams(window.location.search).get("redirect") || "/";
      const safeRedirect = raw.startsWith("/") && !raw.startsWith("//") ? raw : "/";
      navigate(safeRedirect, { replace: true });
    },

    onError: () => {
      setStatus("unauthenticated");
  
    },
  });
};
