const API_BASE = "/api";

function setToken(token) {
  localStorage.setItem("ofr_token", token);
}

function getToken() {
  return localStorage.getItem("ofr_token");
}

async function api(path, options = {}) {
  const headers = options.headers || {};
  headers["Content-Type"] = "application/json";

  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(API_BASE + path, { ...options, headers });

  let data = {};
  try {
    data = await res.json();
  } catch (_) {
    // ignore JSON parse errors (empty responses)
  }

  if (!res.ok) throw data;
  return data;
}

async function signup(email, password) {
  const data = await api("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  setToken(data.token);
  return data;
}

async function login(email, password) {
  const data = await api("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });
  setToken(data.token);
  return data;
}
