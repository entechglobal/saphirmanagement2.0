// src/features/auth/api/auth.api.js
import { apiClient } from '../../../shared/api/axios';

export const authApi = {
  /**
   * Login user with credentials
   */
  login: async (credentials) => {
    const { data } = await apiClient.post('/auth/login', credentials);
    return data;
  },

  /**
   * Logout user (clears refresh token cookie)
   */
  logout: async () => {
    try {
      const { data } = await apiClient.post('/auth/logout', {}, { skipAuthRefresh: true });
      return data;
    } catch (error) {
      // Continue with client-side logout even if server request fails
      console.error('Logout request failed:', error);
      // Rethrow so the caller can show an error toast if needed
      throw error;
    }
  },

  /**
   * Refresh access token using httpOnly cookie
   * This request automatically sends the refresh token cookie
   */
  refresh: async () => {
    const { data } = await apiClient.post('/auth/refresh', {}, {
      // Skip the auth interceptor for refresh requests
      skipAuthRefresh: true,
    });
    return data;
  },

  /**
   * Get current user profile
   */
  getProfile: async () => {
    const { data } = await apiClient.get('/auth/profile');
    return data;
  },

  /**
   * Verify current session
   */
  verifySession: async () => {
    const { data } = await apiClient.get('/auth/verify');
    return data;
  },
};