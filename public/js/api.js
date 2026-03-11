// ---------------------------------------------------------------------------
// API CONFIG
// ---------------------------------------------------------------------------
const API_BASE = "/api";
const TOKEN_KEY = "ofr_token";

// ---------------------------------------------------------------------------
// TOKEN HELPERS
// ---------------------------------------------------------------------------
export function setToken(token) {
  localStorage.setItem(TOKEN_KEY, token);
}

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

// ---------------------------------------------------------------------------
// CORE API WRAPPER
// ---------------------------------------------------------------------------
export async function api(path, options = {}) {
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {})
  };

  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const res = await fetch(API_BASE + path, {
    ...options,
    headers
  });

  // Try to parse JSON safely
  let data = {};
  try {
    data = await res.json();
  } catch (_) {
    // ignore empty or non-JSON responses
  }

  if (!res.ok) {
    throw data || { error: "Unknown error" };
  }

  return data;
}

// ---------------------------------------------------------------------------
// AUTH HELPERS
// ---------------------------------------------------------------------------
export async function signup(email, password) {
  const data = await api("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });

  setToken(data.token);
  return data;
}

export async function login(email, password) {
  const data = await api("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password })
  });

  setToken(data.token);
  return data;
}
