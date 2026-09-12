function asErrorMessage(err, fallback = "La requête a échoué") {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  return err.message || err.error || fallback;
}

function isLoginPath(pathname) {
  return String(pathname || "").includes("/auth/login");
}

function isExpiredAuthError(err) {
  if (!err || isLoginPath(err.pathname)) return false;
  if (err.code === "TOKEN_EXPIRED" || err.status === 401) return true;
  const msg = String(err.message || "").toLowerCase();
  return /jwt expired|token expired|invalid token|unauthorized|jwt malformed/.test(msg);
}

async function request(apiUrl, token, method, pathname, body) {
  const base = String(apiUrl || "").replace(/\/+$/, "");
  const url = `${base}${pathname}`;
  const headers = { Accept: "application/json" };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let data = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { message: text };
  }

  if (!res.ok) {
    const message =
      data?.message || data?.error || `HTTP ${res.status} ${res.statusText}`;
    const err = new Error(message);
    err.status = res.status;
    err.data = data;
    err.pathname = pathname;
    if (res.status === 401 && !isLoginPath(pathname)) {
      err.code = "TOKEN_EXPIRED";
    }
    throw err;
  }
  return data;
}

function extractToken(payload) {
  return (
    payload?.token ||
    payload?.accessToken ||
    payload?.data?.token ||
    payload?.data?.accessToken ||
    ""
  );
}

function extractUser(payload) {
  return payload?.user || payload?.data?.user || null;
}

function extractList(payload) {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.users)) return payload.users;
  return [];
}

async function login(apiUrl, email, password) {
  const payload = await request(apiUrl, null, "POST", "/auth/login", {
    email,
    password,
  });
  const token = extractToken(payload);
  const user = extractUser(payload);
  if (!token || !user) {
    throw new Error("Réponse de connexion invalide (token ou utilisateur manquant)");
  }
  return { token, user, raw: payload };
}

async function me(apiUrl, token) {
  return request(apiUrl, token, "GET", "/auth/me");
}

function normalizeUser(row) {
  if (!row) return null;
  const role =
    typeof row.role === "string"
      ? { name: row.role }
      : row.role || { name: row.roleName || "" };
  return {
    id: row.id,
    name: row.name || "",
    email: row.email || "",
    societeId: row.societeId ?? row.societe?.id ?? null,
    active: row.active !== false,
    role,
    societe: row.societe
      ? { id: row.societe.id, raisonSocial: row.societe.raisonSocial || row.societe.name || "" }
      : null,
  };
}

async function getUsersFromAttendance(apiUrl, token, societeId) {
  const qs = societeId ? `?societeId=${encodeURIComponent(societeId)}` : "";
  const data = await request(apiUrl, token, "GET", `/attendance/users${qs}`);
  return extractList(data).map(normalizeUser).filter(Boolean);
}

async function getUsersFromUsersApi(apiUrl, token, societeId) {
  const collected = [];
  let page = 1;
  const limit = 100;
  while (page <= 20) {
    const params = new URLSearchParams({
      active: "true",
      page: String(page),
      limit: String(limit),
    });
    if (societeId) params.set("societeId", String(societeId));
    const data = await request(apiUrl, token, "GET", `/users?${params.toString()}`);
    const rows = extractList(data).map(normalizeUser).filter(Boolean);
    collected.push(...rows);
    const totalPages = data?.pagination?.numberOfPages || data?.pagination?.totalPages || 1;
    if (page >= totalPages || rows.length < limit) break;
    page += 1;
  }
  return collected;
}

async function getUsers(apiUrl, token, societeId) {
  try {
    const users = await getUsersFromAttendance(apiUrl, token, societeId);
    if (users.length) return users;
  } catch (err) {
    if (isExpiredAuthError(err)) throw err;
    try {
      return await getUsersFromUsersApi(apiUrl, token, societeId);
    } catch (fallbackErr) {
      if (isExpiredAuthError(fallbackErr)) throw fallbackErr;
      throw new Error(asErrorMessage(err, "Impossible de charger les utilisateurs SaphirCaisse"));
    }
  }

  try {
    return await getUsersFromUsersApi(apiUrl, token, societeId);
  } catch (err) {
    if (isExpiredAuthError(err)) throw err;
    return [];
  }
}

async function getSocietes(apiUrl, token) {
  const collected = [];
  let page = 1;
  const limit = 100;
  while (page <= 10) {
    const data = await request(
      apiUrl,
      token,
      "GET",
      `/societes?page=${page}&limit=${limit}`,
    );
    const rows = extractList(data).map((row) => ({
      id: row.id,
      name: row.raisonSocial || row.name || `Société ${row.id}`,
    }));
    collected.push(...rows);
    const totalPages = data?.pagination?.numberOfPages || data?.pagination?.totalPages || 1;
    if (page >= totalPages || rows.length < limit) break;
    page += 1;
  }
  return collected;
}

async function importAttendance(apiUrl, token, payload) {
  return request(apiUrl, token, "POST", "/attendance/import", payload);
}

module.exports = {
  login,
  me,
  getUsers,
  getSocietes,
  importAttendance,
  asErrorMessage,
  isExpiredAuthError,
};
