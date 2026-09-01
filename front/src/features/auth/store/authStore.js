// src/features/auth/store/authStore.js
import { create } from "zustand";
import { devtools } from "zustand/middleware";

const storeFactory = (set) => ({
  // State
  accessToken: null,
  user: null,
  status: "idle", // 'idle' | 'loading' | 'authenticated' | 'unauthenticated'
  isRefreshing: false,
  refreshPromise: null,
  lastActivity: Date.now(),

  // Actions
  setAuth: ({ accessToken, user }) => {
    set({
      accessToken,
      user,
      status: "authenticated",
      lastActivity: Date.now(),
    });
  },

  setAccessToken: (token) => {
    set({ accessToken: token, lastActivity: Date.now() });
  },

  setUser: (user) => {
    set({ user });
  },

  setStatus: (status) => {
    set({ status });
  },

  setRefreshing: (isRefreshing, promise = null) => {
    set({ isRefreshing, refreshPromise: promise });
  },

  updateLastActivity: () => {
    set({ lastActivity: Date.now() });
  },

  clearAuth: () => {
    set({
      accessToken: null,
      user: null,
      status: "unauthenticated",
      isRefreshing: false,
      refreshPromise: null,
      lastActivity: Date.now(),
    });
  },
});

const useAuthStore = create(
  import.meta.env.DEV
    ? devtools(storeFactory, { name: "AuthStore" })
    : storeFactory,
);

export default useAuthStore;

// --- Documentation Snippets ---
// // Tab 1: User logs out
// broadcastLogout();

// // Tab 2, 3, 4: Receive message → Auto logout
// authChannel.postMessage({ type: "LOGOUT" });
// ```

// ---

// ## 🔄 **Complete Login Flow Example**
// ```
// 1. User enters email/password → Click "Login"
// 2. useLogin hook → authApi.login()
// 3. Server validates → Returns { token: "abc", user: {...} }
// 4. authStore.setAuth() → Stores in memory
// 5. Navigate to /dashboard
// 6. ProtectedRoute → Checks isAuthenticated → ✅ Allows access
// 7. apiClient.get('/articles') → Auto-attaches token
// 8. Server returns articles → User sees data
// ```

// ---

// ## 🔄 **Token Refresh Flow Example**
// ```
// 1. User makes request → apiClient.get('/sales')
// 2. Token expired → Server returns 401
// 3. Response interceptor catches error
// 4. tokenManager → "Is refresh in progress?" → No
// 5. Call authApi.refresh() → Uses httpOnly cookie
// 6. Server validates cookie → Returns new token
// 7. Update authStore with new token
// 8. Retry original request with new token
// 9. User gets sales data ✅
// ```

// ---

// ## 🔄 **Page Refresh Flow Example**
// ```
// 1. User refreshes page → Memory wiped
// 2. AuthInitializer runs → useAuthRefresh()
// 3. Call authApi.refresh() → Uses httpOnly cookie
// 4. Server validates → Returns new token + user
// 5. authStore.setAuth() → Restores state
// 6. User stays logged in ✅
