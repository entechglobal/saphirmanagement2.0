// src/features/auth/utils/tokenManager.js

/**
 * Token Manager - Prevents race conditions during token refresh
 * Ensures only one refresh request happens at a time
 */
class TokenManager {
  constructor() {
    this.refreshPromise = null;
    this.failedQueue = [];
  }

  /**
   * Add failed request to queue to retry after token refresh
   */
  
  addToQueue(resolve, reject) {
    this.failedQueue.push({ resolve, reject });
  }

  /**
   * Process all queued requests with new token
   */
  processQueue(error, token = null) {
    this.failedQueue.forEach((promise) => {
      if (error) {
        promise.reject(error);
      } else {
        promise.resolve(token);
      }
    });

    this.failedQueue = [];
  }

  /**
   * Get current refresh promise or create new one
   */
  getRefreshPromise() {
    return this.refreshPromise;
  }

  /**
   * Set active refresh promise
   */
  setRefreshPromise(promise) {
    this.refreshPromise = promise;
  }

  /**
   * Clear refresh promise
   */
  clearRefreshPromise() {
    this.refreshPromise = null;
  }

  /**
   * Check if refresh is in progress
   */
  isRefreshing() {
    return this.refreshPromise !== null;
  }

  /**
   * Reset manager state
   */
  reset() {
    this.refreshPromise = null;
    this.failedQueue = [];
  }
}

export const tokenManager = new TokenManager();