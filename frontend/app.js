// -----------------------------
// RentScope - app.js (vanilla JS)
// -----------------------------

// ===== Config =====
const API_BASE = "https://rentscope-backend.onrender.com"; // your Render backend
const ENDPOINTS = {
  signup: "/api/signup",
  login: "/api/login",
  me: "/api/me",
  health: "/api/health",
};

// ===== Tiny DOM helpers =====
const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
const on = (el, evt, fn, opts) => el && el.addEventListener(evt, fn, opts);
const show = (el) => el && (el.hidden = false);
const hide = (el) => el && (el.hidden = true);
const setText = (el, text) => el && (el.textContent = text ?? "");
const setHTML = (el, html) => el && (el.innerHTML = html ?? "");
const byId = (id) => document.getElementById(id);

// ===== Flash / toast =====
function toast(msg, type = "info", timeout = 3500) {
  let bar = byId("toast");
  if (!bar) {
    bar = document.createElement("div");
    bar.id = "toast";
    Object.assign(bar.style, {
      position: "fixed",
      left: "50%",
      transform: "translateX(-50%)",
      bottom: "20px",
      maxWidth: "90vw",
      padding: "10px 14px",
      borderRadius: "8px",
      color: "#fff",
      background: "#333",
      fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, Arial",
      fontSize: "14px",
      boxShadow: "0 6px 20px rgba(0,0,0,0.25)",
      zIndex: 9999,
      opacity: 0,
      transition: "opacity .15s ease",
      pointerEvents: "none",
      textAlign: "center",
    });
    document.body.appendChild(bar);
  }
  const colors = { info: "#333", success: "#16794D", warn: "#9E6B00", error: "#B00020" };
  bar.style.background = colors[type] || colors.info;
  bar.textContent = msg;
  bar.style.opacity = 1;
  window.clearTimeout(bar._t);
  bar._t = window.setTimeout(() => (bar.style.opacity = 0), timeout);
}

// ===== Token helpers =====
function saveToken(t) { localStorage.setItem("token", t); }
function getToken() { return localStorage.getItem("token"); }
function isAuthed() { return !!getToken(); }
function logout() {
  localStorage.removeItem("token");
  // keep profile if you want persistent greeting across sessions; uncomment to clear:
  // localStorage.removeItem("profile");
  location.href = "login.html";
}

// ===== Auth guard for non-public pages =====
function requireAuth() {
  const path = location.pathname;
  const publicPages = ["/", "/index.html", "/login.html", "/signup.html"];
  const isPublic = publicPages.some((p) => path.endsWith(p) || path === p);
  if (!isPublic && !isAuthed()) {
    location.href = "login.html";
  }
}

