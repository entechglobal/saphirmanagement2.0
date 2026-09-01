// src/shared/api/axios.js
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import useAuthStore from "../../features/auth/store/authStore";
import { tokenManager } from "../../features/auth/utils/tokenManager";
import { toast } from "@/shared/utils/toast";
import { getApiBaseUrl } from "./baseUrl";

// Navigation helper: React Router's `useNavigate` cannot be used here directly.
// Components should call `setNavigate(navigate)` once at app startup so
// axios can perform SPA redirects (falls back to window.location.href).
let navigateFn = null;
export const setNavigate = (fn) => {
  navigateFn = fn;
};

const navigateToLogin = () => {
  if (typeof navigateFn === "function") {
    try {
      navigateFn("/login");
      return;
    } catch (e) {
      console.warn("navigateFn threw, falling back to location.assign", e);
    }
  }

  // Fallback to full reload
  window.location.href = "/login";
};

// Create axios instance
export const apiClient = axios.create({
  baseURL: getApiBaseUrl(),
  timeout: 30000,
  withCredentials: true, // CRITICAL: Send cookies with requests
  // headers: {
  //   "Content-Type": "application/json",
  // },
});

/**
 * Request Interceptor - Attach access token to all requests
 */
apiClient.interceptors.request.use(
  async (config) => {
    // Allow certain requests to bypass auth-refresh logic
    if (config.skipAuthRefresh) {
      const { accessToken, updateLastActivity } = useAuthStore.getState();
      if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
      updateLastActivity();
      return config;
    }

    const {
      accessToken,
      updateLastActivity,
      setAccessToken,
      setAuth,
      clearAuth,
      setRefreshing,
    } = useAuthStore.getState();

    updateLastActivity();

    // Attach token if present. We'll also do a proactive refresh if the
    // token will expire within the next 5 minutes.
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;

      try {
        const willExpireSoon = (() => {
          try {
            const { exp } = jwtDecode(accessToken);
            if (!exp) return false;
            return exp * 1000 - Date.now() <= 5 * 60 * 1000;
          } catch {
            return false;
          }
        })();

        if (willExpireSoon) {
          // Attempt to refresh proactively. Reuse refresh flow to avoid races.
          // If another refresh is in progress, await it.
          const existing = tokenManager.getRefreshPromise();
          if (existing) {
            const token = await existing;
            if (token) {
              config.headers.Authorization = `Bearer ${token}`;
            }
            return config;
          }

          // Kick off a refresh and wait for it
          let resolveRefresh, rejectRefresh;
          const refreshPromise = new Promise((res, rej) => {
            resolveRefresh = res;
            rejectRefresh = rej;
          });

          tokenManager.setRefreshPromise(refreshPromise);
          setRefreshing(true, refreshPromise);

          try {
            const { data } = await apiClient.post(
              "/auth/refresh",
              {},
              { skipAuthRefresh: true },
            );

            const newToken = data.token;
            if (newToken) {
              setAccessToken(newToken);
              // If server returned user, update full auth as well
              if (data.user)
                setAuth({ accessToken: newToken, user: data.user });
              resolveRefresh(newToken);
              tokenManager.processQueue(null, newToken);
              config.headers.Authorization = `Bearer ${newToken}`;
            } else {
              throw new Error("No access token returned from refresh");
            }
          } catch (err) {
            rejectRefresh(err);
            tokenManager.processQueue(err, null);
            clearAuth();
            // Optional user-visible notification
            try {
              toast.error("Session expired. Please login again.");
            } catch (e) {
              /* ignore toast errors */
            }
            navigateToLogin();
            return Promise.reject(err);
          } finally {
            tokenManager.clearRefreshPromise();
            setRefreshing(false, null);
          }
        }
      } catch (e) {
        // If parsing fails, ignore proactive refresh and continue; server will
        // still respond with 401 which we handle elsewhere.
        console.debug("Failed to parse token for proactive refresh", e);
      }
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

/**
 * Response Interceptor - Handle 401 errors and token refresh
 */
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // Skip refresh logic for specific endpoints
    if (
      !error.response ||
      originalRequest.skipAuthRefresh ||
      originalRequest.url?.includes("/auth/refresh") ||
      originalRequest.url?.includes("/auth/login")
    ) {
      return Promise.reject(error);
    }

    // Handle 401 Unauthorized
    if (error.response.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      //  STEP 1: Get all store functions FIRST
      const { setRefreshing, setAccessToken, setAuth, clearAuth, setStatus } =
        useAuthStore.getState();

      // STEP 2: Atomic check - if refresh already in progress, queue this request
      const existingRefresh = tokenManager.getRefreshPromise();
      if (existingRefresh) {
        return new Promise((resolve, reject) => {
          tokenManager.addToQueue(
            (token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              resolve(apiClient(originalRequest));
            },
            (err) => reject(err),
          );
        });
      }

      //  STEP 3: Create promise manually to control resolve/reject
      let resolveRefresh, rejectRefresh;
      const refreshPromise = new Promise((resolve, reject) => {
        resolveRefresh = resolve;
        rejectRefresh = reject;
      });

      //  STEP 4: Set refresh promise atomically
      tokenManager.setRefreshPromise(refreshPromise);
      setRefreshing(true, refreshPromise);

      try {
        //  STEP 5: Attempt to refresh token
        const { data } = await apiClient.post(
          "/auth/refresh",
          {},
          {
            skipAuthRefresh: true,
          },
        );

        const newAccessToken = data.token;

        //  STEP 6: Immediately update access token
        setAccessToken(newAccessToken);

        console.debug("[auth] Token refresh succeeded", {
          hasToken: !!newAccessToken,
          userProvided: !!data.user,
        });

        //  STEP 7: Get user data (prefer server response, fallback to profile fetch)
        let user = data.user;
        if (!user) {
          try {
            const profileResponse = await apiClient.get("/auth/profile", {
              skipAuthRefresh: true,
            });
            user = profileResponse.data;
          } catch (profileErr) {
            console.warn(
              "[auth] Failed to fetch user profile after refresh",
              profileErr,
            );
            // Continue without user - we have the token
          }
        }

        //  STEP 8: Update auth state
        if (user) {
          setAuth({ accessToken: newAccessToken, user });
        } else {
          // Fallback: mark as authenticated to avoid logout loops
          setStatus("authenticated");
        }

        //  STEP 9: Resolve the manual promise
        resolveRefresh(newAccessToken);

        //  STEP 10: Process all queued requests with new token
        tokenManager.processQueue(null, newAccessToken);

        //  STEP 11: Retry the original request with new token
        originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        console.error("[auth] Token refresh failed", refreshError);

        //  Reject the manual promise
        rejectRefresh(refreshError);

        //  Fail all queued requests
        tokenManager.processQueue(refreshError, null);

        // Clear auth state
        clearAuth();

        // Notify user (optional) and navigate via React Router when available
        try {
          toast.error("Session expired. Please login again.");
        } catch (e) {
          /* ignore toast errors */
        }

        navigateToLogin();

        // CRITICAL: Cancel the request to prevent it from continuing
        throw new axios.Cancel("Proactive token refresh failed");
      } finally {
        //  STEP 12: Clean up refresh state
        tokenManager.clearRefreshPromise();
        setRefreshing(false, null);
      }
    }

    // Handle other errors (not 401)
    return Promise.reject(error);
  },
);

export default apiClient;
