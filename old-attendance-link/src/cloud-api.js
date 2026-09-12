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
    throw err;
  }
  return data;
}

async function login(apiUrl, email, password) {
  return request(apiUrl, null, "POST", "/auth/login", { email, password });
}

async function me(apiUrl, token) {
  return request(apiUrl, token, "GET", "/auth/me");
}

async function getUsers(apiUrl, token) {
  const data = await request(apiUrl, token, "GET", "/attendance/users");
  return data?.data || [];
}

async function importAttendance(apiUrl, token, payload) {
  return request(apiUrl, token, "POST", "/attendance/import", payload);
}

module.exports = { login, me, getUsers, importAttendance };
