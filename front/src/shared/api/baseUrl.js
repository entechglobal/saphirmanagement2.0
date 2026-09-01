const FALLBACK_API_URL = "http://localhost:3000/api";

/**
 * Use the env API URL on this machine. When the app is opened from a
 * phone/tablet on the LAN, rewrite the hostname so requests hit this PC.
 */
export function getApiBaseUrl() {
  const envUrl = import.meta.env.VITE_API_URL || FALLBACK_API_URL;
  if (typeof window === "undefined") return envUrl;

  const hostname = window.location.hostname;
  if (hostname === "localhost" || hostname === "127.0.0.1") return envUrl;

  try {
    const parsed = new URL(envUrl, window.location.origin);
    parsed.hostname = hostname;
    parsed.protocol = window.location.protocol;
    return parsed.toString().replace(/\/$/, "");
  } catch {
    return `${window.location.protocol}//${hostname}:3000/api`;
  }
}
