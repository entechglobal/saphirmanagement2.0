export function isSecureCookie() {
  if (process.env.COOKIE_SECURE === "true") return true;
  if (process.env.COOKIE_SECURE === "false") return false;
  return (process.env.BASE_URL || "").startsWith("https://");
}

export function refreshTokenCookieOptions(maxAge) {
  return {
    httpOnly: true,
    secure: isSecureCookie(),
    sameSite: "strict",
    path: "/api/auth/refresh",
    maxAge,
  };
}