// ===== Fetch helper (auto-JSON + auth + 401 handling) =====
async function apiFetch(path, { method = "GET", body, headers = {} } = {}) {
  const url = path.startsWith("http") ? path : API_BASE + path;
  const token = getToken();
  const isBlob = body instanceof FormData;

  const res = await fetch(url, {
    method,
    headers: {
      ...(isBlob ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: isBlob ? body : body ? JSON.stringify(body) : undefined,
  });

  // Handle 401 globally
  if (res.status === 401) {
    toast("Session expired. Please log in again.", "warn");
    logout();
    return; // stop further work
  }

  // Try to parse JSON; if fail, return text
  const text = await res.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; } catch (_) { data = { raw: text }; }

  if (!res.ok) {
    const msg = data?.error || data?.message || `Request failed (${res.status})`;
    throw new Error(msg);
  }
  return data;
}

// ===== Utilities =====
function formToJSON(form) {
  const fd = new FormData(form);
  const obj = {};
  for (const [k, v] of fd.entries()) obj[k] = v;
  return obj;
}

// Cache minimal profile client-side (optional)
function cacheProfile(p) { localStorage.setItem("profile", JSON.stringify(p)); }
function getCachedProfile() {
  try { return JSON.parse(localStorage.getItem("profile") || "{}"); }
  catch { return {}; }
}

// ===== Navbar state (show/hide auth links) =====
function initNav() {
  const authedEls = $$(".nav-authed");
  const anonEls = $$(".nav-anon");
  if (isAuthed()) {
    authedEls.forEach(show);
    anonEls.forEach(hide);
  } else {
    authedEls.forEach(hide);
    anonEls.forEach(show);
  }

  // Attach logout
  const logoutBtn = $("#logoutBtn");
  on(logoutBtn, "click", (e) => {
    e.preventDefault();
    logout();
  });
}

// ===== Page initializers =====

// Home (index.html)
async function initIndex() {
  // Optional: ping health
  try {
    await apiFetch(ENDPOINTS.health);
  } catch {
    // If health fails, don't block UI; show a soft warning.
    toast("Backend health check failed. You can still try logging in.", "warn", 3000);
  }

  const greet = byId("greeting");
  if (!greet) return;

  if (isAuthed()) {
    // Prefer cached profile for snappy paint
    const cached = getCachedProfile();
    if (cached?.name) setText(greet, `Welcome back, ${cached.name}!`);

    try {
      const me = await apiFetch(ENDPOINTS.me);
      if (me?.name) {
        setText(greet, `Welcome back, ${me.name}!`);
        cacheProfile(me);
      } else {
        setText(greet, "Welcome back!");
      }
    } catch (err) {
      // If /me fails, keep cached name if any
      if (!cached?.name) setText(greet, "Welcome!");
    }
  } else {
    setText(greet, "Welcome to RentScope!");
  }
}

// Signup (signup.html)
function initSignup() {
  const form = $("#signupForm");
  if (!form) return;

  const submitBtn = $("#signupSubmit");
  const errBox = $("#signupError");

  on(form, "submit", async (e) => {
    e.preventDefault();
    errBox && (errBox.textContent = "");
    submitBtn && (submitBtn.disabled = true);

    try {
      const payload = formToJSON(form);
      // Expecting fields like: { name, email, password }
      const data = await apiFetch(ENDPOINTS.signup, { method: "POST", body: payload });

      const token = data?.token;
      const profile = data?.user || data?.profile || {};
      if (token) saveToken(token);
      if (profile) cacheProfile(profile);

      toast("Account created. You're now logged in.", "success");
      location.href = "index.html";
    } catch (err) {
      if (errBox) errBox.textContent = err.message;
      toast(err.message, "error");
    } finally {
      submitBtn && (submitBtn.disabled = false);
    }
  });
}

// Login (login.html)
function initLogin() {
  const form = $("#loginForm");
  if (!form) return;

  const submitBtn = $("#loginSubmit");
  const errBox = $("#loginError");

  on(form, "submit", async (e) => {
    e.preventDefault();
    errBox && (errBox.textContent = "");
    submitBtn && (submitBtn.disabled = true);

    try {
      const payload = formToJSON(form);
      // Expecting fields: { email, password }
      const data = await apiFetch(ENDPOINTS.login, { method: "POST", body: payload });

      const token = data?.token;
      const profile = data?.user || data?.profile || {};
      if (token) saveToken(token);
      if (profile) cacheProfile(profile);

      toast("Logged in successfully.", "success");
      location.href = "index.html";
    } catch (err) {
      if (errBox) errBox.textContent = err.message;
      toast(err.message, "error");
    } finally {
      submitBtn && (submitBtn.disabled = false);
    }
  });
}

// Profile (profile.html)
async function initProfile() {
  // This page should be gated
  requireAuth();

  const nameEl = byId("profileName");
  const emailEl = byId("profileEmail");
  const idEl = byId("profileId");

  // Paint from cache first (snappy)
  const cached = getCachedProfile();
  if (cached?.name) setText(nameEl, cached.name);
  if (cached?.email) setText(emailEl, cached.email);
  if (cached?._id || cached?.id) setText(idEl, cached._id || cached.id);

  try {
    const me = await apiFetch(ENDPOINTS.me);
    if (me) {
      setText(nameEl, me.name || "");
      setText(emailEl, me.email || "");
      setText(idEl, me._id || me.id || "");
      cacheProfile(me);
    }
  } catch (err) {
    toast("Could not load profile.", "error");
  }
}

// Example: a protected page that lists resources (optional)
// listings.html
async function initListings() {
  // requireAuth plus graceful fallback
  if (!isAuthed()) return; // already redirected by requireAuth() during boot

  const listEl = byId("listings");
  if (!listEl) return;

  // Adjust endpoint if/when you add it to the backend, e.g. /api/listings
  const ENDPOINT_LIST = "/api/listings";

  try {
    const data = await apiFetch(ENDPOINT_LIST);
    if (!Array.isArray(data)) {
      setHTML(listEl, "<p>No data available.</p>");
      return;
    }
    if (!data.length) {
      setHTML(listEl, "<p>No listings yet.</p>");
      return;
    }
    const rows = data
      .map((it) => {
        const name = it.name || it.title || "Untitled";
        const price = it.price != null ? `$${it.price}` : "-";
        const loc = it.location || it.suburb || "";
        return `<li><strong>${name}</strong> — ${price} ${loc ? `• ${loc}` : ""}</li>`;
      })
      .join("");
    setHTML(listEl, `<ul>${rows}</ul>`);
  } catch (err) {
    setHTML(listEl, `<p class="error">Failed to load listings: ${err.message}</p>`);
  }
}

// ===== Boot =====
document.addEventListener("DOMContentLoaded", async () => {
  // Guard non-public pages before doing anything else
  requireAuth();

  // Setup nav visibility and logout
  initNav();

  // Basic route by pathname
  const path = location.pathname;

  try {
    if (path.endsWith("/") || path.endsWith("/index.html") || path.endsWith("index.html")) {
      await initIndex();
    } else if (path.endsWith("signup.html")) {
      initSignup();
    } else if (path.endsWith("login.html")) {
      initLogin();
    } else if (path.endsWith("profile.html")) {
      await initProfile();
    } else if (path.endsWith("listings.html")) {
      await initListings();
    } else {
      // Unknown page: do nothing, but still keep nav state correct
    }
  } catch (err) {
    // Catch any uncaught init errors per page
    console.error(err);
    toast(err.message || "Something went wrong on this page.", "error");
  }
});

// ===== Optional: expose for debugging in console =====
window.__app = {
  apiFetch,
  logout,
  isAuthed,
  getToken,
};