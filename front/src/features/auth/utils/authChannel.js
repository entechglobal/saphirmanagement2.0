// src/features/auth/utils/authChannel.js
export const authChannel = new BroadcastChannel('auth-channel');

export const broadcastLogout = () => {
  authChannel.postMessage({ type: 'LOGOUT', source: 'auth-internal' });
};
